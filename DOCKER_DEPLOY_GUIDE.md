# 🎯 Stock Kanban Docker + Caddy 部署指南

> 你现在拥有完整的 Docker 化部署方案！本文是快速参考指南。

---

## 🚀 3 步快速开始

### Step 1: 本地推送代码

```bash
# 在你的 Windows 机器上
cd c:\Projects\stock_kanban

# 确认所有文件已添加
git status

# 提交新增文件
git add Dockerfile docker-compose.yml .dockerignore deploy/docker-*.sh DOCKER_QUICK_START.md DEPLOYMENT_SUMMARY.md

git commit -m "feat: Add Docker + Caddy deployment support

- Add Dockerfile for multi-stage build
- Add docker-compose.yml for orchestration
- Add automated deployment scripts
- Add comprehensive documentation"

git push origin main
```

### Step 2: 云端部署（一键）

```bash
# SSH 登录你的 EC2
ssh ec2-user@your-server

# 进入项目目录
cd ~/stock_kanban

# 拉取最新代码
git pull origin main

# 运行自动化部署脚本
bash deploy/docker-deploy.sh

# 脚本会自动：
# ✓ 检查 Docker 是否安装
# ✓ 拉取最新代码
# ✓ 创建 Caddy 网络（如需要）
# ✓ 构建镜像
# ✓ 启动容器
# ✓ 进行健康检查
```

### Step 3: 配置 Caddy

```bash
# 在 EC2 上编辑 Caddy 配置文件
sudo nano /etc/caddy/Caddyfile

# 添加以下内容（选择一种方式）：

# === 方式 A：子域名（推荐） ===
stocks.yourdomain.com {
    reverse_proxy stock-kanban-app:3000
    encode gzip
}

# === 或方式 B：路径前缀 ===
yourdomain.com {
    handle /stocks* {
        reverse_proxy stock-kanban-app:3000 {
            uri strip_prefix /stocks
        }
    }
}

# 保存（Ctrl+O, Enter, Ctrl+X）

# 重新加载 Caddy（无需停止）
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# 验证配置
curl https://stocks.yourdomain.com  # 或你配置的地址
```

---

## 📁 新增文件说明

### 核心配置文件

| 文件 | 用途 | 大小 |
|------|------|------|
| **Dockerfile** | Docker 镜像定义 | 25 行 |
| **docker-compose.yml** | 容器编排配置 | 35 行 |
| **.dockerignore** | 构建时忽略的文件 | 20 行 |

### 部署脚本

| 脚本 | 用途 | 何时用 |
|------|------|--------|
| **deploy/docker-deploy.sh** | 自动化部署 | 云端执行 |
| **deploy/docker-check.sh** | 环境检查 | 部署前检查 |

### 文档

| 文档 | 内容 | 阅读时间 |
|------|------|---------|
| **DOCKER_QUICK_START.md** | 快速入门指南 | 5 分钟 |
| **DOCKER_CADDY_DEPLOYMENT.md** | 完整部署指南 | 20 分钟 |
| **DEPLOYMENT_SUMMARY.md** | 方案总结对比 | 10 分钟 |

---

## 🎯 关键要点

### Dockerfile 的特点
```dockerfile
# 1. 多阶段构建（优化镜像大小）
FROM node:22-alpine AS builder    # 构建阶段
FROM node:22-alpine               # 生产阶段

# 2. 结果：轻量级镜像 (~300 MB)

# 3. 启动命令：node dist/server/index.js
```

### docker-compose.yml 的配置
```yaml
# 1. 连接到 caddy-net 网络
networks:
  - caddy-net

# 2. 暴露端口 3000 给 Caddy
expose:
  - 3000

# 3. 健康检查（每 30 秒检查一次）
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/watchlists"]

# 4. 持久化数据
volumes:
  - ./data:/app/data
  - ./logs:/app/logs

# 5. 自动重启
restart: unless-stopped
```

### 网络架构
```
┌──────────────────────────────────────┐
│           Internet (HTTPS)           │
└─────────────────┬────────────────────┘
                  │
            ┌─────▼──────┐
            │   Caddy    │
            │  :80, :443 │
            └─────┬──────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
    ┌───▼──┐  ┌──▼───┐  ┌─▼────┐
    │ Stock│  │Meal  │  │IA    │
    │ Kan- │  │Score │  │Agent │
    │ ban  │  │      │  │      │
    │:3000 │  │:5000 │  │:8501 │
    └──────┘  └──────┘  └──────┘
    
    所有容器在 caddy-net 网络中
```

---

## 💻 常用命令参考

### 容器管理

