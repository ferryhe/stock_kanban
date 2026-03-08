import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "../db";
import { users, userProfiles } from "../../shared/schema";
import { hashPassword, comparePassword } from "../auth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  generateToken,
} from "../services/emailService";
import {
  validatePassword,
  validateEmail,
  isDisposableEmail,
  isCommonPassword,
} from "../utils/passwordValidation";
import { logAuditEvent, AuditActions } from "../services/auditLogService";
import { logBackendEvent, LogLevel, LogCategory } from "../services/backendLogService";

function requireDatabase(res: Response) {
  if (!db) {
    res.status(503).json({ error: "Database not available" });
    return null;
  }
  return db;
}

/**
 * POST /api/auth/register
 * Register a new user with email verification
 */
export async function register(req: Request, res: Response) {
  try {
    const database = requireDatabase(res);
    if (!database) return;

    const { email, password, displayName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required" 
      });
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase();

    // Generate unique random username (collision-resistant)
    const username = `user_${Date.now()}_${randomBytes(8).toString('hex')}`;

    // Validate email format
    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ 
        error: "Invalid email format" 
      });
    }

    // Check for disposable email
    if (isDisposableEmail(normalizedEmail)) {
      return res.status(400).json({ 
        error: "Disposable email addresses are not allowed" 
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: "Password requirements not met",
        details: passwordValidation.errors,
      });
    }

    // Check for common passwords
    if (isCommonPassword(password)) {
      return res.status(400).json({ 
        error: "This password is too common. Please choose a more unique password" 
      });
    }

    // Check if email exists
    const existingEmail = await database
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingEmail.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Generate verification token
    const verificationToken = generateToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hours

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await database
      .insert(users)
      .values({
        username,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
        emailVerified: false,
      })
      .returning();

    if (!newUser || newUser.length === 0) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    const user = newUser[0];

    // Create user profile with display name or default random code
    const userDisplayName = displayName && displayName.trim() 
      ? displayName.trim() 
      : `User#${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    await database.insert(userProfiles).values({
      userId: user.id,
      displayName: userDisplayName,
      email: normalizedEmail,
      riskTolerance: "moderate",
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(normalizedEmail, userDisplayName, verificationToken);

    // Log the registration
    await logAuditEvent(
      user.id,
      AuditActions.REGISTER,
      "user",
      user.id,
      { email: normalizedEmail, emailSent: emailResult.success },
      req,
    );
    
    // Log to backend logs
    await logBackendEvent(
      LogLevel.INFO,
      LogCategory.AUTH,
      `New user registered: ${normalizedEmail}`,
      { userId: user.id, emailVerified: false },
      user.id,
      req,
    );

    // For development, include preview URL
    const response: any = {
      message: "User registered successfully. Please check your email to verify your account.",
      user: { id: user.id, email: user.email, displayName: userDisplayName },
      emailSent: emailResult.success,
    };

    if (emailResult.previewUrl) {
      response.emailPreviewUrl = emailResult.previewUrl;
    }

    return res.status(201).json(response);
  } catch (error) {
    console.error("Register error:", error);
    
    // Log registration error
    logBackendEvent(
      LogLevel.ERROR,
      LogCategory.AUTH,
      `Registration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      { error: error instanceof Error ? error.stack : String(error) },
      undefined,
      req,
    ).catch(console.error);
    
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/auth/login
 * Login a user with email or username (for backward compatibility)
 */
