# Stock Kanban - Linux Quick Start

**目标**: 在Linux上一键部署Stock Kanban应用 ⚡

---

## 🚀 快速开始（5分钟）

### 1️⃣ 准备代码

```bash
# SSH 到你的 Linux 服务器
ssh ec2-user@your-server-ip

# 进入项目目录（如果已有，进入该目录；否则克隆）
cd /path/to/stock_kanban
# 或
git clone <your-repo-url> stock_kanban && cd stock_kanban
```

### 2️⃣ 配置环境

```bash
# 复制和编辑配置文件
cp .env.production.example .env.production
nano .env.production
```

**最简配置**（让脚本自动创建 PostgreSQL）：

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
LOG_LEVEL=info
ADMIN_SECRET=$(openssl rand -base64 32)
```

**或者连接到现有 PostgreSQL**（推荐）:

```bash
# 先创建数据库用户（在现有 PostgreSQL 上）
docker exec -it meal_score-db-1 psql -U postgres -c \
  "CREATE USER stock_user WITH ENCRYPTED PASSWORD 'yourpassword'; \
   CREATE DATABASE stock_kanban OWNER stock_user; \
   GRANT ALL PRIVILEGES ON DATABASE stock_kanban TO stock_user;"

# 在 .env.production 中设置
DATABASE_URL=postgresql://stock_user:yourpassword@meal_score-db-1:5432/stock_kanban
PGSSL=false
```

### 3️⃣ 运行部署脚本

```bash
chmod +x stock_kanban_update_and_run.sh
./stock_kanban_update_and_run.sh
```

等待脚本完成，通常需要 2-5 分钟 ⏳

### 4️⃣ 验证部署

```bash
# ✓ 检查容器运行状态
docker ps | grep stock-kanban-app

# ✓ 查看日志
docker logs stock-kanban-app

# ✓ 测试 API
curl http://localhost:3000/api/watchlists

# ✓ 检查 Caddy 反向代理
curl -I https://stockkanban.aixintelligence.com
```

---

## 📋 部署前检查清单

- [ ] SSH 连接到服务器
- [ ] Docker 已安装 (`docker --version`)
- [ ] Git 已安装 (`git --version`)
- [ ] Caddy 容器在运行 (`docker ps | grep caddy`)
- [ ] `caddy-net` 网络存在 (`docker network ls | grep caddy-net`)
- [ ] 有足够磁盘空间 (`df -h`)

---

## 🔧 关键配置选项

| 场景 | 配置 | 适用于 |
|------|------|--------|
| 第一次部署 | 留空 `DATABASE_URL` | 自动创建新的 PostgreSQL 容器 |
| 使用现有 DB | 设置 `DATABASE_URL` | 连接到现有数据库实例 |
| 远程数据库 | RDS/Azure URL | 云托管数据库 |

---

## ⚡ 后续更新

部署完成后，更新只需一条命令：

```bash
cd /path/to/stock_kanban
./stock_kanban_update_and_run.sh
```

会自动：
- 拉取最新代码
- 检查数据库
- 重新构建镜像
- 重启应用

---

## 🐛 快速排查

| 问题 | 解决方案 |
|------|----------|
| 脚本权限不足 | `chmod +x stock_kanban_update_and_run.sh` |
| 容器无法启动 | `docker logs stock-kanban-app` 查看错误 |
| 数据库连接失败 | 检查 `DATABASE_URL` 和 PostgreSQL 容器 |
| 端口冲突 | 改变 `.env.production` 中的 `PORT` |
| Caddy 无法访问 | `docker exec caddy caddy reload --config /etc/caddy/Caddyfile` |

---

## 📚 了解更多

详细文档查看：[LINUX_DEPLOYMENT_GUIDE.md](./LINUX_DEPLOYMENT_GUIDE.md)

---

## 💾 备份数据库

```bash
# 备份
docker exec stock-kanban-pg pg_dump -U stock_user stock_kanban | bzip2 > backup_$(date +%Y%m%d).sql.bz2

# 恢复
docker exec -i stock-kanban-pg psql -U stock_user stock_kanban < backup_20260208.sql.bz2
```

---

## ✅ 部署完成！

你的应用现在应该可以通过以下方式访问：

- **本地API**: http://localhost:3000
- **通过 Caddy**: https://stockkanban.aixintelligence.com

享受你的 Stock Kanban 应用！ 🎉

---

**需要帮助？** 查看详细的故障排查指南：[LINUX_DEPLOYMENT_GUIDE.md#故障排查](./LINUX_DEPLOYMENT_GUIDE.md#故障排查)
