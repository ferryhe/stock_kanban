# Implementation Guide - User Permission Management

## Quick Start

### 1. Apply Database Migration

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL -f deploy/sql/003_user_management_and_permissions.sql
```

This will:
- Create user role enum (user, analyst, admin, superadmin)
- Add role and is_active fields to users table
- Create api_keys table
- Create portfolio_permissions table
- Create user_rankings table
- Create audit_logs table
- Add visibility field to portfolios
- Create default admin account (username: admin, password: admin123)

**⚠️ IMPORTANT:** Change the default admin password immediately!

### 2. Update Environment Variables

Add to your `.env` file:

```bash
# Enable user isolation in production
ENABLE_USER_ISOLATION=true

# Secret for admin-only operations
ADMIN_SECRET=your-strong-random-secret

# Session secret
SESSION_SECRET=your-session-secret
```

### 3. Test the APIs

#### Test Authentication

```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Get current user
curl -X GET http://localhost:5000/api/auth/me \
  -H "Cookie: connect.sid=<session-cookie>"
```

#### Test API Key Creation

```bash
# Create API key (requires authentication)
curl -X POST http://localhost:5000/api/api-keys \
  -H "Cookie: connect.sid=<session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key",
    "scope": {
      "portfolios": ["*"],
      "permissions": ["read", "write"]
    },
    "expiresInDays": 90
  }'

# Save the returned key (you'll only see it once!)
# Use it to make authenticated requests:
curl -X GET http://localhost:5000/api/portfolios \
  -H "Authorization: Bearer sk_live_<your-key>"
```

#### Test User Rankings

```bash
# Calculate rankings (admin only)
curl -X POST http://localhost:5000/api/rankings/calculate \
  -H "Cookie: connect.sid=<admin-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-02-13"}'

# Get leaderboard
curl -X GET "http://localhost:5000/api/rankings?limit=10"

# Get my rankings
curl -X GET http://localhost:5000/api/rankings/me \
  -H "Cookie: connect.sid=<session-cookie>"
```

#### Test Admin Operations

```bash
# List all users (admin only)
curl -X GET http://localhost:5000/api/admin/users \
  -H "Cookie: connect.sid=<admin-session-cookie>"

# Update user role (superadmin only)
curl -X PATCH http://localhost:5000/api/admin/users/<user-id>/role \
  -H "Cookie: connect.sid=<admin-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"role": "analyst"}'

# Get audit logs (admin only)
curl -X GET "http://localhost:5000/api/admin/audit-logs?limit=50" \
  -H "Cookie: connect.sid=<admin-session-cookie>"
```

### 4. Integration Steps

#### Update Existing Portfolio Routes

The portfolio routes should now check permissions. Update your portfolio service to:

1. Check if user owns portfolio OR has permission
2. Enforce visibility rules
3. Log audit events for sensitive operations

Example:

```typescript
// In server/routes/portfolios.ts
import { isOwnerOrAdmin } from "../middleware/auth";
import { logAuditEvent, AuditActions } from "../services/auditLogService";

// Get portfolio details with permission check
router.get("/:portfolioId", authenticate, requireAuth, async (req, res) => {
  const portfolio = await getPortfolioById(req.params.portfolioId);
  
  if (!portfolio) {
    return res.status(404).json({ error: "Portfolio not found" });
  }

  // Check if user has access
  const hasAccess = 
    isOwnerOrAdmin(req.user!.id, portfolio.userId, req.user!.role) ||
    portfolio.visibility === "public" ||
    await hasPortfolioPermission(req.user!.id, portfolio.id);

  if (!hasAccess) {
    return res.status(403).json({ error: "Access denied" });
  }

  res.json(portfolio);
});
```

#### Add Portfolio Sharing Endpoints

```typescript
// POST /api/portfolios/:portfolioId/share
router.post("/:portfolioId/share", authenticate, requireAuth, async (req, res) => {
  const { userId, permission } = req.body;
  
  // Verify owner
  const portfolio = await getPortfolioById(req.params.portfolioId);
  if (portfolio.userId !== req.user!.id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Only owner can share portfolio" });
  }

  // Grant permission
  await db.insert(portfolioPermissions).values({
    portfolioId: req.params.portfolioId,
    userId,
    permission,
    grantedBy: req.user!.id,
  });

  // Log audit event
  await logAuditEvent(
    req.user!.id,
    AuditActions.GRANT_PERMISSION,
    "portfolio",
    req.params.portfolioId,
    { sharedWith: userId, permission },
    req,
  );

  res.json({ message: "Portfolio shared successfully" });
});
```

### 5. Scheduled Jobs

Set up scheduled jobs for:

#### Daily Ranking Calculation

```typescript
// Add to your cron jobs or scheduler
import cron from "node-cron";
import { calculateUserRankings } from "./services/userRankingService";

