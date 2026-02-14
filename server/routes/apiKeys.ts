import express from "express";
import { authenticate, requireAuth } from "../middleware/auth";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  getApiKey,
} from "../services/apiKeyService";
import { logAuditEvent, AuditActions } from "../services/auditLogService";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(requireAuth);

/**
 * GET /api/api-keys
 * List all API keys for the current user
 */
router.get("/", async (req, res) => {
  try {
    const keys = await listApiKeys(req.user!.id);
    
    // Don't return the actual key hash
    const sanitizedKeys = keys.map((key) => ({
      id: key.id,
      name: key.name,
      scope: key.scope,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
    }));

    res.json({ keys: sanitizedKeys });
  } catch (error) {
    console.error("Error listing API keys:", error);
    res.status(500).json({ error: "Failed to list API keys" });
  }
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post("/", async (req, res) => {
  try {
    const { name, scope, expiresInDays } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const { key, record } = await createApiKey(
      req.user!.id,
      name,
      scope,
      expiresAt,
    );

    // Log the creation
    await logAuditEvent(
      req.user!.id,
      AuditActions.CREATE_API_KEY,
      "api_key",
      record.id,
      { name, scope },
      req,
    );

    // Return the plaintext key (only time it's visible!)
    res.json({
      message: "API key created successfully. Save this key securely - it won't be shown again!",
      key,
      keyInfo: {
        id: record.id,
        name: record.name,
        scope: record.scope,
        expiresAt: record.expiresAt,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

/**
 * GET /api/api-keys/:keyId
 * Get details of a specific API key
 */
router.get("/:keyId", async (req, res) => {
  try {
    const key = await getApiKey(req.params.keyId, req.user!.id);

    if (!key) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    // Don't return the actual key hash
    res.json({
      id: key.id,
      name: key.name,
      scope: key.scope,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
    });
  } catch (error) {
    console.error("Error getting API key:", error);
    res.status(500).json({ error: "Failed to get API key" });
  }
});

/**
 * PATCH /api/api-keys/:keyId/revoke
 * Revoke an API key (soft delete)
 */
router.patch("/:keyId/revoke", async (req, res) => {
  try {
    const success = await revokeApiKey(req.params.keyId, req.user!.id);

    if (!success) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    // Log the revocation
    await logAuditEvent(
      req.user!.id,
      AuditActions.REVOKE_API_KEY,
      "api_key",
      req.params.keyId,
      undefined,
      req,
    );

    res.json({ message: "API key revoked successfully" });
  } catch (error) {
    console.error("Error revoking API key:", error);
    res.status(500).json({ error: "Failed to revoke API key" });
  }
});

/**
 * DELETE /api/api-keys/:keyId
 * Delete an API key (hard delete)
 */
router.delete("/:keyId", async (req, res) => {
  try {
    const success = await deleteApiKey(req.params.keyId, req.user!.id);

    if (!success) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    // Log the deletion
    await logAuditEvent(
      req.user!.id,
      AuditActions.DELETE_API_KEY,
      "api_key",
      req.params.keyId,
      undefined,
      req,
    );

    res.json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("Error deleting API key:", error);
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

export default router;
