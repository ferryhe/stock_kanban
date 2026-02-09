# 📋 Next Steps - Linux Deployment Preparation

你的项目已审阅并优化完毕。以下是在 Linux 上部署前的清单。

---

## ✅ 已完成的工作

我为你的项目进行了以下改进：

### 1. 部署脚本增强 (stock_kanban_update_and_run.sh)
- ✅ 更详细的日志和进度提示
- ✅ 前置条件验证（Docker、Git、项目结构）
- ✅ 数据库连接检查
- ✅ 容器健康状态等待和验证
- ✅ 更好的错误处理和恢复建议

### 2. 新增辅助脚本
- ✅ `verify-database.sh` - 验证 PostgreSQL 和表初始化
- ✅ `check-linux-environment.sh` - 部署前环境检查

### 3. 完整的部署文档
- ✅ `LINUX_QUICKSTART.md` - 5分钟快速开始指南
- ✅ `LINUX_DEPLOYMENT_GUIDE.md` - 700+ 行详细指南
- ✅ `ENV_CONFIGURATION_GUIDE.md` - 环境变量完整参考
- ✅ `DEPLOYMENT_SUMMARY.md` - 项目审阅总结

### 4. 配置文件
- ✅ `.env.production.example` 改进 - 添加选项说明和示例

---

## 📦 在 Linux 服务器上部署

### 第一次部署（约 10 分钟）

#### 步骤 1: 连接到服务器并进入项目目录

```bash
ssh ec2-user@your-server-ip
cd /path/to/stock_kanban
```

#### 步骤 2: 运行环境检查（可选但推荐）

```bash
chmod +x check-linux-environment.sh
./check-linux-environment.sh
```

这会检查：
- ✓ Docker 是否安装
- ✓ Git 是否安装  
- ✓ 磁盘空间是否充足
- ✓ 网络连接是否正常
- ✓ 所需配置文件是否存在

#### 步骤 3: 配置环境变量

```bash
cp .env.production.example .env.production
nano .env.production
```

**选择一种配置方式**:

**方案 A: 让脚本自动创建 PostgreSQL 容器（最简单）**
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
LOG_LEVEL=info
ADMIN_SECRET=$(openssl rand -base64 32)
ENABLE_USER_ISOLATION=true
# 不配置 DATABASE_URL，留给脚本处理
```

**方案 B: 使用现有的 PostgreSQL 容器（推荐，节省资源）**
```bash
# 首先，在现有 PostgreSQL 容器中创建数据库用户
docker exec -it meal_score-db-1 psql -U postgres -c \
  "CREATE USER stock_user WITH ENCRYPTED PASSWORD 'your_password'; \
   CREATE DATABASE stock_kanban OWNER stock_user; \
   GRANT ALL PRIVILEGES ON DATABASE stock_kanban TO stock_user;"

# 然后在 .env.production 中配置
DATABASE_URL=postgresql://stock_user:your_password@meal_score-db-1:5432/stock_kanban
PGSSL=false
PGPOOL_MAX=10
PGPOOL_IDLE_TIMEOUT_MS=30000

NODE_ENV=production
PORT=3000
HOST=0.0.0.0
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
LOG_LEVEL=info
ADMIN_SECRET=$(openssl rand -base64 32)
ENABLE_USER_ISOLATION=true
```

**方案 C: 使用云数据库（AWS RDS、Azure Database 等）**
```bash
DATABASE_URL=postgresql://admin:password@your-db-host.amazonaws.com:5432/stock_kanban
PGSSL=true
PGSSL_REJECT_UNAUTHORIZED=true

# ... 其它配置同上
```

详见: [ENV_CONFIGURATION_GUIDE.md](./ENV_CONFIGURATION_GUIDE.md)

#### 步骤 4: 运行部署脚本

```bash
chmod +x stock_kanban_update_and_run.sh
./stock_kanban_update_and_run.sh
```

脚本会自动：
- ✓ 更新代码
- ✓ 创建或连接数据库
- ✓ 初始化数据表
- ✓ 构建 Docker 镜像
- ✓ 启动应用容器

预期时间：2-5 分钟

#### 步骤 5: 验证部署

```bash
# 查看实时日志
docker logs -f stock-kanban-app

# 验证数据库初始化
chmod +x verify-database.sh
./verify-database.sh

