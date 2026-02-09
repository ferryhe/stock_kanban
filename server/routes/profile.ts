import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, isDatabaseEnabled } from "../db";
import { userProfiles } from "../../shared/schema";

/**
 * GET /api/profile
 * Get current user's profile
 */
export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const profiles = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, req.session.userId))
      .limit(1);

    if (profiles.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.json(profiles[0]);
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * PUT /api/profile
 * Update current user's profile
 */
export async function updateProfile(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const {
      displayName,
      email,
      riskTolerance,
      notificationsTradeAlerts,
      notificationsDailyReport,
      notificationsWeeklyReport,
      theme,
    } = req.body;

    // Validation
    if (riskTolerance && !["conservative", "moderate", "aggressive"].includes(riskTolerance)) {
      return res.status(400).json({ error: "Invalid risk tolerance" });
    }

    if (theme && !["light", "dark"].includes(theme)) {
      return res.status(400).json({ error: "Invalid theme" });
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (email !== undefined) updateData.email = email;
    if (riskTolerance !== undefined) updateData.riskTolerance = riskTolerance;
    if (notificationsTradeAlerts !== undefined) updateData.notificationsTradeAlerts = notificationsTradeAlerts;
    if (notificationsDailyReport !== undefined) updateData.notificationsDailyReport = notificationsDailyReport;
    if (notificationsWeeklyReport !== undefined) updateData.notificationsWeeklyReport = notificationsWeeklyReport;
    if (theme !== undefined) updateData.theme = theme;

    const updated = await db
      .update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.userId, req.session.userId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.json({ message: "Profile updated successfully", profile: updated[0] });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
