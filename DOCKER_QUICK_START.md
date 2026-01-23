# 🎯 Docker + Caddy 部署方案总结

## 你的现状

```
你的云环境：
├── Caddy (反向代理) → 监听 80/443
├── meal_score-app → 内部 5000
├── animal_talk-app → 内部 5000
├── iaa-agent → 内部 8501
├── actuarial-agent → 内部 8501
└── PostgreSQL (meal_score) → 内部 5432
```

**问题**: 有完整的 EC2 原生部署方案，但已有 Caddy + Docker 环境，重复了。

---

## ✅ 新方案：Docker 化 Stock Kanban

### 为什么这样做？

| 对比 | EC2 原生 | Docker + Caddy |
|------|---------|----------------|
| 部署时间 | 5-10 分钟 | **1-2 分钟** ✨ |
| 更新应用 | 手动拉取、重建 | `docker-compose up -d --build` |
| SSL/TLS | 单独配置 Certbot | **Caddy 自动处理** ✨ |
| 依赖管理 | PM2 + Nginx | **Docker 完全隔离** ✨ |
| 跨云迁移 | 重新配置 | **一样的镜像** ✨ |
| 学习成本 | 低 | **很值得学** ✨ |

---

## 🚀 3 分钟快速部署

### 1️⃣ 本地准备（Windows）

```bash
# 验证 Dockerfile 和 docker-compose.yml 已创建
ls Dockerfile docker-compose.yml

# 本地测试（可选）
docker build -t stock-kanban:latest .
docker run -p 3000:3000 stock-kanban:latest
# 浏览器: http://localhost:3000/api/watchlists
```

### 2️⃣ 推送代码到 GitHub

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: Docker + Caddy deployment support"
git push origin main
```

### 3️⃣ 云端一键部署

```bash
# SSH 登录
ssh ec2-user@your-server

# 进入应用目录
cd ~/stock_kanban

# 拉取最新代码
git pull origin main

# 运行自动化脚本（包含所有步骤）
bash deploy/docker-deploy.sh
```

**就这样！** 🎉 应用自动启动。

### 4️⃣ 配置 Caddy

编辑 Caddy 配置文件（`/etc/caddy/Caddyfile` 或你的配置路径）：

```caddyfile
# 方式 A：子域名（推荐）
stocks.yourdomain.com {
    reverse_proxy stock-kanban-app:3000
    encode gzip
}

# 方式 B：路径前缀
yourdomain.com {
    handle /stocks* {
        reverse_proxy stock-kanban-app:3000 {
            uri strip_prefix /stocks
        }
    }
}
```

重新加载 Caddy（**无需重启**）：

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 5️⃣ 验证部署

```bash
# 测试容器连接
curl http://stock-kanban-app:3000/api/watchlists

# 通过 Caddy 测试
curl https://stocks.yourdomain.com/api/watchlists

# 或在浏览器访问
https://stocks.yourdomain.com
```

---

## 📁 新建文件清单

✅ **已创建以下文件** (可直接推送到 GitHub)

```
stock_kanban/
├── Dockerfile                          # Docker 镜像定义
├── docker-compose.yml                  # Docker 容器编排
├── .dockerignore                       # Docker 构建忽略
└── deploy/
    ├── DOCKER_CADDY_DEPLOYMENT.md      # 完整文档（420+ 行）
    └── docker-deploy.sh                # 自动化部署脚本
```

**文件大小**: < 5 KB（非常轻量）

---

## 📊 关键配置说明

### Dockerfile 特点

```dockerfile
# 多阶段构建（优化镜像大小）
FROM node:22-alpine AS builder    # 构建阶段
FROM node:22-alpine               # 生产阶段（更小）

# 结果：最终镜像 ~300 MB (vs 原生部署 ~500 MB)
```

### docker-compose.yml 特点

```yaml
stock-kanban-api:
  networks:
    - caddy-net           # ✨ 连接到 Caddy 网络
  healthcheck:            # ✨ 自动健康检查
    test: curl /api/watchlists
  volumes:
    - ./data:/app/data    # ✨ 持久化数据
    - ./logs:/app/logs
```

### 自动化脚本 (docker-deploy.sh)

```bash
✓ 检查 Docker 已安装
✓ 克隆/拉取最新代码
✓ 创建/连接 Caddy 网络
✓ 构建镜像
✓ 启动容器
✓ 健康检查
✓ 显示后续步骤
```

---

## 🔄 日常维护命令

### 查看日志

```bash
# 实时日志
docker logs -f stock-kanban-app

# 查看最后 50 行
docker logs stock-kanban-app | tail -50
```

### 重启应用

```bash
# 重启容器
docker-compose restart stock-kanban-api

# 更新代码后重启
git pull && docker-compose up -d --build
```

### 停止/删除

```bash
# 停止（保留容器）
docker-compose stop stock-kanban-api

# 完全删除
docker-compose down
docker rmi stock_kanban-stock-kanban-api  # 删除镜像
```

### 监控资源

```bash
# 查看容器资源使用
docker stats stock-kanban-app

