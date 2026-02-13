import { db } from "../db";
import { auditLogs, type InsertAuditLog, type AuditLog } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Request } from "express";

/**
 * Log an audit event
 */
export async function logAuditEvent(
  userId: string | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  req?: Request,
): Promise<AuditLog> {
  const ipAddress = req ? getClientIp(req) : null;
  const userAgent = req ? req.get("user-agent") : null;

  const [log] = await db
    .insert(auditLogs)
    .values({
      userId,
      action,
      resourceType,
      resourceId,
      details: details || {},
      ipAddress,
      userAgent,
    })
    .returning();

  return log;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100,
  offset: number = 0,
): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string,
  limit: number = 50,
): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.resourceType, resourceType),
        eq(auditLogs.resourceId, resourceId),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/**
 * Get all audit logs (admin only)
 */
export async function getAllAuditLogs(
  limit: number = 100,
  offset: number = 0,
): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get audit logs by action type
 */
export async function getAuditLogsByAction(
  action: string,
  limit: number = 100,
): Promise<AuditLog[]> {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.action, action))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/**
 * Common audit actions
 */
export const AuditActions = {
  // Auth actions
  LOGIN: "login",
  LOGOUT: "logout",
  REGISTER: "register",
  PASSWORD_CHANGE: "password_change",
  
  // Portfolio actions
  CREATE_PORTFOLIO: "create_portfolio",
  UPDATE_PORTFOLIO: "update_portfolio",
  DELETE_PORTFOLIO: "delete_portfolio",
  SHARE_PORTFOLIO: "share_portfolio",
  
  // Trade actions
  EXECUTE_TRADE: "execute_trade",
  CANCEL_TRADE: "cancel_trade",
  
  // API key actions
  CREATE_API_KEY: "create_api_key",
  REVOKE_API_KEY: "revoke_api_key",
  DELETE_API_KEY: "delete_api_key",
  
  // Permission actions
  GRANT_PERMISSION: "grant_permission",
  REVOKE_PERMISSION: "revoke_permission",
  
  // Admin actions
  UPDATE_USER_ROLE: "update_user_role",
  DEACTIVATE_USER: "deactivate_user",
  ACTIVATE_USER: "activate_user",
} as const;
