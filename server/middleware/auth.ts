import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { authenticateApiKey } from "../services/apiKeyService";

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: "user" | "analyst" | "admin" | "superadmin";
        isActive: boolean;
      };
      authMethod?: "session" | "api_key";
      apiKeyId?: string;
    }
  }
}

/**
 * Middleware to authenticate via session OR API key
 * Sets req.user if authenticated
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // First try session authentication
    if (req.session?.userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          username: user.username,
          role: user.role as any,
          isActive: user.isActive,
        };
        req.authMethod = "session";
        return next();
      }
    }

    // Try API key authentication
    const authHeader = req.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const apiKey = authHeader.substring(7);
      const result = await authenticateApiKey(apiKey);

      if (result.valid && result.userId) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, result.userId))
          .limit(1);

        if (user && user.isActive) {
          req.user = {
            id: user.id,
            username: user.username,
            role: user.role as any,
            isActive: user.isActive,
          };
          req.authMethod = "api_key";
          req.apiKeyId = result.key?.id;
          return next();
        }
      }
    }

    // Not authenticated
    res.status(401).json({ error: "Authentication required" });
    return;
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
    return;
  }
}

/**
 * Middleware to require authentication (401 if not authenticated)
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/**
 * Middleware to require specific role(s)
 * Role hierarchy: superadmin > admin > analyst > user
 */
export function requireRole(...allowedRoles: Array<"user" | "analyst" | "admin" | "superadmin">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const roleHierarchy = {
      user: 1,
      analyst: 2,
      admin: 3,
      superadmin: 4,
    };

    const userRoleLevel = roleHierarchy[req.user.role];
    const minRequiredLevel = Math.min(...allowedRoles.map((r) => roleHierarchy[r]));

    if (userRoleLevel < minRequiredLevel) {
      res.status(403).json({ 
        error: "Insufficient permissions",
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user is admin or superadmin
 */
export const requireAdmin = requireRole("admin", "superadmin");

/**
 * Middleware to check if user is superadmin
 */
export const requireSuperAdmin = requireRole("superadmin");

/**
 * Check if a user has a specific role level or higher
 */
export function hasRole(
  userRole: string,
  requiredRole: "user" | "analyst" | "admin" | "superadmin",
): boolean {
  const roleHierarchy = {
    user: 1,
    analyst: 2,
    admin: 3,
    superadmin: 4,
  };

  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
}

/**
 * Check if user is the owner of a resource OR has admin privileges
 */
export function isOwnerOrAdmin(userId: string, resourceOwnerId: string, userRole: string): boolean {
  return userId === resourceOwnerId || hasRole(userRole, "admin");
}