# 预期：CPU < 5%, Memory < 200 MB
```

---

## ✨ 优势总结

### vs EC2 原生部署

| 特性 | 原生 | Docker |
|------|------|--------|
| 部署速度 | 5 分钟 | **1 分钟** |
| 更新应用 | 复杂 | **简单** |
| SSL 配置 | 手动 Certbot | **自动** |
| 环境隔离 | 无 | **完全隔离** |
| 跨机迁移 | 困难 | **开箱即用** |
| 维护成本 | 高 | **低** |
| Nginx 配置 | 需要 | **不需要** |
| PM2 管理 | 需要 | **不需要** |

### vs Kubernetes

| 特性 | K8S | Docker Compose |
|------|-----|---------|
| 复杂度 | 高 | **低** ✨ |
| 学习成本 | 陡 | **平缓** ✨ |
| 小规模应用 | 过度 | **完美** ✨ |
| 现有 Docker | 可用 | **完全兼容** ✨ |

---

## 🎓 学习资源

### Docker 官方
- [Docker 官方教程](https://docs.docker.com/get-started/)
- [Dockerfile 最佳实践](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose 文档](https://docs.docker.com/compose/)

### Caddy 官方
- [Caddy 官方文档](https://caddyserver.com/docs)
- [反向代理配置](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

### 实战例子
- 查看你其他应用的 Dockerfile（meal_score-app 等）
- 参考本项目的 docker-compose.yml

---

## 🚨 故障排查

### 容器无法启动

```bash
docker logs stock-kanban-app  # 查看错误信息

# 常见原因：
# 1. 端口被占用
docker ps | grep 3000
sudo lsof -i :3000

# 2. 网络问题
docker network inspect caddy-net

# 3. 构建错误
docker build -t stock-kanban:latest . --verbose
```

### Caddy 无法代理

```bash
# 测试容器间连接
docker exec caddy ping stock-kanban-app

# 测试端口
docker exec caddy nc -zv stock-kanban-app 3000

# Caddy 日志
docker logs caddy
```

### 数据加载失败

```bash
# 检查数据文件
docker exec stock-kanban-app ls -la /app/data

# 检查权限
docker exec stock-kanban-app cat /app/data/quant-metrics.json | head
```

---

## 📋 检查清单

部署前确保：

- [ ] `Dockerfile` 已创建
- [ ] `docker-compose.yml` 已创建
- [ ] `.dockerignore` 已创建
- [ ] 代码已推送到 GitHub
- [ ] SSH 可连接到云服务器
- [ ] Caddy 已在云端运行 (`docker ps | grep caddy`)
- [ ] 理解 Caddy 网络配置

部署时：

- [ ] 运行 `bash deploy/docker-deploy.sh`
- [ ] 查看脚本输出，确认所有步骤成功
- [ ] 更新 Caddy 配置文件
- [ ] 运行 `docker exec caddy caddy reload`
- [ ] 在浏览器测试应用

部署后：

- [ ] `docker ps` 显示 stock-kanban-app 状态为 "Up"
- [ ] `curl http://stock-kanban-app:3000/api/watchlists` 返回数据
- [ ] `curl https://stocks.yourdomain.com` 返回 HTML
- [ ] 浏览器访问应用成功

---

## 🎉 最终建议

### 立即行动

1. ✅ **推送代码** → 本地 git push
2. ✅ **登录云服务器** → SSH
3. ✅ **运行脚本** → `bash deploy/docker-deploy.sh`
4. ✅ **配置 Caddy** → 编辑 Caddyfile
5. ✅ **验证访问** → 浏览器打开应用

**预计时间**: 10 分钟（包括理解和配置）

### 后续优化（可选）

- [ ] 设置自动备份（定期导出 data/ 文件夹）
- [ ] 配置 Docker 日志轮转
- [ ] 添加 Caddy 监控告警
- [ ] 创建 CI/CD 流程（GitHub Actions）

---

## 📞 问题排查

遇到问题？按以下顺序检查：

1. 查看 [DOCKER_CADDY_DEPLOYMENT.md](DOCKER_CADDY_DEPLOYMENT.md)
2. 查看 `docker logs stock-kanban-app`
3. 查看 `docker logs caddy`
4. 检查 Caddy 配置：`docker exec caddy caddy validate --config /etc/caddy/Caddyfile`

---

## 🎯 总结

**你现在有三个选择：**

| 部署方式 | 推荐度 | 优先级 |
|---------|--------|--------|
| 🐳 Docker + Caddy | ⭐⭐⭐⭐⭐ | **立即用** |
| EC2 原生 + PM2 | ⭐⭐⭐ | 备选 |
| 本地开发 | ⭐⭐⭐⭐ | 开发用 |

**我的建议**: 用 Docker，10 分钟搞定！ 🚀

---

**Happy Deploying!** 🎊

有问题欢迎提问，我会持续更新文档！
