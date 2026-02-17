# 用户权限管理与多租户架构设计文档

## 概述

本文档描述了股票看板应用的用户权限管理系统、多租户架构设计以及实现方案。

## 问题分析

根据您的需求：

1. **用户管理与权限控制**
   - 需要一个密钥系统用于远程权限控制
   - 不同用户需要不同的权限级别
   - 需要参考 GitHub 上最流行的账户管理方案

2. **多租户股票篮子系统**
   - 每个客户有自己的股票篮子（投资组合）
   - 后台收集所有篮子的股票数据计算排名
   - 每个用户看到自己篮子的情况和排名
   - 可能需要调整排名和交易逻辑

3. **后台量化计算优化**
   - 需要优化以匹配多租户架构

## 解决方案架构

### 1. 用户角色系统

实现了四级权限体系：

```
用户角色 (user_role enum)
├── user (普通用户)          - 级别 1: 基础权限
├── analyst (分析师)         - 级别 2: 高级分析权限
├── admin (管理员)           - 级别 3: 用户管理权限
└── superadmin (超级管理员)  - 级别 4: 完整系统权限
```

**权限继承：** 高级别角色继承低级别角色的所有权限

### 2. API 密钥系统

为远程控制和程序化访问提供 API 密钥认证：

#### 密钥格式
```
sk_live_<64位十六进制随机字符串>
```

#### 密钥特性
- **安全存储：** 使用 bcrypt 哈希存储，不保存明文
- **作用域控制：** 可限制访问特定投资组合
- **权限控制：** read（读）、write（写）、admin（管理）
- **过期时间：** 可设置密钥有效期
- **使用追踪：** 记录最后使用时间
- **撤销机制：** 随时可以撤销或删除密钥

#### 使用示例
```bash
# 创建 API 密钥
POST /api/api-keys
Authorization: Bearer <your_session_token>
{
  "name": "我的量化分析密钥",
  "scope": {
    "portfolios": ["*"],
    "permissions": ["read", "write"]
  },
  "expiresInDays": 90
}

# 使用 API 密钥访问数据
GET /api/portfolios
Authorization: Bearer sk_live_abc123...
```

### 3. 多租户投资组合架构

#### 投资组合可见性级别

```
投资组合可见性 (portfolio_visibility enum)
├── private (私有)  - 只有所有者可见
├── shared (共享)   - 指定用户可见
└── public (公开)   - 所有人可见，参与排名
```

#### 投资组合权限系统

通过 `portfolio_permissions` 表实现细粒度权限控制：

```
权限级别 (portfolio_permission enum)
├── view (查看)   - 可以查看投资组合详情
├── trade (交易)  - 可以执行交易操作
└── admin (管理)  - 完整控制权限
```

#### 数据架构

```
用户 (users)
  ├── 基础信息：用户名、密码（加密）、角色
  ├── 状态管理：is_active（激活状态）
  └── 创建时间

投资组合 (portfolios)
  ├── 所有者：userId
  ├── 可见性：visibility (private/shared/public)
  ├── 类型：type (live/backtest)
  ├── 财务数据：现金、总价值等
  └── 策略配置

投资组合权限 (portfolio_permissions)
  ├── 投资组合 ID：portfolioId
  ├── 用户 ID：userId
  ├── 权限级别：permission (view/trade/admin)
  └── 授权人：grantedBy
```

### 4. 用户排名系统

#### 排名计算机制

```sql
-- 每日自动计算排名
用户排名 (user_rankings)
  ├── 用户信息：userId, portfolioId
  ├── 日期：rankingDate
  ├── 性能指标：
  │   ├── totalReturn (总收益率)
  │   ├── annualizedReturn (年化收益率)
  │   ├── sharpeRatio (夏普比率)
  │   └── totalValue (总价值)
  ├── 排名数据：
  │   ├── rank (排名)
  │   └── percentile (百分位)
  └── 创建时间
```

#### 排名规则

1. **参与条件：**
   - 只有 `public` 或 `shared` 可见性的投资组合参与排名
   - 只统计 `live` 类型的投资组合（不包括回测）

2. **排名依据：**
   - 主要按 `totalReturn`（总收益率）排序
   - 可扩展支持多维度排名（夏普比率、年化收益等）

3. **更新频率：**
   - 建议每日自动计算一次
   - 管理员可手动触发计算

#### API 端点

```bash
# 获取排行榜（公开访问）
GET /api/rankings?limit=100&date=2026-02-13

# 查看我的排名（需要认证）
GET /api/rankings/me?limit=10

# 查看特定投资组合排名
GET /api/rankings/portfolio/:portfolioId?date=2026-02-13

# 计算排名（管理员）
POST /api/rankings/calculate
{
  "date": "2026-02-13"
}
```

### 5. 审计日志系统

为安全合规和追踪提供完整的审计日志：

