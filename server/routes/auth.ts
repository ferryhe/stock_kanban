import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
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

    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: "Username, email, and password are required" 
      });
    }

    // Validate username
    if (username.length < 3) {
      return res.status(400).json({ 
        error: "Username must be at least 3 characters" 
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: "Invalid email format" 
      });
    }

    // Check for disposable email
    if (isDisposableEmail(email)) {
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

    // Check if username exists
    const existingUsername = await database
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUsername.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Check if email exists
    const existingEmail = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
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
        email,
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

    // Create user profile
    await database.insert(userProfiles).values({
      userId: user.id,
      displayName: username,
      email: email,
      riskTolerance: "moderate",
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(email, username, verificationToken);

    // Log the registration
    await logAuditEvent(
      user.id,
      AuditActions.REGISTER,
      "user",
      user.id,
      { email, emailSent: emailResult.success },
      req,
    );

    // For development, include preview URL
    const response: any = {
      message: "User registered successfully. Please check your email to verify your account.",
      user: { id: user.id, username: user.username, email: user.email },
      emailSent: emailResult.success,
    };

    if (emailResult.previewUrl) {
      response.emailPreviewUrl = emailResult.previewUrl;
    }

    return res.status(201).json(response);
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/auth/login
 * Login a user
 */
export async function login(req: Request, res: Response) {
  try {
    const database = requireDatabase(res);
    if (!database) return;

    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find user (allow login with username or email)
    const isEmail = validateEmail(username);
    const foundUsers = await database
      .select()
      .from(users)
      .where(isEmail ? eq(users.email, username) : eq(users.username, username))
      .limit(1);

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

    // Log the login
    await logAuditEvent(
      user.id,
      AuditActions.LOGIN,
      "user",
      user.id,
      undefined,
      req,
    );

    return res.json({
      message: "Login successful",
      user: { 
        id: user.id, 
        username: user.username,
        email: user.email,
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
        username: user.username,
        email: user.email,
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
      "email_verified",
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

    // Find user
    const foundUsers = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
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

    // Send email
    const emailResult = await sendVerificationEmail(email, user.username, verificationToken);

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

    // Find user
    const foundUsers = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
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
    const emailResult = await sendPasswordResetEmail(email, user.username, resetToken);

    // Log the request
    await logAuditEvent(
      user.id,
      "password_reset_requested",
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
