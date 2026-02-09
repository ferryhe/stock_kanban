# Environment Variables - Configuration Guide

## 概述

Stock Kanban 在使用 `.env.production` 文件管理所有生产配置。本指南解释每个变量的作用和配置方法。

---

## 必需变量

### `NODE_ENV`
- **类型**: `enum`  
- **允许值**: `production` | `development`
- **默认值**: `production`
- **说明**: Node.js 运行环境。生产部署必须设置为 `production`

```bash
NODE_ENV=production
```

---

### `PORT`
- **类型**: `number`
- **允许值**: 1-65535
- **默认值**: `3000`
- **说明**: 应用监听的端口号

```bash
PORT=3000
```

---

### `HOST`
- **类型**: `string`
- **建议值**: `0.0.0.0`（接受所有网络接口）或 `127.0.0.1`（仅本地访问）
- **默认值**: `0.0.0.0`
- **说明**: 应用绑定的网络地址

```bash
HOST=0.0.0.0  # 允许容器外访问（推荐）
# 或
HOST=127.0.0.1  # 仅本地访问
```

---

### `DATABASE_URL`
- **类型**: `string`（PostgreSQL 连接字符串）
- **必需**: 是（推荐）
- **格式**: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE`
- **说明**: 数据库连接字符串。如果留空，脚本会自动创建本地 PostgreSQL 容器

#### 选项 1：让脚本自动创建（推荐用于新部署）

```bash
# 留空 - stock_kanban_update_and_run.sh 会自动创建
# DATABASE_URL=
```

脚本会创建：
- 容器名: `stock-kanban-pg`
- 用户: `stock_user`
- 密码: `stock_pass`
- 数据库: `stock_kanban`
- URL: `postgresql://stock_user:stock_pass@stock-kanban-pg:5432/stock_kanban`

#### 选项 2：使用现有 PostgreSQL 容器

```bash
# 连接到同一 Docker 网络中的另一个 PostgreSQL 实例
DATABASE_URL=postgresql://stock_user:your_password@meal_score-db-1:5432/stock_kanban

# 首先创建用户和数据库:
# docker exec -it meal_score-db-1 psql -U postgres -c \
#   "CREATE USER stock_user WITH ENCRYPTED PASSWORD 'your_password'; \
#    CREATE DATABASE stock_kanban OWNER stock_user;"
```

#### 选项 3：使用远程托管数据库（AWS RDS、Azure Database 等）

```bash
# AWS RDS 示例
DATABASE_URL=postgresql://admin:MySecurePass123@stock-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/stock_kanban

# Azure Database for PostgreSQL 示例
DATABASE_URL=postgresql://user@servername:password@servername.postgres.database.azure.com:5432/stock_kanban

# Google Cloud SQL 示例
DATABASE_URL=postgresql://user:password@cloudsql-conn-instance/stock_kanban
```

#### 连接字符串格式详解

```
postgresql://
  USERNAME          # 数据库用户名
  :PASSWORD         # 数据库密码
  @HOST             # 服务器地址（容器名、IP、或域名）
  :PORT             # 端口号（通常 5432）
  /DATABASE         # 数据库名
  ?param=value      # 可选查询参数（见下文）
```

#### 连接字符串示例

```bash
# 本地 Docker 容器
postgresql://stock_user:stock_pass@stock-kanban-pg:5432/stock_kanban

# 同服务器不同容器
postgresql://stock_user:stock_pass@meal_score-db-1:5432/stock_kanban

# 远程主机名
postgresql://stock_user:stock_pass@db.example.com:5432/stock_kanban

# 远程 IP 地址
postgresql://stock_user:stock_pass@192.168.1.100:5432/stock_kanban

# 使用 URL 编码密码（如果密码包含特殊字符）
# 密码: p@ss:word  →  编码: p%40ss%3Aword
postgresql://stock_user:p%40ss%3Aword@host:5432/stock_kanban
```

---

### `VITE_API_BASE_URL`
- **类型**: `URL`
- **默认值**: `http://localhost:3000`
- **说明**: 前端 JavaScript 调用 API 时使用的基础 URL

#### 本地开发

```bash
VITE_API_BASE_URL=http://localhost:3000
```

#### 通过 Caddy 反向代理（推荐用于生产）

```bash
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
```

#### 通过自定义域名

```bash
VITE_API_BASE_URL=https://your-custom-domain.com
```

---

## PostgreSQL 连接池配置

这些变量控制与数据库的连接行为。