export async function login(req: Request, res: Response) {
  try {
    const database = requireDatabase(res);
    if (!database) return;

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Normalize email
    const normalizedIdentifier = email.trim().toLowerCase();
    
    // Check if it's an email or username
    const isEmail = validateEmail(normalizedIdentifier);
    
    let foundUsers;
    if (isEmail) {
      // Login with email
      foundUsers = await database
        .select()
        .from(users)
        .where(eq(users.email, normalizedIdentifier))
        .limit(1);
    } else {
      // Fallback to username for backward compatibility
      foundUsers = await database
        .select()
        .from(users)
        .where(eq(users.username, normalizedIdentifier))
        .limit(1);
    }

    if (foundUsers.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = foundUsers[0];

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    // Check if email is verified (allow login but remind)
    if (!user.emailVerified) {
      // We'll still allow login but include a warning
      console.warn(`User ${user.username} logging in without email verification`);
    }

    // Compare passwords
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session
    req.session.userId = user.id;

    // Get user profile for displayName
    const [profile] = await database
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    // Log the login
    await logAuditEvent(
      user.id,
      AuditActions.LOGIN,
      "user",
      user.id,
      undefined,
      req,
    );
    
    // Log successful login to backend logs
    await logBackendEvent(
      LogLevel.INFO,
      LogCategory.AUTH,
      `User logged in successfully: ${user.email}`,
      { userId: user.id, role: user.role },
      user.id,
      req,
    );

    return res.json({
      message: "Login successful",
      user: { 
        id: user.id, 
        email: user.email,
        displayName: profile?.displayName,
        emailVerified: user.emailVerified,
        role: user.role,
      },
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/auth/logout
 * Logout a user
 */
export function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    return res.json({ message: "Logout successful" });
  });
}

/**
 * GET /api/auth/me
 * Get current user
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const database = requireDatabase(res);
    if (!database) return;

    const foundUsers = await database
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (foundUsers.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }

    const user = foundUsers[0];

    const profiles = await database
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    const profile = profiles.length > 0 ? profiles[0] : null;

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: profile?.displayName,
        username: profile?.displayName || user.email, // Backward-compatible alias
        emailVerified: user.emailVerified,
        role: user.role,
        profile,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/auth/verify-email
 * Verify user's email address
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const database = requireDatabase(res);
    if (!database) return;

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    // Find user with this token
    const foundUsers = await database
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);

    if (foundUsers.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    const user = foundUsers[0];

    // Check if token is expired
    if (user.emailVerificationExpiry && new Date() > user.emailVerificationExpiry) {
      return res.status(400).json({ error: "Verification token has expired" });
    }

    // Mark email as verified
    await database
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      })
      .where(eq(users.id, user.id));

    // Log the verification
    await logAuditEvent(
      user.id,
      AuditActions.EMAIL_VERIFIED,
      "user",
      user.id,
      undefined,
      req,
    );

    return res.json({
      message: "Email verified successfully",
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
export async function resendVerification(req: Request, res: Response) {
  try {
    const database = requireDatabase(res);
    if (!database) return;

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const foundUsers = await database
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (foundUsers.length === 0) {
      // Don't reveal if email exists
      return res.json({ 
        message: "If that email is registered, a verification email has been sent" 
      });
    }

    const user = foundUsers[0];

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate new token
    const verificationToken = generateToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    // Update user
    await database
      .update(users)
      .set({
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      })
      .where(eq(users.id, user.id));

    // Get user profile for displayName
    const [profile] = await database
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    const displayName = profile?.displayName || user.email;

    // Send email
    const emailResult = await sendVerificationEmail(normalizedEmail, displayName, verificationToken);

    const response: any = {
      message: "Verification email sent",
      emailSent: emailResult.success,
    };

    if (emailResult.previewUrl) {
      response.emailPreviewUrl = emailResult.previewUrl;
    }

    return res.json(response);
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const database = requireDatabase(res);
    if (!database) return;

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const foundUsers = await database
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Always return success to prevent email enumeration
    if (foundUsers.length === 0) {
      return res.json({ 
        message: "If that email is registered, a password reset link has been sent" 
      });
    }

    const user = foundUsers[0];

    // Generate reset token
    const resetToken = generateToken();
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1); // 1 hour

    // Update user
    await database
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      })
      .where(eq(users.id, user.id));

    // Send email
    const emailResult = await sendPasswordResetEmail(normalizedEmail, user.username, resetToken);

    // Log the request
    await logAuditEvent(
      user.id,
      AuditActions.PASSWORD_RESET_REQUESTED,
      "user",
      user.id,
      undefined,
      req,
    );

    const response: any = {
      message: "If that email is registered, a password reset link has been sent",
      emailSent: emailResult.success,
    };

    if (emailResult.previewUrl) {
      response.emailPreviewUrl = emailResult.previewUrl;
    }

    return res.json(response);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const database = requireDatabase(res);
    if (!database) return;

    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: "Password requirements not met",
        details: passwordValidation.errors,
      });
    }

    if (isCommonPassword(newPassword)) {
      return res.status(400).json({ 
        error: "This password is too common. Please choose a more unique password" 
      });
    }

    // Find user with this token
    const foundUsers = await database
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);

    if (foundUsers.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const user = foundUsers[0];

    // Check if token is expired
    if (user.passwordResetExpiry && new Date() > user.passwordResetExpiry) {
      return res.status(400).json({ error: "Reset token has expired" });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user
    await database
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      })
      .where(eq(users.id, user.id));

    // Log the reset
    await logAuditEvent(
      user.id,
      AuditActions.PASSWORD_CHANGE,
      "user",
      user.id,
      { resetViaToken: true },
      req,
    );

    return res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
