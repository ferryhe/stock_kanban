import express from "express";
import { authenticate, requireAuth, requireAdmin, requireSuperAdmin } from "../middleware/auth";
import { db } from "../db";
import { users, userProfiles } from "../../shared/schema";
import { eq, sql, or, ilike } from "drizzle-orm";
import { logAuditEvent, AuditActions, getAllAuditLogs } from "../services/auditLogService";
import { getBackendLogs } from "../services/backendLogService";
import { hashPassword } from "../auth";
import { validatePassword, isCommonPassword } from "../utils/passwordValidation";

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * List all users with pagination and search (admin only)
 */
router.get("/users", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    let query = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        displayName: userProfiles.displayName,
        profileEmail: userProfiles.email,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId));

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        or(
          ilike(users.email, searchTerm),
          ilike(users.username, searchTerm),
          ilike(userProfiles.displayName, searchTerm)
        )
      ) as any;
    }

    const allUsers = await query.limit(limit).offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    res.json({ users: allUsers, count: allUsers.length, total: count });
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: "Failed to list users" });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information (admin only)
 */
router.get("/users/:userId", async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        displayName: userProfiles.displayName,
        email: userProfiles.email,
        riskTolerance: userProfiles.riskTolerance,
        theme: userProfiles.theme,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, req.params.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

/**
 * PATCH /api/admin/users/:userId/role
 * Update user role (superadmin only)
 */
router.patch("/users/:userId/role", requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    if (!role || !["user", "analyst", "admin", "superadmin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    // Prevent changing own role
    if (userId === req.user!.id) {
      res.status(400).json({ error: "Cannot change your own role" });
      return;
    }

    // Get current user to record old role
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const oldRole = currentUser.role;

    // Update the role
    const [updated] = await db
      .update(users)
      .set({ role: role as any })
      .where(eq(users.id, userId))
      .returning();

    // Log the role change
    await logAuditEvent(
      req.user!.id,
      AuditActions.UPDATE_USER_ROLE,
      "user",
      userId,
      { newRole: role, oldRole },
      req,
    );

    res.json({ 
      message: "User role updated successfully",
      user: {
        id: updated.id,
        username: updated.username,
        role: updated.role,
      },
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

/**
 * PATCH /api/admin/users/:userId/status
 * Activate or deactivate a user (admin only)
 */
router.patch("/users/:userId/status", async (req, res) => {
  try {
    const { isActive } = req.body;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    if (typeof isActive !== "boolean") {
      res.status(400).json({ error: "isActive must be a boolean" });
      return;
    }

    // Prevent deactivating own account
    if (userId === req.user!.id) {
      res.status(400).json({ error: "Cannot change your own status" });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({ isActive })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Log the status change
    await logAuditEvent(
      req.user!.id,
      isActive ? AuditActions.ACTIVATE_USER : AuditActions.DEACTIVATE_USER,
      "user",
      userId,
      { isActive },
      req,
    );

    res.json({ 
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: updated.id,
        username: updated.username,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

/**
 * POST /api/admin/users/:userId/reset-password
 * Reset a user's password (superadmin only)
 */
router.post("/users/:userId/reset-password", requireSuperAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    if (!newPassword || typeof newPassword !== "string") {
      res.status(400).json({ error: "New password is required" });
      return;
    }

    // Validate password strength (same as registration)
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      res.status(400).json({ 
        error: "Password requirements not met",
        details: passwordValidation.errors,
      });
      return;
    }

    // Check for common passwords
    if (isCommonPassword(newPassword)) {
      res.status(400).json({ 
        error: "This password is too common. Please choose a more unique password" 
      });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);

    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Log the password reset (don't include the password!)
    await logAuditEvent(
      req.user!.id,
      AuditActions.PASSWORD_CHANGE,
      "user",
      userId,
      { resetByAdmin: true },
      req,
    );

    res.json({ 
      message: "Password reset successfully",
      username: updated.username,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

/**
 * GET /api/admin/audit-logs
 * Get audit logs (admin only)
 */
router.get("/audit-logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await getAllAuditLogs(limit, offset);

    res.json({ logs, count: logs.length });
  } catch (error) {
    console.error("Error getting audit logs:", error);
    res.status(500).json({ error: "Failed to get audit logs" });
  }
});

/**
 * GET /api/admin/stats
 * Get system statistics (admin only)
 */
router.get("/stats", async (req, res) => {
  try {
    const [userStats] = await db
      .select({
        totalUsers: sql<number>`count(*)`,
        activeUsers: sql<number>`count(*) filter (where ${users.isActive} = true)`,
      })
      .from(users);

    res.json({ 
      stats: {
        users: userStats,
      },
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

/**
 * GET /api/admin/backend-logs
 * Get backend/system logs (admin only)
 */
router.get("/backend-logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const level = req.query.level as string;
    const category = req.query.category as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;

    const { logs, total } = await getBackendLogs({
      level,
      category,
      startDate,
      limit,
      offset,
    });

    res.json({ logs, count: logs.length, total });
  } catch (error) {
    console.error("Error getting backend logs:", error);
    res.status(500).json({ error: "Failed to get backend logs" });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user (superadmin only)
 */
router.delete("/users/:userId", requireSuperAdmin, async (req, res) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    // Prevent deleting own account
    if (userId === req.user!.id) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    // Delete user (cascades to user_profiles due to foreign key)
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Log the deletion
    await logAuditEvent(
      req.user!.id,
      "DELETE_USER",
      "user",
      userId,
      { deletedUsername: deleted.username },
      req,
    );

    res.json({ 
      message: "User deleted successfully",
      deletedUser: {
        id: deleted.id,
        email: deleted.email,
      },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
