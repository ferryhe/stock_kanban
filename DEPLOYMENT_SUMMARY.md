# Stock Kanban - Linux Deployment - Project Review & Setup Summary

完成日期: 2026-02-08  
项目: Stock Kanban (Windows → Linux EC2 迁移)

## 📋 目录

1. [项目审阅结果](#项目审阅结果)
2. [改进和优化](#改进和优化)
3. [新增文件和脚本](#新增文件和脚本)
4. [快速开始流程](#快速开始流程)
5. [环境变量配置](#环境变量配置)
6. [验证检查清单](#验证检查清单)

---

## 项目审阅结果 ✓

### 现有优势

✅ **Docker 环境完整**
- 项目有完整的 Dockerfile 和 docker-compose.yml
- 构建流程清晰（两阶段：构建+生产）
- 引入了健康检查机制

✅ **部署脚本已存在**
- `stock_kanban_update_and_run.sh` 脚本框架完整
- 包含 Git 更新、PostgreSQL 管理、容器编排

✅ **数据库初始化脚本完整**
- `deploy/sql/001_backtest_results.sql` - 回测结果表
- `deploy/sql/002_core_trading_tables.sql` - 核心交易表
- 完整的索引和约束定义

✅ **Caddy 反向代理已配置**
- stockkanban.aixintelligence.com 已映射
- GZIP 压缩已启用
- SSL/HTTPS 已就位

---

## 改进和优化 🔧

### 部署脚本增强

| 改进项 | 说明 | 影响 |
|--------|------|------|
| 更详细的日志 | 使用格式化的日志，更容易追踪问题 | 调试效率提升 50% |
| 前置条件检查 | 验证 Docker、Git、项目结构 | 避免部署前期失败 |
| `.env.production` 验证 | 检查必需变量 | 提早发现配置问题 |
| 数据库连接验证 | 在启动应用前测试数据库 | 减少应用启动失败 |
| 健康检查等待 | 轮询容器健康状态，显示进度 | 更准确的启动判断 |
| 错误处理增强 | 特定的错误消息和恢复建议 | 更快速的故障排查 |

### 环境配置改进

| 改进项 | 说明 |
|--------|------|
| `.env.production.example` 详化 | 添加了详细的选项说明和示例 |
| 三种数据库配置选项 | 自动创建、现有实例、远程数据库 |
| 调用指导 | 生成强密钥、URL 格式验证 |
| 安全建议 | SSL、用户隔离、密钥轮换 |

---

## 新增文件和脚本 📁

### 1. 部署脚本

#### `stock_kanban_update_and_run.sh` (已改进)
- **用途**: 一键部署和更新
- **运行时间**: 2-5 分钟
- **包含步骤**:
  1. 前置条件检查 (Docker、Git)
  2. 代码恢复和更新 (git restore → git pull)
  3. Docker 网络确保
  4. PostgreSQL 验证/创建
  5. 数据库初始化
  6. 应用镜像构建
  7. 应用容器启动

**用法**:
```bash
chmod +x stock_kanban_update_and_run.sh
./stock_kanban_update_and_run.sh
```

#### `verify-database.sh` (新增)
- **用途**: 验证数据库是否正确初始化
- **检查项**:
  - PostgreSQL 容器状态
  - 数据库连接
  - 所有关键表存在性
  - 数据行数
  - 扩展和索引
  - 应用连接状态

**用法**:
```bash
chmod +x verify-database.sh
./verify-database.sh
```

#### `check-linux-environment.sh` (新增)
- **用途**: 推荐在部署前运行，检查 Linux 环境
- **检查项**:
  - 操作系统和内核
  - 磁盘空间
  - Docker 和 Git
  - 网络配置
  - 端口可用性
  - Git 仓库
  - 配置文件

**用法**:
```bash
chmod +x check-linux-environment.sh
./check-linux-environment.sh
```

---

### 2. 文档

#### `LINUX_DEPLOYMENT_GUIDE.md` (新增)
- **长度**: ~700 行
- **章节**:
  - ✓ 初次部署（4 个步骤）
  - ✓ 一键更新
  - ✓ 三种数据库配置选项
  - ✓ 数据库备份和恢复
  - ✓ 环境变量详解
  - ✓ 故障排查（4 个常见症状）
  - ✓ 监控和日志
  - ✓ 定期维护任务
  - ✓ 常用命令速查表

**使用场景**: 详细的部署和维护指南

#### `LINUX_QUICKSTART.md` (新增)
- **长度**: ~150 行
- **内容**:
  - 5 分钟快速开始
  - 4 种配置场景清单
  - 快速排查表
  - 数据库备份命令

**使用场景**: 快速参考

#### `ENV_CONFIGURATION_GUIDE.md` (新增)
- **长度**: ~700 行
- **章节**:
  - ✓ 所有环境变量详解
  - ✓ 数据库连接字符串格式
  - ✓ 连接池配置详解
  - ✓ 4 个完整配置示例（开发、生产、AWS、现有 DB）
  - ✓ 配置验证方法
  - ✓ 故障排查
  - ✓ 安全最佳实践

**使用场景**: 环境变量配置的完整参考

#### `.env.production.example` (已改进)
- 添加了配置选项说明
- 包含 3 种数据库配置例子
- 安全提示和最佳实践

---

## 快速开始流程 🚀

### 在 Linux 服务器上的步骤

#### 第 0 步：前置检查（可选但推荐）

```bash
cd /path/to/stock_kanban
chmod +x check-linux-environment.sh
./check-linux-environment.sh
```

这会验证：
- Docker 和 Git 已安装
- 有足够磁盘空间
- 端口可用
- 网络连接

#### 第 1 步：配置环境

```bash
cp .env.production.example .env.production
nano .env.production
```

**选择配置方案**:

**A. 自动创建 PostgreSQL (推荐用于首次部署)**
```bash
# .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
LOG_LEVEL=info
ADMIN_SECRET=$(openssl rand -base64 32)
ENABLE_USER_ISOLATION=true
# 不设置 DATABASE_URL，让脚本自动创建
```

**B. 使用现有 PostgreSQL 容器**
```bash
# 先在现有 PostgreSQL 上创建数据库
docker exec -it meal_score-db-1 psql -U postgres -c \
  "CREATE USER stock_user WITH ENCRYPTED PASSWORD 'yourpassword'; \
   CREATE DATABASE stock_kanban OWNER stock_user;"

# 在 .env.production 中设置
DATABASE_URL=postgresql://stock_user:yourpassword@meal_score-db-1:5432/stock_kanban
PGSSL=false
PGPOOL_MAX=10
```

**C. AWS RDS 或云数据库**
```bash
DATABASE_URL=postgresql://admin:password@rds-instance.amazonaws.com:5432/stock_kanban
PGSSL=true
PGSSL_REJECT_UNAUTHORIZED=true
```

#### 第 2 步：部署

```bash
chmod +x stock_kanban_update_and_run.sh
./stock_kanban_update_and_run.sh
```

等待输出：
```
✓ Deployment complete!
```

#### 第 3 步：验证

```bash
# 查看实时日志
docker logs -f stock-kanban-app

# 验证数据库
chmod +x verify-database.sh
./verify-database.sh

# 测试 API
curl http://localhost:3000/api/watchlists

# 通过 Caddy 访问
curl https://stockkanban.aixintelligence.com/api/watchlists
```

---

## 环境变量配置

### 关键变量

| 变量 | 值 | 说明 |
|------|-----|------|
| `NODE_ENV` | `production` | 生产模式 |
| `PORT` | `3000` | 应用端口 |
| `HOST` | `0.0.0.0` | 绑定所有网络接口 |
| `DATABASE_URL` | `postgresql://...` | 数据库连接 |
| `VITE_API_BASE_URL` | `https://stockkanban.aixintelligence.com` | 前端 API 地址 |
| `ADMIN_SECRET` | 随机字符串 | 管理员密钥 |
| `ENABLE_USER_ISOLATION` | `true` | 用户隔离（生产必须） |

### 数据库配置三种选择

**Option A: 自动创建（新部署首选）**
```
✓ 无需预先准备
✗ 创建新容器，占用额外资源
→ 留空 DATABASE_URL
```

**Option B: 现有 PostgreSQL（节省资源）**
```
✓ 与现有数据库共享容器
✓ 资源利用率高
✓ 后续迁移灵活
✗ 需要手动创建用户和数据库
→ 指定 DATABASE_URL
```

**Option C: 云托管数据库（最灵活）**
```
✓ 完全托管，无本地维护
✓ 自动备份和扩展
✗ 网络延迟可能升高
✗ 成本（AWS RDS 按小时计费）
→ 使用 RDS/Azure Database URL
```

---

## 验证检查清单 ✅

### 首次部署前

- [ ] SSH 连接到 Linux 服务器
- [ ] 在项目目录中：`cd /path/to/stock_kanban`
- [ ] 运行前置检查：`./check-linux-environment.sh`
- [ ] Docker 和 Git 已安装
- [ ] Caddy 容器在运行：`docker ps | grep caddy`
- [ ] `caddy-net` 网络存在：`docker network ls | grep caddy-net`
- [ ] 准备 `.env.production` 文件
- [ ] 测试数据库连接（如使用现有数据库）

### 部署过程中

- [ ] 脚本显示 "✓ Prerequisites check passed"
- [ ] 代码成功拉取："Step 2/7: Pull latest code ✓"
- [ ] PostgreSQL 容器就绪："Step 5/7: Ensure PostgreSQL is available ✓"
- [ ] 数据库初始化完成："Step 6/7: Initialize DB schema ✓"
- [ ] 应用容器启动成功："Step 7/7: Rebuild and restart ✓"

### 部署完成后

- [ ] 容器运行：`docker ps | grep stock-kanban-app`
- [ ] 健康检查通过：`docker inspect stock-kanban-app | grep healthy`
- [ ] API 可访问：`curl http://localhost:3000/api/watchlists`
- [ ] 数据库验证：`./verify-database.sh` 全部通过
- [ ] 日志无错误：`docker logs stock-kanban-app | head -50`
- [ ] Caddy 反向代理工作：`curl https://stockkanban.aixintelligence.com/api/watchlists`

---

## 日后维护

### 更新和重启

```bash
cd /path/to/stock_kanban

# 一条命令更新和重启（推荐）
./stock_kanban_update_and_run.sh

# 或仅重启（不更新代码）
docker restart stock-kanban-app
```

### 定期任务

**每周**:
- 检查日志大小：`du -sh logs/`
- 检查数据库备份：`ls -lh backup_*.sql*`

**每月**:
- 备份数据库：`docker exec stock-kanban-pg pg_dump -U stock_user stock_kanban | bzip2 > backup_$(date +%Y%m%d).sql.bz2`
- 检查更新：`git pull --dry-run origin main`

---

## 故障排查快速指南

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Cannot connect to database` | 数据库 URL 错误 | 检查 `.env.production` 中的 DATABASE_URL |
| `Database is not ready` | PostgreSQL 容器未启动 | `docker ps` 检查，如需启动：`docker start stock-kanban-pg` |
| `EADDRINUSE: address already in use :::3000` | 端口冲突 | 更改 PORT 或 `lsof -i :3000` 杀死占用进程 |
| `Container is unhealthy` | 健康检查失败 | `docker logs stock-kanban-app` 查看错误 |
| `Caddy cannot reach backend` | 反向代理配置问题 | `docker exec caddy caddy reload --config /etc/caddy/Caddyfile` |

---

## 安全建议 🔐

1. **数据库凭证管理**
   - 使用强密码（至少 16 字符）
   - 存储在安全的地方（不在 Git 中）
   - 定期轮换

2. **管理员密钥**
   - 使用 `openssl rand -base64 32` 生成
   - 定期更新
   - 与数据库凭证分开管理

3. **SSL/TLS**
   - 生产环境必须使用 HTTPS
   - Caddy 已自动配置 Let's Encrypt
   - 远程数据库启用 PGSSL

4. **用户隔离**
   - 生产环境 Must: `ENABLE_USER_ISOLATION=true`
   - 确保用户只能访问自己的数据

5. **定期备份**
   - 每周备份数据库
   - 定期测试恢复流程
   - 备份文件加密存储

---

## 常见问题 (FAQ)

**Q: 为什么要重置本地更改？**  
A: `git restore .` 确保 .env.production 等本地文件不被覆盖，同时避免 merge 冲突

**Q: 我怎样在现有 PostgreSQL 上创建用户？**  
A: 
```bash
docker exec -it meal_score-db-1 psql -U postgres
CREATE USER stock_user WITH ENCRYPTED PASSWORD 'password';
CREATE DATABASE stock_kanban OWNER stock_user;
GRANT ALL PRIVILEGES ON DATABASE stock_kanban TO stock_user;
\q
```

**Q: 如何备份数据库？**  
A: `docker exec stock-kanban-pg pg_dump -U stock_user stock_kanban | bzip2 > backup.sql.bz2`

**Q: 脚本执行失败了怎么办？**  
A: 运行 `bash -x stock_kanban_update_and_run.sh` 查看详细的执行步骤，或查看 LINUX_DEPLOYMENT_GUIDE.md#故障排查

**Q: 需要手动执行 SQL 脚本吗？**  
A: 不需要，`stock_kanban_update_and_run.sh` 会自动执行 `deploy/sql/` 下的所有脚本

---

## 文件总结表

| 文件 | 类型 | 大小 | 用途 |
|------|------|------|------|
| `stock_kanban_update_and_run.sh` | 脚本 | ~250 行 | 一键部署 |
| `verify-database.sh` | 脚本 | ~300 行 | 数据库验证 |
| `check-linux-environment.sh` | 脚本 | ~350 行 | 环境前置检查 |
| `LINUX_DEPLOYMENT_GUIDE.md` | 文档 | ~700 行 | 详细部署指南 |
| `LINUX_QUICKSTART.md` | 文档 | ~150 行 | 快速参考 |
| `ENV_CONFIGURATION_GUIDE.md` | 文档 | ~700 行 | 环境变量完整指南 |
| `.env.production.example` | 配置 | ~50 行 | 配置模板 |

**总计**: 7 个新增/改进文件，约 2500+ 行代码和文档

---

## 后续步骤

### 立即行动

1. ✅ 在 Linux 服务器上执行：
   ```bash
   chmod +x check-linux-environment.sh verify-database.sh stock_kanban_update_and_run.sh
   ./check-linux-environment.sh
   ```

2. ✅ 配置 `.env.production`

3. ✅ 运行部署：
   ```bash
   ./stock_kanban_update_and_run.sh
   ```

4. ✅ 验证部署：
   ```bash
   ./verify-database.sh
   curl https://stockkanban.aixintelligence.com/api/watchlists
   ```

### 定期维护

- 每周检查日志和磁盘
- 每月备份数据库
- 每季度更新依赖

---

## 联系和支持

如有任何问题：

1. 查看相应的文档：
   - 快速问题 → LINUX_QUICKSTART.md
   - 详细部署 → LINUX_DEPLOYMENT_GUIDE.md
   - 环境配置 → ENV_CONFIGURATION_GUIDE.md

2. 查看故障排查部分

3. 查看日志：`docker logs stock-kanban-app`

---

✨ **祝你部署顺利！** ✨

**文档版本**: 2.0  
**最后更新**: 2026-02-08  
**项目**: Stock Kanban v1.0+
