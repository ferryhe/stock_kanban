# 实现总结 - 用户权限管理与多租户架构

## 概述

已成功为股票看板应用实现完整的用户权限管理系统和多租户架构。本文档总结了所有实现的功能和使用方法。

## ✅ 已完成的功能

### 1. 用户角色系统 (User Role System)

实现了四级权限体系：

- **user** (普通用户) - 级别 1
- **analyst** (分析师) - 级别 2
- **admin** (管理员) - 级别 3
- **superadmin** (超级管理员) - 级别 4

**特点：**
- 权限继承：高级别自动拥有低级别的所有权限
- 数据库强制：使用 PostgreSQL enum 类型确保数据一致性
- 默认管理员：自动创建 admin/admin123 账户（**请立即更改密码！**）

### 2. API 密钥系统 (API Key System)

为远程控制和程序化访问提供 API 密钥认证。

**特性：**
- ✅ 安全格式：`sk_live_<64位十六进制>`
- ✅ 哈希存储：使用 bcrypt，不存储明文
- ✅ 作用域控制：可限制访问特定投资组合
- ✅ 权限分级：read（读）、write（写）、admin（管理）
- ✅ 过期管理：可设置有效期
- ✅ 使用追踪：记录最后使用时间
- ✅ 撤销机制：随时可撤销或删除

**API 端点：**
```bash
POST   /api/api-keys              # 创建密钥
GET    /api/api-keys              # 列出密钥
GET    /api/api-keys/:id          # 查看详情
PATCH  /api/api-keys/:id/revoke   # 撤销密钥
DELETE /api/api-keys/:id          # 删除密钥
```

### 3. 投资组合可见性控制 (Portfolio Visibility)

三级可见性设置：

- **private** (私有) - 只有所有者可见
- **shared** (共享) - 指定用户可见（通过 portfolio_permissions 表）
- **public** (公开) - 所有人可见，参与排名

**权限级别：**
- **view** (查看) - 查看投资组合详情
- **trade** (交易) - 执行交易操作
- **admin** (管理) - 完整控制权限

### 4. 用户排名系统 (User Ranking System)

基于投资组合性能的自动排名系统。

**排名指标：**
- 总收益率 (Total Return)
- 年化收益率 (Annualized Return)
- 夏普比率 (Sharpe Ratio)
- 总价值 (Total Value)
- 排名 (Rank)
- 百分位 (Percentile)

**API 端点：**
```bash
GET  /api/rankings                    # 获取排行榜
GET  /api/rankings/me                 # 查看我的排名
GET  /api/rankings/portfolio/:id     # 查看特定投资组合排名
POST /api/rankings/calculate          # 计算排名（管理员）
```

**排名规则：**
- 只有 `public` 或 `shared` 可见性的投资组合参与排名
- 只统计 `live` 类型投资组合（不包括回测）
- 建议每日自动计算一次（可通过定时任务）

### 5. 审计日志系统 (Audit Logs)

完整的操作追踪和审计功能。

**记录的操作：**
- 认证事件：登录、登出、注册、密码修改
- 投资组合：创建、更新、删除、共享
- 交易操作：买入、卖出
- API 密钥：创建、撤销、删除
- 权限变更：授予、撤销权限
- 管理操作：角色变更、用户激活/停用

**日志内容：**
- 用户信息
- 操作类型
- 资源信息（类型、ID）
- 详细参数（JSON）
- 请求信息（IP、User-Agent）
- 时间戳

### 6. 管理员功能 (Admin Operations)

专门的管理员 API 端点。

```bash
# 用户管理
GET   /api/admin/users                       # 列出所有用户
GET   /api/admin/users/:id                   # 查看用户详情
PATCH /api/admin/users/:id/role              # 修改角色（仅超管）
PATCH /api/admin/users/:id/status            # 激活/停用
POST  /api/admin/users/:id/reset-password    # 重置密码（仅超管）

# 审计与监控
GET   /api/admin/audit-logs                  # 审计日志
GET   /api/admin/stats                       # 系统统计
```

## 📁 文件结构