### `PGSSL`
- **类型**: `boolean`
- **允许值**: `true` | `false`
- **默认值**: `false`
- **说明**: 是否使用 SSL/TLS 加密连接数据库

```bash
# 本地或内部网络（不需要 SSL）
PGSSL=false

# 远程或云数据库（需要 SSL）
PGSSL=true
```

---

### `PGSSL_REJECT_UNAUTHORIZED`
- **类型**: `boolean`
- **允许值**: `true` | `false`
- **默认值**: `false`
- **说明**: 是否验证数据库 SSL 证书的真实性。仅在 `PGSSL=true` 时有效

```bash
# 严格模式：验证证书（推荐用于生产）
PGSSL_REJECT_UNAUTHORIZED=true

# 宽松模式：不验证证书（用于自签名证书）
PGSSL_REJECT_UNAUTHORIZED=false
```

> **警告**: `PGSSL_REJECT_UNAUTHORIZED=false` 在生产环境中存在安全风险。仅在必要时使用。

---

### `PGPOOL_MAX`
- **类型**: `number`
- **允许值**: 1-100
- **默认值**: `10`
- **说明**: 数据库连接池的最大连接数

```bash
# 低流量应用
PGPOOL_MAX=5

# 中等流量
PGPOOL_MAX=10

# 高流量
PGPOOL_MAX=20
```

> 设置过高会占用更多内存；设置过低会导致连接排队。根据实际负载调整。

---

### `PGPOOL_IDLE_TIMEOUT_MS`
- **类型**: `number`
- **允许值**: 5000-300000（毫秒）
- **默认值**: `30000`（30 秒）
- **说明**: 空闲连接的超时时间。超过此时间的空闲连接会被关闭

```bash
# 快速回收（适合短连接）
PGPOOL_IDLE_TIMEOUT_MS=10000

# 标准配置
PGPOOL_IDLE_TIMEOUT_MS=30000

# 长连接保持打开
PGPOOL_IDLE_TIMEOUT_MS=120000
```

---

## 应用功能配置

### `LOG_LEVEL`
- **类型**: `enum`
- **允许值**: `debug` | `info` | `warn` | `error`
- **默认值**: `info`
- **说明**: 日志输出级别

```bash
# 开发环境：详细日志
LOG_LEVEL=debug

# 生产环境：仅信息、警告和错误
LOG_LEVEL=info

# 仅记录问题
LOG_LEVEL=warn
```

---

### `ADMIN_SECRET`
- **类型**: `string`
- **必需**: 是（生产环境强烈推荐）
- **说明**: 用于保护管理员端点的密钥（例如：`/api/live/settle-now`）

#### 生成强密钥

```bash
# 方法 1: OpenSSL
openssl rand -base64 32

# 方法 2: Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# 方法 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 配置示例

```bash
# 生成的密钥示例
ADMIN_SECRET=3x7p9kL2mN8qR4vW6zY1aB9cD5eF7gH2jK4lM6nO8pQ0r
```

#### 使用密钥调用受保护的端点

```bash
# API 请求中包含密钥
curl -X POST https://stockkanban.aixintelligence.com/api/live/settle-now \
  -H "Authorization: Bearer 3x7p9kL2mN8qR4vW6zY1aB9cD5eF7gH2jK4lM6nO8pQ0r" \
  -H "Content-Type: application/json"
```

---

### `ENABLE_USER_ISOLATION`
- **类型**: `boolean`
- **允许值**: `true` | `false`
- **默认值**: `false`
- **说明**: 启用严格用户隔离。当启用时，userId 只能来自认证系统，不能由客户端指定

#### 开发/测试模式

```bash
# 允许客户端在查询参数或请求体中指定 userId
ENABLE_USER_ISOLATION=false
```

示例：

```bash
curl http://localhost:3000/api/portfolios?userId=user123
```

#### 生产模式（推荐）

```bash
# 仅从认证令牌中获取 userId，防止用户欺骗
ENABLE_USER_ISOLATION=true
```

> **安全建议**: 生产环境必须启用此选项，确保用户只能访问自己的数据。

---

## 完整配置示例

### 示例 1：开发环境（本地 PostgreSQL）

```bash
# .env.production （用于本地开发）
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://localhost/stock_kanban
PGSSL=false
LOG_LEVEL=debug
ENABLE_USER_ISOLATION=false
```

### 示例 2：生产环境（自动创建 PostgreSQL）

```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
# DATABASE_URL= （留空让脚本创建）
PGSSL=false
PGPOOL_MAX=10
LOG_LEVEL=info
ADMIN_SECRET=<strong-random-string>
ENABLE_USER_ISOLATION=true
```

### 示例 3：生产环境（AWS RDS）

```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
DATABASE_URL=postgresql://admin:MySecurePass123@stock-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/stock_kanban
PGSSL=true
PGSSL_REJECT_UNAUTHORIZED=true
PGPOOL_MAX=15
PGPOOL_IDLE_TIMEOUT_MS=30000
LOG_LEVEL=info
ADMIN_SECRET=<strong-random-string>
ENABLE_USER_ISOLATION=true
```

### 示例 4：生产环境（使用现有 PostgreSQL 容器）

```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
DATABASE_URL=postgresql://stock_user:your_password@meal_score-db-1:5432/stock_kanban
PGSSL=false
PGPOOL_MAX=10
LOG_LEVEL=info
ADMIN_SECRET=<strong-random-string>
ENABLE_USER_ISOLATION=true
```

---

## 验证配置

### 检查环境变量是否正确加载

```bash
# 显示容器中的所有环境变量
docker exec stock-kanban-app env | sort

