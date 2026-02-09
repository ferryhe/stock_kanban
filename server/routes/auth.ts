import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, isDatabaseEnabled } from "../db";
import { users, userProfiles } from "../../shared/schema";
import { hashPassword, comparePassword } from "../auth";

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function register(req: Request, res: Response) {
  try {
    if (!isDatabaseEnabled) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
      })
      .returning();

    if (!newUser || newUser.length === 0) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    const user = newUser[0];

    // Create user profile
    await db.insert(userProfiles).values({
      userId: user.id,
      displayName: username,
      riskTolerance: "moderate",
    });

    // Set session
    req.session.userId = user.id;

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user.id, username: user.username },
    });
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
    if (!isDatabaseEnabled) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find user
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (foundUsers.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = foundUsers[0];

    // Compare passwords
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Set session
    req.session.userId = user.id;

    return res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username },
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

    if (!isDatabaseEnabled) {
      return res.status(503).json({ error: "Database not available" });
    }

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (foundUsers.length === 0) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "User not found" });
    }

    const user = foundUsers[0];

    const profiles = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    const profile = profiles.length > 0 ? profiles[0] : null;

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        profile,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
