import { db } from "../db";
import { backendLogs, type InsertBackendLog, type BackendLog } from "../../shared/schema";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import type { Request } from "express";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Log categories
 */
export enum LogCategory {
  SYSTEM = "system",
  DATABASE = "database",
  API = "api",
  AUTH = "auth",
  SECURITY = "security",
  PERFORMANCE = "performance",
  ERROR = "error",
}

/**
 * Get client IP address from request
 */
function getClientIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || null;
}

/**
 * Log a backend event
 */
export async function logBackendEvent(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: Record<string, unknown>,
  userId?: string | null,
  req?: Request,
): Promise<BackendLog | null> {
  try {
    const ipAddress = getClientIp(req);

    const [log] = await db
      .insert(backendLogs)
      .values({
        level,
        category,
        message,
        details: details || {},
        userId: userId || null,
        ipAddress,
      })
      .returning();

    return log;
  } catch (error) {
    // Don't throw errors in logging to prevent cascading failures
    console.error("Failed to log backend event:", error);
    return null;
  }
}

/**
 * Get backend logs with filtering and pagination
 */
export async function getBackendLogs(options: {
  level?: string;
  category?: string;
  startDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: BackendLog[]; total: number }> {
  const { level, category, startDate, limit = 100, offset = 0 } = options;

  const conditions = [];
  if (level) conditions.push(eq(backendLogs.level, level));
  if (category) conditions.push(eq(backendLogs.category, category));
  if (startDate) conditions.push(gte(backendLogs.createdAt, startDate));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get logs
  const logs = await db
    .select()
    .from(backendLogs)
    .where(whereClause)
    .orderBy(desc(backendLogs.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(backendLogs)
    .where(whereClause);

  return { logs, total: count };
}

/**
 * Clean old backend logs (retention policy)
 */
export async function cleanOldBackendLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const deleted = await db
    .delete(backendLogs)
    .where(sql`${backendLogs.createdAt} < ${cutoffDate}`)
    .returning();

  return deleted.length;
}