```
审计日志 (audit_logs)
  ├── 用户信息：userId
  ├── 操作类型：action (login, create_portfolio, trade等)
  ├── 资源信息：resourceType, resourceId
  ├── 详细信息：details (JSON格式)
  ├── 请求信息：ipAddress, userAgent
  └── 时间戳：createdAt
```

#### 记录的操作类型

- **认证事件：** 登录、登出、注册、密码修改
- **投资组合：** 创建、更新、删除、共享
- **交易操作：** 买入、卖出、撤单
- **API 密钥：** 创建、撤销、删除
- **权限变更：** 授予权限、撤销权限
- **管理操作：** 角色变更、用户激活/停用

### 6. 管理员功能

管理员专用 API 端点（`/api/admin/*`）：

```bash
# 用户管理
GET  /api/admin/users                    # 列出所有用户
GET  /api/admin/users/:userId            # 查看用户详情
PATCH /api/admin/users/:userId/role      # 修改用户角色（仅超管）
PATCH /api/admin/users/:userId/status    # 激活/停用用户
POST /api/admin/users/:userId/reset-password  # 重置密码（仅超管）

# 审计日志
GET /api/admin/audit-logs                # 查看审计日志

# 系统统计
GET /api/admin/stats                     # 系统统计数据
```

## 数据库迁移

### 执行迁移

```bash
# 应用新的数据库 schema
psql $DATABASE_URL -f deploy/sql/003_user_management_and_permissions.sql
```

### 新增的数据库对象

1. **枚举类型：**
   - `user_role`: 用户角色
   - `portfolio_visibility`: 投资组合可见性
   - `portfolio_permission`: 投资组合权限

2. **新表：**
   - `api_keys`: API 密钥管理
   - `portfolio_permissions`: 投资组合权限
   - `user_rankings`: 用户排名
   - `audit_logs`: 审计日志

3. **表修改：**
   - `users`: 添加 role, is_active 字段
   - `portfolios`: 添加 visibility 字段

## 使用场景示例

### 场景 1: 普通用户创建私有投资组合

```javascript
// 1. 用户注册/登录
POST /api/auth/register
{
  "username": "trader123",
  "password": "securePass123"
}

// 2. 创建私有投资组合
POST /api/portfolios
{
  "name": "我的投资组合",
  "type": "live",
  "visibility": "private",
  "initialCash": 100000
}

// 3. 执行交易
POST /api/trades
{
  "portfolioId": "...",
  "ticker": "NVDA",
  "type": "BUY",
  "quantity": 100,
  "price": 500.00
}
```

### 场景 2: 用户创建公开投资组合参与排名

```javascript
// 1. 创建公开投资组合
POST /api/portfolios
{
  "name": "我的量化策略",
  "type": "live",
  "visibility": "public",  // 公开可见
  "initialCash": 100000
}

// 2. 查看我的排名
GET /api/rankings/me

// 响应示例：
{
  "rankings": [
    {
      "rank": 42,
      "percentile": 85.5,
      "totalReturn": 0.15,
      "portfolioName": "我的量化策略",
      "rankingDate": "2026-02-13"
    }
  ]
}
```

### 场景 3: 创建 API 密钥用于程序化访问

```javascript
// 1. 创建 API 密钥
POST /api/api-keys
{
  "name": "量化策略API密钥",
  "scope": {
    "portfolios": ["portfolio-id-1", "portfolio-id-2"],
    "permissions": ["read", "write"]
  },
  "expiresInDays": 90
}

// 响应（密钥只显示一次！）：
{
  "key": "sk_live_abc123def456...",
  "keyInfo": { ... }
}

// 2. 使用 API 密钥访问数据
curl -H "Authorization: Bearer sk_live_abc123def456..." \
  https://api.example.com/api/portfolios
```

### 场景 4: 管理员管理用户

```javascript
// 1. 查看所有用户
GET /api/admin/users

// 2. 提升用户为分析师
PATCH /api/admin/users/:userId/role
{
  "role": "analyst"
}

// 3. 停用用户
PATCH /api/admin/users/:userId/status
{
  "isActive": false
}

// 4. 查看审计日志
GET /api/admin/audit-logs?limit=100
```

## 量化计算优化建议

### 1. 数据聚合策略

```javascript
// 后台定时任务：收集所有公开投资组合的股票
async function aggregateAllStocks() {
  // 1. 获取所有公开的投资组合
  const publicPortfolios = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.visibility, 'public'));

  // 2. 收集所有持仓股票
  const allHoldings = await db
    .select()
    .from(holdings)
    .where(inArray(holdings.portfolioId, publicPortfolios.map(p => p.id)));

  // 3. 按股票代码分组统计
  const stockAggregation = aggregateByTicker(allHoldings);

  // 4. 更新量化指标
  await updateQuantMetrics(stockAggregation);

  return stockAggregation;
}
```

### 2. 排名计算优化