# 筛选指定变量
docker exec stock-kanban-app env | grep DATABASE_URL
```

### 测试数据库连接

```bash
# 使用部署脚本测试
./stock_kanban_update_and_run.sh

# 或手动测试
docker run --rm -e DATABASE_URL='postgresql://stock_user:stock_pass@stock-kanban-pg:5432/stock_kanban' \
  --network caddy-net \
  postgres:16-alpine \
  pg_isready -d "$DATABASE_URL"

# 预期输出: accepting connections
```

### 验证 API 连接

```bash
# 测试 API 端点
curl http://localhost:3000/api/watchlists

# 测试通过 Caddy 的 HTTPS
curl https://stockkanban.aixintelligence.com/api/watchlists
```

---

## 故障排查

### 问题：数据库连接失败

**症状**: 日志中出现 `Cannot connect to database`

**检查列表**:
1. 验证 `DATABASE_URL` 格式正确
   ```bash
   # 应该是这样：postgresql://user:pass@host:5432/db
   ```
2. 测试 PostgreSQL 容器是否运行
   ```bash
   docker ps | grep postgres
   ```
3. 测试网络连接
   ```bash
   docker exec stock-kanban-app ping stock-kanban-pg
   ```
4. 验证凭证
   ```bash
   docker exec -it stock-kanban-pg psql -U stock_user -d stock_kanban
   ```

### 问题：前端无法连接 API

**症状**: 浏览器控制台出现跨域或网络错误

**检查列表**:
1. 验证 `VITE_API_BASE_URL` 是否正确
   ```bash
   # 应该与浏览器中使用的域名一致
   curl $VITE_API_BASE_URL/api/watchlists
   ```
2. 检查 Caddy 反向代理
   ```bash
   docker logs caddy | tail -20
   ```

### 问题：权限不足访问管理员端点

**症状**: `/api/live/settle-now` 返回 403 Forbidden

**检查列表**:
1. 验证 `ADMIN_SECRET` 是否设置
   ```bash
   docker exec stock-kanban-app env | grep ADMIN_SECRET
   ```
2. 在请求中包含正确的密钥
   ```bash
   curl -H "Authorization: Bearer $ADMIN_SECRET" \
     https://stockkanban.aixintelligence.com/api/live/settle-now
   ```

---

## 安全最佳实践

1. **使用强密钥**: `ADMIN_SECRET` 应至少 32 字符，使用随机生成
2. **不要在 Git 中提交**: `.env.production` 应在 `.gitignore` 中
3. **定期轮换密钥**: 定期更新 `ADMIN_SECRET`
4. **使用 SSL**: 对于远程数据库，启用 `PGSSL=true`
5. **限制访问**: 使用防火墙或安全组限制数据库访问
6. **审计日志**: 定期检查 `LOG_LEVEL=info` 以上的日志

---

## 更新配置

### 不重建容器的方式

如果只修改了某些变量（不涉及数据库初始化），可以快速更新：

```bash
# 编辑 .env.production
nano .env.production

# 只更新环境变量（不重建镜像）
docker stop stock-kanban-app
docker rm stock-kanban-app

# 重新运行脚本
./stock_kanban_update_and_run.sh
```

### 全量重建

```bash
# 修改了影响构建的变量（如 DATABASE_URL）
./stock_kanban_update_and_run.sh
```

---

**文档版本**: 2.0  
**最后更新**: 2026-02-08