# 测试 API
curl http://localhost:3000/api/watchlists

# 通过 Caddy 访问
curl https://stockkanban.aixintelligence.com/api/watchlists
```

---

## 🔄 后续更新

部署完成后，每次更新只需一条命令：

```bash
cd /path/to/stock_kanban
./stock_kanban_update_and_run.sh
```

会自动：
- 拉取最新代码
- 检查数据库连接
- 重新构建镜像
- 重启应用

---

## 📚 文档导航

根据你的需求选择合适的文档：

| 文档 | 用途 | 长度 |
|------|------|------|
| [LINUX_QUICKSTART.md](./LINUX_QUICKSTART.md) | 快速开始和常用命令 | 5 分钟阅读 |
| [LINUX_DEPLOYMENT_GUIDE.md](./LINUX_DEPLOYMENT_GUIDE.md) | 详细的部署和维护指南 | 20 分钟阅读 |
| [ENV_CONFIGURATION_GUIDE.md](./ENV_CONFIGURATION_GUIDE.md) | 所有环境变量的详解 | 15 分钟阅读 |
| [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) | 项目审阅和改进总结 | 10 分钟阅读 |

---

## ❓ 常见问题

### Q: 脚本需要多长时间运行？
A: 首次部署约 2-5 分钟（取决于网络速度和磁盘 I/O）。后续更新更快。

### Q: 如何选择数据库方案？
A: 
- **新用户**: 方案 A（自动创建）最简单
- **要节省资源**: 方案 B（使用现有容器）
- **需要高可用性**: 方案 C（云数据库）

### Q: 脚本会删除现有数据吗？
A: 不会。脚本只创建新表或更新现有表结构，不删除数据。

### Q: 如何回滚如果出现问题？
A: 容器可以随时停止和删除，数据在 PostgreSQL 中保留。只需修复配置后重新运行脚本。

### Q: 是否需要手动配置 Caddy？
A: 不需要。Caddy 已经配置了 `stockkanban.aixintelligence.com` → `stock-kanban-app:3000` 的反向代理。

---

## 🚨 需要帮助？

按以下顺序排查问题：

1. **检查环境** → 运行 `./check-linux-environment.sh`
2. **查看日志** → `docker logs stock-kanban-app`
3. **验证数据库** → `./verify-database.sh`
4. **查看文档** → 参考对应的故障排查章节
5. **检查代码** → 查看脚本中的注释和日志输出

---

## 🔐 安全建议

部署前请注意：

- [ ] 生成强 ADMIN_SECRET: `openssl rand -base64 32`
- [ ] 数据库密码至少 16 字符
- [ ] 启用 ENABLE_USER_ISOLATION=true（生产环境必须）
- [ ] 定期备份数据库：`docker exec stock-kanban-pg pg_dump -U stock_user stock_kanban | bzip2 > backup.sql.bz2`
- [ ] 定期检查日志异常
- [ ] 限制数据库访问（防火墙规则）

---

## ✨ 你现在可以做的

1. **测试脚本** (在 Linux 上)
   ```bash
   chmod +x check-linux-environment.sh
   ./check-linux-environment.sh
   ```

2. **准备配置文件** (使用下列任一方式)
   ```bash
   cp .env.production.example .env.production
   nano .env.production
   ```

3. **运行部署**
   ```bash
   ./stock_kanban_update_and_run.sh
   ```

4. **验证成功**
   ```bash
   curl https://stockkanban.aixintelligence.com/api/watchlists
   ```

---

## 🎯 预期结果

部署完成后，你应该能够：

✅ 通过 HTTPS 访问: https://stockkanban.aixintelligence.com  
✅ 查看回测历史  
✅ 运行实时模拟交易  
✅ 所有数据持久化到 PostgreSQL  
✅ 一键更新和重启  

---

## 📞 长期支持

部署后的常用命令：

```bash
# 查看日志
docker logs -f stock-kanban-app

# 重启应用
docker restart stock-kanban-app

# 完整更新
./stock_kanban_update_and_run.sh

# 进入应用容器 shell
docker exec -it stock-kanban-app sh

# 检查容器状态
docker ps | grep stock-kanban
docker stats stock-kanban-app
```

---

**现在你已准备就绪！** 🚀

下一步: [LINUX_QUICKSTART.md](./LINUX_QUICKSTART.md)