```javascript
// 使用数据库聚合提高性能
async function calculateRankingsOptimized(date) {
  const rankings = await db.execute(sql`
    WITH portfolio_performance AS (
      SELECT 
        p.id as portfolio_id,
        p.user_id,
        p.total_value,
        sp.total_return,
        sp.annualized_return,
        sp.sharpe_ratio,
        ROW_NUMBER() OVER (
          PARTITION BY p.id 
          ORDER BY sp.calculation_date DESC
        ) as rn
      FROM portfolios p
      LEFT JOIN strategy_performance sp ON p.id = sp.portfolio_id
      WHERE p.type = 'live' 
        AND p.visibility IN ('public', 'shared')
    ),
    ranked AS (
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY total_return DESC) as rank,
        PERCENT_RANK() OVER (ORDER BY total_return DESC) * 100 as percentile
      FROM portfolio_performance
      WHERE rn = 1
    )
    INSERT INTO user_rankings (
      user_id, portfolio_id, ranking_date, 
      total_return, annualized_return, sharpe_ratio,
      total_value, rank, percentile
    )
    SELECT 
      user_id, portfolio_id, ${date},
      total_return, annualized_return, sharpe_ratio,
      total_value, rank, percentile
    FROM ranked
    ON CONFLICT (portfolio_id, ranking_date) 
    DO UPDATE SET
      rank = EXCLUDED.rank,
      percentile = EXCLUDED.percentile
  `);
  
  return rankings;
}
```

### 3. 实时数据更新策略

```javascript
// 使用 Redis 缓存提高性能
class PortfolioCache {
  // 缓存用户投资组合列表
  async getUserPortfolios(userId) {
    const cacheKey = `portfolios:${userId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) return JSON.parse(cached);
    
    const portfolios = await db.query.portfolios.findMany({
      where: eq(portfolios.userId, userId)
    });
    
    await redis.set(cacheKey, JSON.stringify(portfolios), 'EX', 300);
    return portfolios;
  }

  // 缓存排行榜数据
  async getLeaderboard(date, limit) {
    const cacheKey = `leaderboard:${date}:${limit}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) return JSON.parse(cached);
    
    const rankings = await getUserRankings(date, limit);
    await redis.set(cacheKey, JSON.stringify(rankings), 'EX', 3600);
    
    return rankings;
  }
}
```

## 安全最佳实践

### 1. 默认管理员账户

**⚠️ 重要安全警告：**

数据库迁移会创建默认管理员账户：
```
用户名：admin
密码：admin123
```

**必须立即更改此密码！**

### 2. API 密钥安全

- 安全存储密钥（使用环境变量或密钥管理服务）
- 定期轮换 API 密钥
- 使用作用域限制权限
- 设置合理的过期时间
- 监控 API 密钥使用情况

### 3. 审计与监控

- 定期审查审计日志
- 监控异常登录行为
- 跟踪大额交易
- 归档日志以符合合规要求

### 4. 生产环境配置

```bash
# .env.production
ENABLE_USER_ISOLATION=true
ADMIN_SECRET=your-strong-secret-key
SESSION_SECRET=your-session-secret
DATABASE_URL=postgresql://...

# 启用 HTTPS
# 配置速率限制
# 使用安全的会话配置
```

## 下一步计划

### 前端集成（Phase 5）

1. **管理员面板：**
   - 用户管理界面
   - 角色分配
   - 审计日志查看
   - 系统统计仪表板

2. **API 密钥管理界面：**
   - 创建/撤销密钥
   - 查看密钥使用情况
   - 设置密钥权限

3. **投资组合共享：**
   - 设置可见性
   - 邀请用户查看
   - 权限管理

4. **用户排行榜：**
   - 实时排名显示
   - 个人排名卡片
   - 历史排名趋势

### 高级功能（Future）

1. **双因素认证（2FA）**
2. **OAuth 集成（Google, GitHub）**
3. **Webhook 通知**
4. **高级分析仪表板**
5. **投资组合协作功能**

## 技术栈

- **后端：** Node.js, Express, TypeScript
- **数据库：** PostgreSQL, Drizzle ORM
- **认证：** bcrypt, express-session
- **API 文档：** 见 `docs/USER_PERMISSION_MANAGEMENT.md`

## 总结

该系统提供了：

✅ **完整的用户权限管理** - 四级角色体系
✅ **API 密钥系统** - 用于远程控制和程序化访问
✅ **多租户架构** - 每个用户独立的投资组合
✅ **投资组合共享** - 灵活的可见性和权限控制
✅ **用户排名系统** - 基于性能的自动排名
✅ **审计日志** - 完整的操作追踪
✅ **管理员工具** - 用户和系统管理

这个架构可以支持：
- 个人投资者管理自己的投资组合
- 分析师创建和分享投资策略
- 管理员管理用户和权限
- 程序化交易系统通过 API 访问
- 社区排行榜和竞赛

## 支持与反馈

如有问题或建议，请查阅完整文档或联系开发团队。
