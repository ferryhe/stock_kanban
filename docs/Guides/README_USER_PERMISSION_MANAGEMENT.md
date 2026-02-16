# User Permission Management & Multi-Tenant Architecture

## 概述 (Overview)

本次实现为股票看板应用添加了完整的用户权限管理系统和多租户架构支持。

This implementation adds a complete user permission management system and multi-tenant architecture to the Stock Kanban application.

## 🎯 核心功能 (Core Features)

### 1. 四级用户角色系统 (4-Level User Role System)
- **user** (普通用户) - 基础权限
- **analyst** (分析师) - 高级分析权限  
- **admin** (管理员) - 用户管理权限
- **superadmin** (超级管理员) - 完整系统权限

### 2. API 密钥系统 (API Key System)
- 格式：`sk_live_<64位随机字符串>`
- 支持作用域控制和权限限制
- 可设置过期时间
- 用于程序化访问和远程控制

### 3. 投资组合可见性控制 (Portfolio Visibility Control)
- **private** (私有) - 只有所有者可见
- **shared** (共享) - 指定用户可见
- **public** (公开) - 所有人可见，参与排名

### 4. 用户排名系统 (User Ranking System)
- 基于投资组合性能自动计算排名
- 支持多维度排名（收益率、夏普比率等）
- 每个用户可查看自己的排名和百分位

### 5. 审计日志 (Audit Logs)
- 记录所有安全敏感操作
- 包括认证、交易、权限变更等
- 支持合规性审计

## 📁 新增文件 (New Files)

### 数据库 (Database)
- `deploy/sql/003_user_management_and_permissions.sql` - 数据库迁移脚本

### 服务层 (Services)
- `server/services/apiKeyService.ts` - API 密钥管理服务
- `server/services/userRankingService.ts` - 用户排名服务
- `server/services/auditLogService.ts` - 审计日志服务

### 中间件 (Middleware)
- `server/middleware/auth.ts` - 认证和授权中间件

### API 路由 (API Routes)
- `server/routes/apiKeys.ts` - API 密钥管理端点
- `server/routes/rankings.ts` - 用户排名端点
- `server/routes/admin.ts` - 管理员操作端点

### 文档 (Documentation)
- `docs/USER_PERMISSION_MANAGEMENT.md` - 完整 API 文档（英文）
- `docs/USER_PERMISSION_MANAGEMENT_ZH.md` - 设计文档（中文）
- `docs/IMPLEMENTATION_GUIDE.md` - 实施指南

## 🚀 快速开始 (Quick Start)

### 1. 应用数据库迁移 (Apply Database Migration)

```bash
psql $DATABASE_URL -f deploy/sql/003_user_management_and_permissions.sql
```

### 2. 配置环境变量 (Configure Environment)

```bash
# .env
ENABLE_USER_ISOLATION=true
ADMIN_SECRET=your-strong-secret
SESSION_SECRET=your-session-secret
```

### 3. 登录默认管理员账户 (Login as Default Admin)

⚠️ **重要 (IMPORTANT)**: 立即更改默认密码！

```
用户名 (Username): admin
密码 (Password): admin123
```

### 4. 测试 API (Test APIs)

```bash
# 登录 (Login)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 创建 API 密钥 (Create API Key)
curl -X POST http://localhost:5000/api/api-keys \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "expiresInDays": 90}'

# 查看排行榜 (View Leaderboard)
curl -X GET "http://localhost:5000/api/rankings?limit=10"
```

## 📊 数据库架构 (Database Schema)

### 新增表 (New Tables)

1. **api_keys** - API 密钥管理
2. **portfolio_permissions** - 投资组合权限
3. **user_rankings** - 用户排名
4. **audit_logs** - 审计日志

### 表修改 (Table Modifications)

1. **users** - 添加 `role` 和 `is_active` 字段
2. **portfolios** - 添加 `visibility` 字段

## 🔑 API 端点 (API Endpoints)

### 认证 (Authentication)
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

### API 密钥管理 (API Key Management)
- `POST /api/api-keys` - 创建 API 密钥
- `GET /api/api-keys` - 列出 API 密钥
- `PATCH /api/api-keys/:id/revoke` - 撤销 API 密钥
- `DELETE /api/api-keys/:id` - 删除 API 密钥

### 用户排名 (User Rankings)
- `GET /api/rankings` - 获取排行榜
- `GET /api/rankings/me` - 获取我的排名
- `POST /api/rankings/calculate` - 计算排名（管理员）

### 管理员操作 (Admin Operations)
- `GET /api/admin/users` - 列出所有用户
- `PATCH /api/admin/users/:id/role` - 修改用户角色
- `PATCH /api/admin/users/:id/status` - 激活/停用用户
- `GET /api/admin/audit-logs` - 查看审计日志

## 🔐 安全特性 (Security Features)

1. **密码加密** - 使用 bcrypt (10 rounds)
2. **API 密钥哈希** - 从不存储明文密钥
3. **会话管理** - 基于 cookie 的安全会话
4. **角色层次** - 自动继承权限
5. **审计追踪** - 记录所有敏感操作
6. **作用域控制** - API 密钥权限限制

## 📚 文档 (Documentation)

详细文档请参考：

- **实施指南**: [docs/IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md)
- **API 文档**: [docs/USER_PERMISSION_MANAGEMENT.md](docs/USER_PERMISSION_MANAGEMENT.md)
- **中文设计文档**: [docs/USER_PERMISSION_MANAGEMENT_ZH.md](docs/USER_PERMISSION_MANAGEMENT_ZH.md)

## 🎨 前端集成 (Frontend Integration)

待实现功能：

- [ ] 管理员面板 UI
- [ ] API 密钥管理界面
- [ ] 投资组合共享 UI
- [ ] 用户排行榜显示
- [ ] 基于角色的 UI 渲染

## 🔄 下一步 (Next Steps)

1. 更改默认管理员密码
2. 应用数据库迁移
3. 配置生产环境变量
4. 实现前端集成
5. 设置定时任务（每日排名计算）
6. 配置监控和告警

## 🤝 贡献 (Contributing)

欢迎贡献代码和反馈！

## 📝 许可证 (License)

与主项目相同

---

**注意**: 这是一个重要的架构升级，包含了多租户支持、API 密钥认证、用户排名系统等核心功能。请仔细阅读文档并按照实施指南进行部署。

**Note**: This is a major architectural upgrade that includes multi-tenant support, API key authentication, user ranking system, and other core features. Please read the documentation carefully and follow the implementation guide for deployment.