```
stock_kanban/
├── deploy/sql/
│   └── 003_user_management_and_permissions.sql    # 数据库迁移
├── server/
│   ├── middleware/
│   │   └── auth.ts                                # 认证授权中间件
│   ├── services/
│   │   ├── apiKeyService.ts                       # API密钥服务
│   │   ├── userRankingService.ts                  # 用户排名服务
│   │   └── auditLogService.ts                     # 审计日志服务
│   └── routes/
│       ├── apiKeys.ts                             # API密钥路由
│       ├── rankings.ts                            # 排名路由
│       └── admin.ts                               # 管理员路由
├── shared/
│   └── schema.ts                                  # 数据库Schema（已更新）
└── docs/
    ├── USER_PERMISSION_MANAGEMENT.md              # API文档（英文）
    ├── USER_PERMISSION_MANAGEMENT_ZH.md           # 设计文档（中文）
    ├── IMPLEMENTATION_GUIDE.md                    # 实施指南
    └── README_USER_PERMISSION_MANAGEMENT.md       # 快速开始
```

## 🗄️ 数据库变更

### 新增表

1. **api_keys** - API 密钥管理
2. **portfolio_permissions** - 投资组合权限控制
3. **user_rankings** - 用户排名数据
4. **audit_logs** - 审计日志

### 表修改

1. **users**
   - 新增字段：`role` (user_role enum)
   - 新增字段：`is_active` (boolean)

2. **portfolios**
   - 新增字段：`visibility` (portfolio_visibility enum)

### 新增枚举类型

1. **user_role** - 用户角色
2. **portfolio_visibility** - 投资组合可见性
3. **portfolio_permission** - 投资组合权限

## 🚀 部署步骤

### 1. 应用数据库迁移

```bash
# 连接到 PostgreSQL 数据库
psql $DATABASE_URL -f deploy/sql/003_user_management_and_permissions.sql
```

这将创建所有新的表、枚举和字段。

### 2. 配置环境变量

在 `.env` 文件中添加：

```bash
# 启用用户隔离（生产环境）
ENABLE_USER_ISOLATION=true

# 管理员操作密钥
ADMIN_SECRET=your-strong-random-secret-key

# 会话密钥
SESSION_SECRET=your-session-secret-key

# 数据库连接
DATABASE_URL=postgresql://user:pass@host:port/db
```

### 3. 更改默认管理员密码

**⚠️ 非常重要！** 立即更改默认管理员密码：

```bash
# 1. 使用 admin/admin123 登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 2. 修改密码（使用管理员API）
curl -X POST http://localhost:5000/api/admin/users/{admin-user-id}/reset-password \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword": "YourStrongPassword123!"}'
```

### 4. 设置定时任务（可选）

建议设置定时任务每日计算排名：

```typescript
// 在你的定时任务中添加
import cron from "node-cron";
import { calculateUserRankings } from "./services/userRankingService";

// 每天凌晨2点计算排名
cron.schedule("0 2 * * *", async () => {
  const today = new Date();
  await calculateUserRankings(today);
  console.log("Rankings calculated");
});
```

## 💡 使用示例

### 场景 1：创建 API 密钥

```bash
# 1. 登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "trader123", "password": "mypassword"}'

# 2. 创建 API 密钥
curl -X POST http://localhost:5000/api/api-keys \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "量化策略密钥",
    "scope": {
      "portfolios": ["*"],
      "permissions": ["read", "write"]
    },
    "expiresInDays": 90
  }'

# 响应包含密钥（只显示一次！）
{
  "key": "sk_live_abc123def456...",
  "keyInfo": { ... }
}

# 3. 使用 API 密钥访问数据
curl -H "Authorization: Bearer sk_live_abc123..." \
  http://localhost:5000/api/portfolios
```

### 场景 2：创建公开投资组合并查看排名

```bash
# 1. 创建公开投资组合
curl -X POST http://localhost:5000/api/portfolios \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的量化策略",
    "type": "live",
    "visibility": "public",
    "initialCash": 100000
  }'

# 2. 执行一些交易...
# (使用现有的交易API)

# 3. 管理员触发排名计算
curl -X POST http://localhost:5000/api/rankings/calculate \
  -H "Cookie: connect.sid=<admin-session>" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-02-13"}'

# 4. 查看我的排名
curl -H "Cookie: connect.sid=<session>" \
  http://localhost:5000/api/rankings/me

# 响应示例
{
  "rankings": [
    {
      "rank": 42,
      "percentile": 85.5,
      "totalReturn": 0.15,
      "annualizedReturn": 0.18,
      "sharpeRatio": 1.8,
      "portfolioName": "我的量化策略"
    }
  ]
}

# 5. 查看排行榜
curl http://localhost:5000/api/rankings?limit=10
```

### 场景 3：管理员管理用户