// Run daily at 2 AM
cron.schedule("0 2 * * *", async () => {
  try {
    console.log("Calculating user rankings...");
    const today = new Date();
    await calculateUserRankings(today);
    console.log("Rankings calculated successfully");
  } catch (error) {
    console.error("Error calculating rankings:", error);
  }
});
```

#### API Key Cleanup

```typescript
// Clean up expired API keys
cron.schedule("0 3 * * *", async () => {
  try {
    console.log("Cleaning up expired API keys...");
    await db
      .update(apiKeys)
      .set({ isActive: false })
      .where(and(
        eq(apiKeys.isActive, true),
        sql`${apiKeys.expiresAt} < now()`
      ));
    console.log("Expired API keys cleaned up");
  } catch (error) {
    console.error("Error cleaning up API keys:", error);
  }
});
```

### 6. Frontend Integration

Update your frontend to:

1. **Show user role in UI:**
```tsx
// In your user profile component
{user.role === 'admin' && (
  <Link to="/admin">Admin Panel</Link>
)}
```

2. **API Key Management Page:**
```tsx
// Create a new component for API key management
<ApiKeyManager userId={user.id} />
```

3. **Portfolio Visibility Settings:**
```tsx
// In portfolio creation/edit form
<select name="visibility">
  <option value="private">Private (Only me)</option>
  <option value="shared">Shared (Specific users)</option>
  <option value="public">Public (Everyone)</option>
</select>
```

4. **Leaderboard Component:**
```tsx
// Display user rankings
<Leaderboard rankings={rankings} currentUserId={user.id} />
```

### 7. Testing Checklist

- [ ] Database migration applied successfully
- [ ] Default admin account accessible
- [ ] Session authentication works
- [ ] API key authentication works
- [ ] API key creation/revocation works
- [ ] User role enforcement works
- [ ] Portfolio visibility rules enforced
- [ ] Rankings calculation works
- [ ] Audit logs are being created
- [ ] Admin operations restricted properly

### 8. Security Checklist

- [ ] Changed default admin password
- [ ] Set ENABLE_USER_ISOLATION=true in production
- [ ] Set strong ADMIN_SECRET
- [ ] API keys are hashed, not stored in plaintext
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured
- [ ] Audit logs being monitored

### 9. Monitoring

Set up monitoring for:

- Failed login attempts
- API key usage patterns
- Unauthorized access attempts
- Unusual trading activity
- Admin operations

### 10. Documentation

Update your API documentation with:

- New authentication methods
- Role requirements for each endpoint
- API key management endpoints
- User ranking endpoints
- Admin endpoints

## Common Issues

### Issue: API key not working

**Solution:** Check that:
1. Key starts with `sk_live_`
2. Key hasn't expired
3. Key is active
4. Authorization header is formatted correctly: `Bearer <key>`

### Issue: User can't access their own portfolio

**Solution:** Check:
1. User is authenticated
2. Portfolio userId matches session userId
3. Database migration was applied correctly

### Issue: Rankings not updating

**Solution:**
1. Ensure portfolios have `visibility: public` or `shared`
2. Check that strategy_performance table has recent data
3. Verify cron job is running
4. Manually trigger calculation via API

## Next Steps

1. Build frontend components
2. Add more admin tools
3. Implement portfolio sharing UI
4. Add analytics dashboard
5. Set up monitoring and alerts

## Support

For questions or issues, refer to:
- `/docs/USER_PERMISSION_MANAGEMENT.md` - Full API documentation
- `/docs/USER_PERMISSION_MANAGEMENT_ZH.md` - Chinese documentation
- GitHub issues

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  User Dashboard  │  Admin Panel  │  Leaderboard      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Session Auth  │  API Key Auth  │  Rate Limiting     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth Service  │  Portfolio Service  │  Ranking Srv  │  │
│  │  API Key Srv   │  Audit Log Service  │  Admin Srv    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL  │  Redis Cache  │  Message Queue       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```
