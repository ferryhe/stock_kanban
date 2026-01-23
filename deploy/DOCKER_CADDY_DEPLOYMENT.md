# 📋 Caddy 配置片段 - Stock Kanban

## 选项 1：子域名方式（推荐）

```caddyfile
# 在你的 Caddyfile 中添加：

stocks.yourdomain.com {
    reverse_proxy stock-kanban-app:3000
    encode gzip
    header {
        -Server
        X-Content-Type-Options "nosniff"
    }
}
```

**使用场景**：如果你有主域名，可以为 stock_kanban 分配子域名

---

## 选项 2：路径前缀方式

```caddyfile
yourdomain.com {
    # 现有配置...
    
    # Stock Kanban
    handle /stocks/* {
        reverse_proxy stock-kanban-app:3000 {
            uri strip_prefix /stocks
        }
    }
    
    # Stock API
    handle /stocks/api/* {
        reverse_proxy stock-kanban-app:3000
    }
}
```

**使用场景**：所有应用都在同一个域名下的不同路径

---

## 选项 3：完整 Caddyfile 示例

如果你需要管理多个应用，推荐的结构：

```caddyfile
# Caddy 配置文件
{
    email your-email@example.com
    on_demand_tls {
        ask http://localhost:3000/api/health
    }
}

# Stock Kanban
stocks.yourdomain.com {
    reverse_proxy stock-kanban-app:3000
    encode gzip
    log {
        output file /var/log/caddy/stocks.log
    }
}

# Meal Score（现有）
meals.yourdomain.com {
    reverse_proxy meal_score-app-1:5000
    encode gzip
}

# API Agent（现有）
ai-agent.yourdomain.com {
    reverse_proxy iaa-agent:8501
    encode gzip
}

# Actuarial Agent（现有）
actuarial.yourdomain.com {
    reverse_proxy actuarial-agent:8501
    encode gzip
}
```

---

## 部署步骤

### 1️⃣ 在云端准备（EC2 上）

```bash
# 进入项目目录
cd ~/stock_kanban

# 拉取最新代码
git pull origin main

# 构建和启动容器
docker-compose up -d

# 检查容器状态
docker ps | grep stock-kanban
docker logs stock-kanban-app
```

### 2️⃣ 更新 Caddy 配置

```bash
# 查看 Caddy 配置文件位置
docker inspect caddy | grep -i volumes

# 编辑 Caddyfile（假设在 /etc/caddy/Caddyfile）
sudo nano /etc/caddy/Caddyfile

# 添加上面的配置片段

# 重新加载 Caddy（无需停止）
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 3️⃣ 验证部署

```bash
# 测试容器
curl http://stock-kanban-app:3000/api/watchlists

# 测试通过 Caddy 代理
curl https://stocks.yourdomain.com/api/watchlists
# 或
curl https://yourdomain.com/stocks/api/watchlists
```

---

## 常用命令

### 管理容器

```bash
# 查看日志
docker logs -f stock-kanban-app

# 重启容器
docker-compose restart stock-kanban-api

# 停止容器
docker-compose stop stock-kanban-api

# 删除容器和镜像
docker-compose down
docker rmi stock_kanban-stock-kanban-api

# 更新应用（拉取代码，重建镜像）
cd ~/stock_kanban
git pull origin main
docker-compose up -d --build
```

### 查看网络

```bash
# 查看 Caddy 使用的网络
docker network ls | grep caddy

# 查看网络内的容器
docker network inspect caddy-net
```

### Caddy 管理

```bash
# 查看 Caddy 配置
docker exec caddy caddy list-modules

# 测试配置有效性
docker exec caddy caddy validate --config /etc/caddy/Caddyfile

# 查看证书
docker exec caddy caddy list-certs

# 手动刷新证书
docker exec caddy caddy renew --force
```

---

## 网络架构

```
┌─────────────────────────────────────────────────────┐
│                    Internet (HTTPS)                  │
└────────────────────────┬────────────────────────────┘
                         │
                    ┌────▼────┐
                    │  Caddy   │
                    │  :80,443 │
                    └────┬────┘
         ┌──────────┬────┴─────┬────────────┐
         │          │          │            │
    ┌────▼──┐  ┌───▼───┐  ┌──▼────┐  ┌───▼───┐
    │stocks │  │meals  │  │ai-    │  │actuarial│
    │kanban │  │score  │  │agent  │  │agent    │
    │:3000  │  │:5000  │  │:8501  │  │:8501    │
    └────────┘  └───────┘  └───────┘  └─────────┘
```

---

## 故障排查

### 容器无法启动

```bash
# 查看详细错误
docker logs stock-kanban-app

# 检查端口占用
docker ps -a | grep stock-kanban
sudo lsof -i :3000

# 检查网络连接
docker network inspect caddy-net
```

### Caddy 无法代理

```bash
# 测试容器间连接
docker exec caddy ping stock-kanban-app

# 测试端口
docker exec caddy nc -zv stock-kanban-app 3000

# 查看 Caddy 日志
docker logs caddy
```

### 数据加载失败

```bash
# 检查数据文件
docker exec stock-kanban-app ls -la /app/data

# 验证数据文件内容
docker exec stock-kanban-app cat /app/data/quant-metrics.json | head -20

# 重新挂载数据
# 编辑 docker-compose.yml 中的 volumes 路径
```

---

## 优势对比

| 方案 | EC2 原生 | Docker + Caddy |
|------|---------|----------------|
| 依赖管理 | PM2 + Nginx | Docker 化管理 |
| 扩展性 | 需要手动管理 | docker-compose 易扩展 |
| 更新部署 | 手动拉取、重建、重启 | `docker-compose up -d --build` |
| 日志管理 | 多处分散 | 统一 Docker 日志 |
| 跨云迁移 | 需要重新配置 | 一样的镜像运行 |
| SSL/TLS | 需要单独配置 Certbot | Caddy 自动处理 |
| 资源占用 | 较多（多个进程） | 容器化隔离，更高效 |

---

## 建议步骤

1. ✅ **本地测试**（你的 Windows 机器）
   ```bash
   docker build -t stock-kanban:latest .
   docker run -p 3000:3000 stock-kanban:latest
   curl http://localhost:3000/api/watchlists
   ```

2. ✅ **推送到 GitHub**
   ```bash
   git add Dockerfile docker-compose.yml
   git commit -m "feat: Add Docker support for production deployment"
   git push origin main
   ```

3. ✅ **在云端部署**
   ```bash
   cd ~/stock_kanban
   git pull origin main
   docker-compose up -d
   ```

4. ✅ **更新 Caddy 配置**
   - 编辑 Caddyfile
   - `docker exec caddy caddy reload`

5. ✅ **验证访问**
   ```bash
   curl https://stocks.yourdomain.com
   ```

---

## 完！🚀

不需要 EC2 原生部署了，全部通过 Docker + Caddy 管理！