```bash
# 1. 以管理员身份登录
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "NewAdminPass123!"}'

# 2. 查看所有用户
curl -H "Cookie: connect.sid=<admin-session>" \
  http://localhost:5000/api/admin/users

# 3. 提升用户为分析师
curl -X PATCH http://localhost:5000/api/admin/users/{user-id}/role \
  -H "Cookie: connect.sid=<admin-session>" \
  -H "Content-Type: application/json" \
  -d '{"role": "analyst"}'

# 4. 停用用户
curl -X PATCH http://localhost:5000/api/admin/users/{user-id}/status \
  -H "Cookie: connect.sid=<admin-session>" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# 5. 查看审计日志
curl -H "Cookie: connect.sid=<admin-session>" \
  "http://localhost:5000/api/admin/audit-logs?limit=50"
```

## 🔐 安全建议

1. **立即更改默认管理员密码！**
2. 在生产环境设置 `ENABLE_USER_ISOLATION=true`
3. 使用强密钥：`ADMIN_SECRET`, `SESSION_SECRET`
4. 启用 HTTPS/TLS
5. 配置速率限制
6. 定期审查审计日志
7. 定期轮换 API 密钥
8. 设置 API 密钥过期时间

## 📚 完整文档

- **API 参考**: [docs/USER_PERMISSION_MANAGEMENT.md](./USER_PERMISSION_MANAGEMENT.md)
- **架构设计**: [docs/USER_PERMISSION_MANAGEMENT_ZH.md](./USER_PERMISSION_MANAGEMENT_ZH.md)
- **实施指南**: [docs/IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **快速开始**: [docs/README_USER_PERMISSION_MANAGEMENT.md](./README_USER_PERMISSION_MANAGEMENT.md)

## 🎯 下一步计划

### 前端集成（待实现）

1. **管理员面板**
   - 用户列表和管理
   - 角色分配界面
   - 审计日志查看器
   - 系统统计仪表板

2. **API 密钥管理界面**
   - 创建/撤销密钥
   - 查看密钥列表
   - 设置密钥权限
   - 使用统计

3. **投资组合共享**
   - 设置可见性
   - 邀请用户
   - 权限管理
   - 共享列表

4. **用户排行榜**
   - 实时排名显示
   - 个人排名卡片
   - 历史趋势图
   - 过滤和搜索

5. **基于角色的 UI**
   - 根据用户角色显示/隐藏功能
   - 管理员工具栏
   - 权限提示

### 高级功能（未来）

1. 双因素认证 (2FA)
2. OAuth 集成 (Google, GitHub)
3. Webhook 通知
4. 实时推送通知
5. 高级分析仪表板
6. 投资组合协作功能
7. 社交功能（关注、评论）

## 🧪 测试清单

- [ ] 数据库迁移成功应用
- [ ] 默认管理员账户可访问
- [ ] 会话认证工作正常
- [ ] API 密钥认证工作正常
- [ ] API 密钥创建/撤销功能
- [ ] 用户角色权限执行
- [ ] 投资组合可见性规则
- [ ] 排名计算功能
- [ ] 审计日志正在创建
- [ ] 管理员操作受限正常

## 🐛 故障排除

### 问题：API 密钥不工作

**解决方案：**
1. 检查密钥格式是否以 `sk_live_` 开头
2. 确认密钥未过期
3. 确认密钥状态为 active
4. 检查 Authorization header 格式：`Bearer <key>`

### 问题：无法访问管理员面板

**解决方案：**
1. 确认用户角色为 admin 或 superadmin
2. 检查会话是否有效
3. 查看审计日志了解访问尝试

### 问题：排名未更新

**解决方案：**
1. 确保投资组合设置为 `public` 或 `shared`
2. 检查 strategy_performance 表有最新数据
3. 手动触发排名计算
4. 检查定时任务是否运行

## 💬 总结

本次实现为股票看板应用添加了：

✅ **完整的用户权限管理** - 四级角色体系
✅ **API 密钥系统** - 用于远程控制和程序化访问
✅ **多租户架构** - 每个用户独立的投资组合
✅ **投资组合可见性控制** - 私有/共享/公开
✅ **用户排名系统** - 基于性能的自动排名
✅ **审计日志** - 完整的操作追踪
✅ **管理员工具** - 用户和系统管理

这个架构支持：
- 个人投资者管理自己的投资组合
- 分析师创建和分享投资策略
- 管理员管理用户和权限
- 程序化交易系统通过 API 访问
- 社区排行榜和竞赛
- 多用户协作

所有代码已通过 TypeScript 类型检查和构建测试。

## 📞 支持

如有问题或需要帮助，请：
1. 查阅完整文档
2. 检查审计日志
3. 联系开发团队

---

**开发者**: GitHub Copilot Agent
**日期**: 2026-02-13
**版本**: 1.0.0
