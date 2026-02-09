# Stock Kanban - Linux Deployment Guide

这份指南将帮助你在 Linux EC2 实例上部署和管理 Stock Kanban 应用。

> **当前环境**: EC2 (Amazon Linux 2)，Caddy 反向代理，Docker Compose 环境

## 目录

1. [初次部署](#初次部署)
2. [一键更新](#一键更新)
3. [数据库配置](#数据库配置)
4. [环境变量](#环境变量)
5. [故障排查](#故障排查)
6. [监控和日志](#监控和日志)

---

## 初次部署

### 前置条件检查

```bash
# 检查 Docker 是否已安装
docker --version
# 应该看到: Docker version 20.x+ 或更高

# 检查 Caddy 是否在运行
docker ps | grep caddy
# 应该看到: caddy:2 容器在运行

# 检查网络
docker network ls | grep caddy-net
# 应该看到: caddy-net 网络存在
```

### 第1步：克隆或更新项目代码

```bash
cd /path/to/stock_kanban

# 如果是第一次，克隆项目
git clone <repo-url> stock_kanban
cd stock_kanban

# 或者更新现有项目
git pull origin main
```

### 第2步：配置环境变量

```bash
# 复制示例配置文件
cp .env.production.example .env.production

# 编辑配置文件
nano .env.production
```

#### 配置选项 A：使用脚本自动创建 PostgreSQL 容器（推荐用于首次部署）

```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com

# 留空让脚本自动创建 PostgreSQL 容器
# DATABASE_URL=

LOG_LEVEL=info
ADMIN_SECRET=<strong-random-secret>
ENABLE_USER_ISOLATION=true
```

脚本会自动：
- 创建 `stock-kanban-pg` 容器
- 初始化数据库
- 设置 DATABASE_URL

#### 配置选项 B：连接到现有 PostgreSQL 容器

如果你想使用已有的 PostgreSQL 实例（例如 `meal_score-db-1`），需要先在该实例中创建新的数据库和用户：

```bash
# 1. 进入现有的 PostgreSQL 容器
docker exec -it meal_score-db-1 psql -U postgres

# 2. 创建新用户和数据库
CREATE USER stock_user WITH ENCRYPTED PASSWORD 'your_strong_password';
CREATE DATABASE stock_kanban OWNER stock_user;
GRANT ALL PRIVILEGES ON DATABASE stock_kanban TO stock_user;
\q

# 3. 在 .env.production 中设置 DATABASE_URL
# .env.production
DATABASE_URL=postgresql://stock_user:your_strong_password@meal_score-db-1:5432/stock_kanban
PGSSL=false
PGPOOL_MAX=10
PGPOOL_IDLE_TIMEOUT_MS=30000
```

#### 配置选项 C：使用远程 PostgreSQL（AWS RDS 等）

```bash
# .env.production
DATABASE_URL=postgresql://USERNAME:PASSWORD@your-db-host.rds.amazonaws.com:5432/stock_kanban
PGSSL=true
PGSSL_REJECT_UNAUTHORIZED=false
PGPOOL_MAX=10
PGPOOL_IDLE_TIMEOUT_MS=30000
```

### 第3步：运行部署脚本

```bash
# 使脚本可执行
chmod +x stock_kanban_update_and_run.sh

# 执行部署脚本
./stock_kanban_update_and_run.sh
```

脚本会依次执行：
1. ✓ 恢复本地更改（`git restore .`）
2. ✓ 拉取最新代码（`git pull`）
3. ✓ 确保 Docker 网络存在
4. ✓ 验证或创建 PostgreSQL
5. ✓ 初始化数据库表和扩展
6. ✓ 构建和启动应用容器

输出示例：

```
╔════════════════════════════════════════════╗
║ [stock-kanban] ✓ Prerequisites check passed
╚════════════════════════════════════════════╝

╔════════════════════════════════════════════╗
║ [stock-kanban] Step 1/7: Reset local tracked changes
╚════════════════════════════════════════════╝
...
```

### 第4步：验证部署

```bash
# 检查容器是否正在运行
docker ps | grep stock-kanban-app

# 查看容器日志
docker logs stock-kanban-app

# 检查应用健康状态
docker inspect stock-kanban-app | grep -A 5 "Health"

# 测试 API 端点
curl -s http://localhost:3000/api/watchlists | head -20
```

### 第5步：验证 Caddy 配置（可选）

你的应用应该已经通过 Caddy 反向代理可访问：

```bash
# 检查 Caddy 配置中是否已包含 stock-kanban
docker exec caddy caddy list-routes 2>/dev/null | grep stock-kanban

# 应该看到类似的输出:
# Host: stockkanban.aixintelligence.com
# Path: /
# Handler: reverse_proxy
```

如果没有，编辑 Caddy 配置：

```bash
docker exec -it caddy nano /etc/caddy/Caddyfile

# 添加这一段（如果不存在）:
# stockkanban.aixintelligence.com {
#     reverse_proxy stock-kanban-app:3000
#     encode gzip
# }

# 重新加载 Caddy
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 一键更新

部署完成后，后续更新只需一条命令：

```bash
cd /path/to/stock_kanban
./stock_kanban_update_and_run.sh
```

这会：
1. 拉取最新代码
2. 检查 PostgreSQL 可用性
3. 重新构建镜像
4. 重启应用容器

---

## 数据库配置

### 理解数据库初始化

脚本在首次运行时会执行以下 SQL 脚本（来自 `deploy/sql/`）：

```bash
deploy/sql/001_backtest_results.sql
```
- 创建 `backtest_results` 表（回测结果存储）
- 创建 `users` 用户表
- 启用 `pgcrypto` 扩展

```bash
deploy/sql/002_core_trading_tables.sql
```
- 创建 `strategies` 表（策略定义）
- 创建 `portfolios` 表（投资组合）
- 创建 `holdings` 表（持仓）
- 创建相关索引和约束

### 手动验证数据库

```bash
# 连接到数据库
docker exec -it stock-kanban-pg psql -U stock_user -d stock_kanban

# 列出所有表
\dt

# 检查 backtest_results 表
SELECT COUNT(*) FROM backtest_results;

# 查看表结构
\d backtest_results

# 退出
\q
```

### 数据库备份

```bash
# 备份整个数据库
docker exec stock-kanban-pg pg_dump -U stock_user stock_kanban > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份到卷外
docker exec -it stock-kanban-pg pg_dump -U stock_user stock_kanban | bzip2 > backup_stock_kanban.sql.bz2

# 恢复备份
docker exec -i stock-kanban-pg psql -U stock_user stock_kanban < backup_20260208_120000.sql
```

---

## 环境变量

### 关键变量说明

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `NODE_ENV` | Node.js 环境 | `production` | `production` |
| `PORT` | 应用监听端口 | `3000` | `3000` |
| `HOST` | 应用监听地址 | `0.0.0.0` | `0.0.0.0` |
| `DATABASE_URL` | 数据库连接字符串 | （自动创建） | `postgresql://user:pass@host:5432/db` |
| `PGSSL` | 是否启用 SSL | `false` | `true` / `false` |
| `ADMIN_SECRET` | 管理员密钥 | （无） | 强随机字符串 |
| `ENABLE_USER_ISOLATION` | 用户隔离 | `false` | `true` / `false` |
| `LOG_LEVEL` | 日志级别 | `info` | `debug` / `info` / `warn` / `error` |

### 生成强密钥

```bash
# 生成随机密钥用于 ADMIN_SECRET
openssl rand -base64 32

# 输出示例: 3x7p9kL2mN8qR4vW6zY1aB9cD5eF7gH2jK4lM6nO8pQ0r
```

---

## 故障排查

### 症状 1：容器无法启动

```bash
# 查看详细日志
docker logs stock-kanban-app

# 常见错误:
# - "ERROR: DATABASE_URL is not valid"
#   → 检查 .env.production 中的 DATABASE_URL
#
# - "Cannot connect to database"
#   → 检查 PostgreSQL 容器是否在运行: docker ps | grep postgres
#
# - "EADDRINUSE: address already in use :::3000"
#   → 端口已被占用，改变 PORT 或杀死占用进程
```

### 症状 2：PostgreSQL 无法连接

```bash
# 检查 PostgreSQL 容器状态
docker ps | grep postgres

# 查看 PostgreSQL 日志
docker logs stock-kanban-pg

# 测试连接
docker run --rm -it --network caddy-net postgres:16-alpine sh -c \
  'psql postgresql://stock_user:stock_pass@stock-kanban-pg:5432/stock_kanban -c "SELECT 1"'

# 如果连接超时，可能是网络问题
# 确保两个容器在同一网络:
docker network inspect caddy-net
```

### 症状 3：Caddy 无法反向代理

```bash
# 检查 Caddy 配置
docker exec caddy cat /etc/caddy/Caddyfile | grep -A 2 stock-kanban

# 重新加载 Caddy
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# 测试直接连接（不通过 Caddy）
curl -s http://localhost:3000/api/watchlists

# 测试通过 Caddy
curl -s https://stockkanban.aixintelligence.com/api/watchlists \
  -H "Host: stockkanban.aixintelligence.com"
```

### 症状 4：部署脚本执行失败

```bash
# 添加调试输出
bash -x stock_kanban_update_and_run.sh

# 逐步执行
source stock_kanban_update_and_run.sh  # 加载函数
log "Testing..."  # 测试日志函数
docker network ls  # 检查网络
```

---

## 监控和日志

### 实时日志

```bash
# 查看最后 100 行
docker logs --tail 100 stock-kanban-app

# 实时跟踪（Ctrl+C 退出）
docker logs --follow stock-kanban-app

# 时间戳
docker logs --timestamps stock-kanban-app

# 看过去 1 小时的日志
docker logs --since 1h stock-kanban-app
```

### 容器统计

```bash
# CPU 和内存使用
docker stats stock-kanban-app --no-stream

# 心跳检查
docker inspect stock-kanban-app | grep -A 5 Health

# 预期输出:
# "Health": {
#     "Status": "healthy",
#     "FailingStreak": 0,
#     "Log": [...]
# }
```

### 自定义日志文件

应用会在 `/app/logs/` 目录写入日志（已挂载到 `./logs/`）：

```bash
# 查看本地日志目录
ls -lh logs/

# 查看日志内容（远程）
docker exec stock-kanban-app tail -f /app/logs/app.log

# 查看日志内容（本地）
tail -f logs/*.log
```

---

## 定期维护任务

### 每周

```bash
# 检查容器日志大小
du -sh logs/

# 检查数据库备份
ls -lh backup_*.sql*

# 清理旧日志（保留 30 天）
find logs/ -type f -mtime +30 -delete
```

### 每月

```bash
# 备份数据库
docker exec stock-kanban-pg pg_dump -U stock_user stock_kanban | bzip2 > backup_$(date +%Y%m%d).sql.bz2

# 测试备份恢复（在测试数据库上）
# ... 确保备份有效

# 检查更新
cd stock_kanban
git pull --dry-run origin main
```

### 生产检查清单

- [ ] 数据库定期备份（至少每周）
- [ ] 日志文件定期清理
- [ ] 磁盘空间监控（`df -h`）
- [ ] 定期更新依赖和安全补丁
- [ ] 监控数据库连接池大小
- [ ] 检查错误日志中的异常模式

---

## 常见命令速查表

```bash
# 查看所有相关容器
docker ps | grep -E "stock-kanban|caddy|postgres"

# 重启应用
./stock_kanban_update_and_run.sh

# 快速更新代码（不重新构建）
# 警告：这会跳过构建步骤，仅在代码确实未改变构建时使用
git pull
docker restart stock-kanban-app

# 查看应用进程
docker exec stock-kanban-app ps aux

# 进入应用容器 shell
docker exec -it stock-kanban-app sh

# 测试数据库连接（来自应用容器）
docker exec stock-kanban-app node -e \
  "const pg = require('pg'); new pg.Client(process.env.DATABASE_URL).connect().then(() => console.log('OK')).catch(e => console.error(e))"

# 清理未使用的 Docker 资源
docker system prune -a
```

---

## 获得帮助

如遇问题，按以下顺序排查：

1. **查看脚本输出**: 部署脚本会显示每一步的状态
2. **检查容器日志**: `docker logs stock-kanban-app`
3. **验证环境变量**: `docker exec stock-kanban-app env | sort`
4. **测试网络连接**: `docker exec stock-kanban-app ping stock-kanban-pg`
5. **查看数据库状态**: `docker exec stock-kanban-pg pg_isready`

---

**最后更新**: 2026-02-08  
**文档版本**: 2.0  
**适用版本**: Stock Kanban v1.0+