```bash
# 查看容器状态
docker ps | grep stock-kanban

# 查看容器日志（实时）
docker logs -f stock-kanban-app

# 查看最后 100 行日志
docker logs stock-kanban-app --tail 100

# 重启容器
docker-compose restart stock-kanban-api

# 停止容器
docker-compose stop stock-kanban-api

# 启动容器
docker-compose start stock-kanban-api

# 完全移除容器
docker-compose down
docker rmi stock_kanban-stock-kanban-api
```

### 应用更新

```bash
# 更新应用流程
git pull origin main          # 拉取最新代码
docker-compose up -d --build  # 重新构建并启动

# 或单行命令
cd ~/stock_kanban && git pull && docker-compose up -d --build
```

### 网络和连接测试

```bash
# 测试容器间连接
docker exec caddy ping stock-kanban-app

# 测试端口
docker exec caddy nc -zv stock-kanban-app 3000

# 测试 API
docker exec stock-kanban-app curl http://localhost:3000/api/watchlists

# 通过 Caddy 测试（在主机上）
curl https://stocks.yourdomain.com/api/watchlists
```

### 监控和诊断

```bash
# 查看容器资源使用
docker stats stock-kanban-app

# 预期：
# CPU: < 5%
# Memory: < 200 MB
# Network I/O: 取决于流量

# 查看 Caddy 日志
docker logs caddy

# 检查 Caddy 配置
docker exec caddy caddy list-modules
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
```

### 调试

```bash
# 进入容器内部进行调试
docker exec -it stock-kanban-app sh

# 在容器内检查文件
ls -la /app
cat /app/data/quant-metrics.json | head -20

# 检查环境变量
env | grep NODE

# 查看进程
ps aux
```

---

## 🔍 故障排查

### 容器无法启动

```bash
# 1. 查看错误日志
docker logs stock-kanban-app

# 2. 常见错误和解决方案

# 错误：bind: address already in use
# 解决：删除已有容器
docker-compose down
docker rmi stock_kanban-stock-kanban-api

# 错误：network caddy-net not found
# 解决：创建网络
docker network create caddy-net

# 错误：npm install failed
# 解决：清除构建缓存并重建
docker-compose build --no-cache
docker-compose up -d
```

### Caddy 无法代理

```bash
# 1. 检查网络连接
docker exec caddy ping stock-kanban-app

# 2. 检查 Caddy 配置
docker exec caddy caddy validate --config /etc/caddy/Caddyfile

# 3. 查看 Caddy 日志
docker logs caddy | tail -20

# 4. 测试直接连接
docker exec caddy curl http://stock-kanban-app:3000/api/watchlists

# 5. 如果以上都好，重新加载 Caddy
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 应用性能问题

```bash
# 1. 检查内存使用
docker stats stock-kanban-app

# 2. 检查日志中是否有错误
docker logs stock-kanban-app | grep -i error

# 3. 检查磁盘空间
df -h

# 4. 重启容器
docker-compose restart stock-kanban-api
```

---

## 📊 性能指标

### 预期资源占用

| 指标 | 值 |
|------|-----|
| 构建时间 | 2-5 分钟（首次），< 30 秒（缓存） |
| 镜像大小 | ~300 MB |
| 容器启动时间 | 3-5 秒 |
| 运行时内存 | 100-200 MB |
| CPU 占用 | < 5% (idle) |
| 数据库（无） | N/A |

### 可扩展性

当前：
- 单容器实例
- 同步 API
- JSON 文件存储

未来升级选项：
- 多容器实例（Nginx 负载均衡）
- 数据库（PostgreSQL）
- 消息队列（Redis）
- Kubernetes（大规模）

---

## 🎓 学习资源

### 必读文档（按优先级）

1. **本文档** (你现在读的)
   - 快速参考
   - 常用命令

2. **DOCKER_QUICK_START.md**
   - 快速开始指南
   - 部署步骤详解

3. **DOCKER_CADDY_DEPLOYMENT.md**
   - 完整部署指南
   - 故障排查详情
   - Caddy 配置示例

4. **DEPLOYMENT_SUMMARY.md**
   - 方案对比
   - 为什么选择 Docker

### 外部资源

- [Docker 官方教程](https://docs.docker.com/get-started/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Caddy 官方文档](https://caddyserver.com/docs/)
- [Caddy 反向代理配置](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

---

## ✅ 部署检查清单

### 推送前（Windows）
- [ ] `Dockerfile` 已创建
- [ ] `docker-compose.yml` 已创建
- [ ] `.dockerignore` 已创建
- [ ] `deploy/docker-deploy.sh` 已创建
- [ ] `deploy/docker-check.sh` 已创建
- [ ] 文档已更新（README.md）
- [ ] 代码已 git 提交
- [ ] 代码已推送到 GitHub

### 部署中（EC2）
- [ ] SSH 成功连接
- [ ] `git pull origin main` 完成
- [ ] `bash deploy/docker-deploy.sh` 执行
- [ ] 脚本输出显示成功
- [ ] 容器状态为 "Up"
- [ ] `docker logs stock-kanban-app` 无错误

### 部署后（EC2）
- [ ] Caddy 配置已编辑
- [ ] `docker exec caddy caddy reload` 完成
- [ ] `curl https://stocks.yourdomain.com` 返回 HTML
- [ ] 浏览器可以访问应用
- [ ] 数据正常加载显示

