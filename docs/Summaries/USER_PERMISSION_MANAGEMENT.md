# User Permission Management & Multi-Tenant Architecture

## Overview

This document describes the user permission management system, API key authentication, role-based access control (RBAC), and multi-tenant portfolio architecture implemented in the Stock Kanban application.

## Table of Contents

1. [User Roles](#user-roles)
2. [Authentication](#authentication)
3. [API Key Management](#api-key-management)
4. [Portfolio Permissions](#portfolio-permissions)
5. [User Rankings](#user-rankings)
6. [Audit Logs](#audit-logs)
7. [Admin Operations](#admin-operations)

## User Roles

The system supports four hierarchical user roles:

| Role | Level | Description |
|------|-------|-------------|
| `user` | 1 | Standard user with basic permissions |
| `analyst` | 2 | Advanced user with analytics capabilities |
| `admin` | 3 | Administrator with user management capabilities |
| `superadmin` | 4 | Super administrator with full system access |

### Role Hierarchy

Higher roles inherit permissions from lower roles. For example:
- `admin` can do everything `analyst` and `user` can do
- `superadmin` has unrestricted access to all features

### Default Admin Account

**⚠️ SECURITY WARNING**: A default superadmin account is created during database migration:

```
Username: admin
Password: admin123
```

**YOU MUST CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!**

## Authentication

The system supports two authentication methods:

### 1. Session-Based Authentication (Browser)

Standard cookie-based session authentication using `connect-sid`.

**Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "username": "user@example.com",
    "role": "user"
  }
}
```

### 2. API Key Authentication (Programmatic)

For programmatic access, use API keys with Bearer token authentication.

**Making Requests:**
```bash
GET /api/portfolios
Authorization: Bearer sk_live_<your_api_key>
```

## API Key Management

### Create API Key

```bash
POST /api/api-keys
Authorization: Session or Bearer token
Content-Type: application/json

{
  "name": "My API Key",
  "scope": {
    "portfolios": ["*"],
    "permissions": ["read", "write"]
  },
  "expiresInDays": 90
}
```

**Response:**
```json
{
  "message": "API key created successfully. Save this key securely - it won't be shown again!",
  "key": "sk_live_abc123...",
  "keyInfo": {
    "id": "key-uuid",
    "name": "My API Key",
    "scope": { ... },
    "expiresAt": "2026-05-13T00:00:00.000Z",
    "createdAt": "2026-02-13T00:00:00.000Z"
  }
}
```

### List API Keys

```bash
GET /api/api-keys
Authorization: Session or Bearer token
```

**Response:**
```json
{
  "keys": [
    {
      "id": "key-uuid",
      "name": "My API Key",
      "scope": { ... },
      "lastUsedAt": "2026-02-13T10:30:00.000Z",
      "expiresAt": "2026-05-13T00:00:00.000Z",
      "isActive": true,
      "createdAt": "2026-02-13T00:00:00.000Z"
    }
  ]
}
```

### Revoke API Key

```bash
PATCH /api/api-keys/:keyId/revoke
Authorization: Session or Bearer token
```

### Delete API Key

```bash
DELETE /api/api-keys/:keyId
Authorization: Session or Bearer token
```

## Portfolio Permissions

### Portfolio Visibility Levels

| Visibility | Description |
|------------|-------------|
| `private` | Only the owner can see the portfolio |
| `shared` | Specific users can see the portfolio |
| `public` | Anyone can see the portfolio (included in rankings) |

### Permission Levels

| Permission | Description |
|------------|-------------|
| `view` | Can view portfolio details |
| `trade` | Can execute trades in the portfolio |
| `admin` | Full control over the portfolio |

### Database Schema

**portfolios table:**
- `visibility`: `private` | `shared` | `public`

**portfolio_permissions table:**
- Links users to portfolios with specific permission levels
- Owner is automatically granted `admin` permission

## User Rankings

### Calculate Rankings

Rankings are calculated based on portfolio performance metrics.

**Calculate Rankings (Admin Only):**
```bash
POST /api/rankings/calculate
Authorization: Bearer token (admin role required)
Content-Type: application/json

{
  "date": "2026-02-13"
}
```

### Get Leaderboard

```bash
GET /api/rankings?limit=100&date=2026-02-13
```

**Response:**
```json
{
  "rankings": [
    {
      "rank": 1,
      "userId": "user-uuid",
      "username": "top_trader",
      "portfolioId": "portfolio-uuid",
      "totalReturn": 0.25,
      "annualizedReturn": 0.30,
      "sharpeRatio": 2.5,
      "totalValue": "150000.00",
      "percentile": 100.00
    }
  ],
  "date": "2026-02-13",
  "count": 100
}
```

### Get My Rankings

```bash
GET /api/rankings/me?limit=10
Authorization: Bearer token
```

### Get Portfolio Ranking

```bash
GET /api/rankings/portfolio/:portfolioId?date=2026-02-13
Authorization: Bearer token
```

## Audit Logs

All security-sensitive actions are logged in the audit system.

### Logged Actions

- Authentication events (login, logout, register)
- Portfolio operations (create, update, delete, share)
- Trade executions
- API key management
- Permission changes
- Admin actions (role changes, user activation/deactivation)

### Get User Audit Logs (Admin Only)

```bash
GET /api/admin/audit-logs?limit=100&offset=0
Authorization: Bearer token (admin role required)
```

**Response:**
```json
{
  "logs": [
    {
      "id": "log-uuid",
      "userId": "user-uuid",
      "action": "login",
      "resourceType": "user",
      "resourceId": "user-uuid",
      "details": {},
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-02-13T10:30:00.000Z"
    }
  ],
  "count": 100
}
```

## Admin Operations

All admin operations require `admin` or `superadmin` role.

### List All Users

```bash
GET /api/admin/users
Authorization: Bearer token (admin role required)
```

### Get User Details

```bash
GET /api/admin/users/:userId
Authorization: Bearer token (admin role required)
```

### Update User Role (Superadmin Only)

```bash
PATCH /api/admin/users/:userId/role
Authorization: Bearer token (superadmin role required)
Content-Type: application/json

{
  "role": "analyst"
}
```

### Activate/Deactivate User

```bash
PATCH /api/admin/users/:userId/status
Authorization: Bearer token (admin role required)
Content-Type: application/json

{
  "isActive": false
}
```

### Reset User Password (Superadmin Only)

```bash
POST /api/admin/users/:userId/reset-password
Authorization: Bearer token (superadmin role required)
Content-Type: application/json

{
  "newPassword": "newSecurePassword123"
}
```

### Get System Statistics

```bash
GET /api/admin/stats
Authorization: Bearer token (admin role required)
```

**Response:**
```json
{
  "stats": {
    "users": {
      "totalUsers": 150,
      "activeUsers": 142
    }
  }
}
```

## Security Best Practices

1. **API Keys:**
   - Store API keys securely (use environment variables or secrets manager)
   - Rotate API keys regularly
   - Use scoped permissions (limit access to specific portfolios)
   - Set expiration dates on API keys

2. **Passwords:**
   - Change the default admin password immediately
   - Enforce strong password policies
   - Use bcrypt with salt rounds >= 10

3. **Audit Logs:**
   - Review audit logs regularly
   - Monitor for suspicious activity
   - Archive logs for compliance

4. **Role Management:**
   - Follow principle of least privilege
   - Regularly review user roles
   - Don't give admin access unnecessarily

5. **Production Security:**
   - Enable HTTPS/TLS
   - Set `ENABLE_USER_ISOLATION=true` in production
   - Use `ADMIN_SECRET` for sensitive operations
   - Configure rate limiting
   - Use secure session configuration

## Environment Variables

```bash
# User isolation (production mode)
ENABLE_USER_ISOLATION=true

# Admin operations secret
ADMIN_SECRET=your-secret-key-here

# Session secret
SESSION_SECRET=your-session-secret-here

# Database
DATABASE_URL=postgresql://...
```

## Database Migration

To apply the new schema:

```bash
psql $DATABASE_URL -f deploy/sql/003_user_management_and_permissions.sql
```

Or run the migration through your deployment process.

## Multi-Tenant Architecture

### How It Works

1. **User Isolation:**
   - Each user has their own portfolio(s)
   - Users can only see their own portfolios by default

2. **Portfolio Sharing:**
   - Portfolio owners can share with specific users
   - Shared portfolios appear in recipient's portfolio list
   - Permission levels control what recipients can do

3. **Public Portfolios:**
   - `public` portfolios are visible to all users
   - Included in global leaderboards
   - Performance metrics are public

4. **Rankings:**
   - Calculated daily based on portfolio performance
   - Only `public` and `shared` portfolios are ranked
   - Users can see their rank and percentile

## Example: Multi-User Workflow

### User A (Regular User):
1. Creates a portfolio with `visibility: private`
2. Executes trades
3. Performance is tracked internally
4. Not visible to other users

### User B (Regular User):
1. Creates a portfolio with `visibility: public`
2. Executes trades
3. Portfolio appears in global rankings
4. Other users can see performance

### Admin:
1. Can view all users and portfolios
2. Can manage user roles
3. Can trigger ranking calculations
4. Reviews audit logs for security

### Analytics Integration:
1. Create API key with `read` permission
2. Use API key to fetch portfolio data
3. Aggregate metrics across users
4. Generate reports and insights

## Next Steps

1. **Frontend Integration:**
   - Build admin dashboard UI
   - Add API key management interface
   - Add portfolio sharing UI
   - Display user rankings

2. **Advanced Features:**
   - Two-factor authentication
   - OAuth integration
   - Webhook notifications
   - Advanced analytics

3. **Testing:**
   - Unit tests for services
   - Integration tests for API endpoints
   - Security testing
   - Load testing

## Support

For questions or issues, please contact the development team or refer to the main project documentation.
