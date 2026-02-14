import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { apiKeys, type InsertApiKey, type ApiKey } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Generate a secure API key
 * Format: sk_live_<32 random bytes in hex>
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32).toString("hex");
  return `sk_live_${randomBytes}`;
}

/**
 * Hash an API key for secure storage
 */
export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

/**
 * Create a new API key for a user
 * Returns the plaintext key (only time it's visible) and the database record
 */
export async function createApiKey(
  userId: string,
  name: string,
  scope?: {
    portfolios?: string[];
    permissions?: string[];
  },
  expiresAt?: Date,
): Promise<{ key: string; record: ApiKey }> {
  const key = generateApiKey();
  const keyHash = await hashApiKey(key);

  const [record] = await db
    .insert(apiKeys)
    .values({
      userId,
      name,
      keyHash,
      scope: scope || {},
      expiresAt: expiresAt || null,
      isActive: true,
    })
    .returning();

  return { key, record };
}

/**
 * List all API keys for a user (without exposing the actual keys)
 */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));
}

/**
 * Get an API key by ID (for the owner only)
 */
export async function getApiKey(keyId: string, userId: string): Promise<ApiKey | null> {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .limit(1);

  return key || null;
}

/**
 * Revoke an API key (soft delete by setting isActive to false)
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  const result = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning();

  return result.length > 0;
}

/**
 * Delete an API key (hard delete)
 */
export async function deleteApiKey(keyId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning();

  return result.length > 0;
}

/**
 * Update the last used timestamp for an API key
 */
export async function updateApiKeyLastUsed(keyId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyId));
}

/**
 * Verify an API key and return the associated key record if valid
 * Checks if key is active and not expired
 * 
 * TODO: Optimize to avoid O(n) bcrypt comparisons. Consider:
 * 1. Embedding a keyId in the token (e.g., sk_live_<keyId>_<secret>) to query single row
 * 2. Storing a fast non-reversible digest for indexing
 * Current implementation loads all active keys and bcrypt-compares each one,
 * which scales poorly and creates DOS vulnerability with intentionally expensive bcrypt.
 */
export async function authenticateApiKey(keyString: string): Promise<{
  valid: boolean;
  key?: ApiKey;
  userId?: string;
  error?: string;
}> {
  // API keys should start with sk_live_
  if (!keyString.startsWith("sk_live_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  // Get all active keys (we need to check hashes)
  const allKeys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.isActive, true));

  // Check each key's hash
  for (const key of allKeys) {
    const matches = await verifyApiKey(keyString, key.keyHash);
    
    if (matches) {
      // Check if expired
      if (key.expiresAt && new Date() > key.expiresAt) {
        return { valid: false, error: "API key has expired" };
      }

      // Update last used timestamp asynchronously
      updateApiKeyLastUsed(key.id).catch(console.error);

      return {
        valid: true,
        key,
        userId: key.userId,
      };
    }
  }

  return { valid: false, error: "Invalid API key" };
}