---

## 🚨 紧急情况处理

### 应用崩溃

```bash
# 1. 立即查看日志
docker logs stock-kanban-app

# 2. 重启容器
docker-compose restart stock-kanban-api

# 3. 如果仍然崩溃，删除重建
docker-compose down
docker rmi stock_kanban-stock-kanban-api
docker-compose up -d
```

### Caddy 无法访问

```bash
# 1. 检查 Caddy 状态
docker ps | grep caddy

# 2. 查看 Caddy 日志
docker logs caddy

# 3. 重启 Caddy（如果已停止）
docker start caddy

# 4. 验证配置
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
```

### 磁盘空间不足

```bash
# 1. 清理 Docker 未使用的资源
docker system prune -a

# 2. 删除旧的构建缓存
docker builder prune

# 3. 如果仍然不足，查看占用最多的镜像
docker images --format "table {{.Repository}}\t{{.Size}}"

# 4. 删除不需要的镜像
docker rmi image-name
```

---

## 💡 Pro Tips

### 1. 快速更新应用
```bash
# 一行命令更新
cd ~/stock_kanban && git pull && docker-compose up -d --build && docker logs -f stock-kanban-app
```

### 2. 自动备份
```bash
# 添加到 crontab（每天备份一次）
0 2 * * * tar -czf /backup/stock-kanban-$(date +\%Y\%m\%d).tar.gz ~/stock_kanban/data/
```

### 3. 监控容器
```bash
# 在另一个终端持续监控
watch -n 1 'docker stats --no-stream stock-kanban-app'
```

### 4. 快速测试 API
```bash
# 创建别名（在 ~/.bashrc 中）
alias test-stock='curl http://localhost:3000/api/watchlists | jq'

# 然后使用
test-stock
```

---

## 🎉 部署完成后

### 验证清单

```bash
# 应用可访问
curl https://stocks.yourdomain.com

# API 正常工作
curl https://stocks.yourdomain.com/api/watchlists | jq

# 容器健康
docker ps | grep stock-kanban-app  # Status 应该是 "Up"

# 日志无错误
docker logs stock-kanban-app | grep -i error  # 应该无输出

# 资源使用正常
docker stats stock-kanban-app  # 看一眼 CPU 和内存
```

### 后续维护

1. **定期备份数据**
   ```bash
   tar -czf backup_$(date +%Y%m%d).tar.gz ~/stock_kanban/data/
   ```

2. **监控应用日志**
   ```bash
   docker logs -f stock-kanban-app
   ```

3. **定期检查更新**
   ```bash
   cd ~/stock_kanban && git fetch origin
   git log --oneline -5 origin/main
   ```

4. **定期清理 Docker**
   ```bash
   docker system prune -a --volumes
   ```

---

## 📞 获取帮助

### 问题排查流程

1. **查看日志**
   ```bash
   docker logs stock-kanban-app  # 应用日志
   docker logs caddy             # Caddy 日志
   ```

2. **检查文档**
   - [DOCKER_CADDY_DEPLOYMENT.md](deploy/DOCKER_CADDY_DEPLOYMENT.md) - 故障排查部分
   - [DOCKER_QUICK_START.md](DOCKER_QUICK_START.md) - 常见问题

3. **检查配置**
   ```bash
   docker-compose config  # 检查 docker-compose.yml
   docker exec caddy caddy validate --config /etc/caddy/Caddyfile  # 检查 Caddy 配置
   ```

4. **重启一切**
   ```bash
   docker-compose restart stock-kanban-api
   docker exec caddy caddy reload
   ```

---

## 🎯 总结

✅ **完整的部署方案已就绪！**

| 环节 | 状态 |
|------|------|
| 本地开发 | ✅ 完成 |
| Docker 配置 | ✅ 完成 |
| 部署脚本 | ✅ 完成 |
| 文档 | ✅ 完成 |
| EC2 原生备选方案 | ✅ 可用 |

**推荐流程**：
1. 本地推送代码到 GitHub
2. SSH 连接到 EC2
3. 运行 `bash deploy/docker-deploy.sh`
4. 编辑 Caddy 配置
5. 重新加载 Caddy
6. 访问应用

**预计总时间**: 10-15 分钟

**难度级别**: ⭐⭐ (简单!)

---

**现在就开始部署吧！** 🚀

有任何问题，查看 [DOCKER_CADDY_DEPLOYMENT.md](deploy/DOCKER_CADDY_DEPLOYMENT.md) 的详细说明。
