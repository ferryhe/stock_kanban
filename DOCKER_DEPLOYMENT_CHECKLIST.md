# 📋 Stock Kanban - Docker 部署 执行清单

## 当前你的云环境
```
✅ Docker 已安装
✅ Docker Compose 已安装
✅ Caddy 容器已运行（监听 80/443）
✅ caddy-net 网络已存在
✅ 其他应用运行中（meal_score, iaa-agent 等）
```

---

## 📦 本地准备（Windows）

### ✅ 文件检查
```
□ Dockerfile                          (735 B) ✓
□ docker-compose.yml                  (721 B) ✓
□ .dockerignore                       (232 B) ✓
□ deploy/docker-deploy.sh             
□ deploy/docker-check.sh              
```

### ✅ 代码推送
```bash
cd c:\Projects\stock_kanban

# 1. 检查状态
git status

# 2. 添加新文件
git add Dockerfile docker-compose.yml .dockerignore \
        deploy/docker-*.sh \
        DOCKER_*.md DEPLOYMENT_*.md

# 3. 提交
git commit -m "feat: Add Docker + Caddy deployment support"

# 4. 推送
git push origin main

# ✓ 完成
```

---

## 🚀 云端部署（EC2）

### 第 1 步：SSH 连接
```bash
ssh ec2-user@your-ec2-ip
# 或
ssh -i your-key.pem ec2-user@your-ec2-ip

# ✓ 连接成功
```

### 第 2 步：进入项目目录
```bash
# 如果第一次，创建目录
mkdir -p ~/stock_kanban
cd ~/stock_kanban

# 或如果已有
cd ~/stock_kanban

# ✓ 目录就绪
```

### 第 3 步：拉取最新代码
```bash
# 如果是新的
git clone https://github.com/your-username/stock_kanban.git .

# 或如果已有
git pull origin main

# ✓ 代码已更新
```

### 第 4 步：检查环境（可选）
```bash
# 运行环境检查脚本
bash deploy/docker-check.sh

# 预期输出：
# ✅ Docker 已安装
# ✅ Docker Compose 已安装
# ✅ package.json 存在
# ✅ 构建可行性检查通过
# ✅ docker-compose.yml 配置有效

# ✓ 环境检查通过
```

### 第 5 步：一键部署
```bash
# 运行自动化部署脚本
bash deploy/docker-deploy.sh

# 脚本会自动：
# ✓ 检查 Docker 已安装
# ✓ 创建 Caddy 网络（如需要）
# ✓ 构建 Docker 镜像
# ✓ 启动容器
# ✓ 进行健康检查
# ✓ 显示容器状态

# 预期最终输出：
# ✅ Docker 部署完成！
# 📊 容器状态：
# stock-kanban-app    Up 2 seconds    caddy-net
```

### 第 6 步：验证部署
```bash
# 检查容器是否运行
docker ps | grep stock-kanban

# 应该看到：
# stock-kanban-app    ...    Up    caddy-net

# ✓ 容器运行中
```

---

## 🔧 Caddy 配置

### 第 7 步：编辑 Caddyfile
```bash
# 找到 Caddy 配置文件位置
# 通常在 /etc/caddy/Caddyfile 或其他位置

# 查看当前配置
cat /etc/caddy/Caddyfile

# 编辑配置
sudo nano /etc/caddy/Caddyfile
# 或
sudo vi /etc/caddy/Caddyfile

# ✓ 打开编辑器
```

### 第 8 步：添加反向代理配置

**选项 A：子域名方式（推荐）**
```caddyfile
stocks.yourdomain.com {
    reverse_proxy stock-kanban-app:3000
    encode gzip
    header {
        -Server
    }
}
```

**或选项 B：路径前缀方式**
```caddyfile
yourdomain.com {
    # 现有配置...
    
    handle /stocks* {
        reverse_proxy stock-kanban-app:3000 {
            uri strip_prefix /stocks
        }
    }
}
```

### 第 9 步：保存并重新加载

```bash
# 如果使用 nano：
# Ctrl+O （保存）
# Enter
# Ctrl+X （退出）

# 如果使用 vi：
# :wq （保存并退出）

# 测试配置
docker exec caddy caddy validate --config /etc/caddy/Caddyfile

# 应该看到：
# OK

# 重新加载 Caddy（无需停止）
docker exec caddy caddy reload --config /etc/caddy/Caddyfile

# ✓ Caddy 已重新加载
```

---

## ✅ 验证部署成功

### 第 10 步：测试 API 端点

```bash
# 测试容器内的 API
curl http://localhost:3000/api/watchlists

# 应该返回 JSON 数据
# ✓ 容器 API 正常

# 通过 Caddy 测试（如果已配置）
curl https://stocks.yourdomain.com/api/watchlists

# 应该返回 JSON 数据
# ✓ Caddy 代理正常
```

### 第 11 步：浏览器验证

```
打开浏览器：
  • 如果用子域名：https://stocks.yourdomain.com
  • 如果用路径前缀：https://yourdomain.com/stocks

应该看到：
  • Stock Kanban 应用界面
  • 股票卡片加载显示
  • 量化指标显示

✓ 部署成功！
```

### 第 12 步：查看日志（可选）

```bash
# 查看容器日志（实时）
docker logs -f stock-kanban-app

# 应该看到：
# 服务器启动日志
# API 请求日志
# 没有错误信息

# Ctrl+C 退出日志查看

# ✓ 日志正常
```

---

## 📊 容器状态检查

```bash
# 查看容器详细信息
docker ps

# 预期输出：
# CONTAINER ID   IMAGE                    COMMAND     CREATED      STATUS      PORTS        NAMES
# ...
# xxxxxx         stock_kanban-...         ...         2 minutes ago   Up 2 min   caddy-net    stock-kanban-app

# 查看容器资源使用
docker stats stock-kanban-app

# 预期：
# CPU%: < 5%
# MEM USAGE: < 200 MB
# BLOCK I/O: 正常

# ✓ 容器运行正常
```

---

## 🔄 日常维护

### 查看日志
```bash
# 实时日志
docker logs -f stock-kanban-app

# 最后 50 行
docker logs stock-kanban-app --tail 50

# 搜索错误
docker logs stock-kanban-app | grep -i error
```

### 更新应用
```bash
cd ~/stock_kanban

# 拉取最新代码
git pull origin main

# 重建并启动（如有代码更改）
docker-compose up -d --build

# 查看日志确认成功
docker logs -f stock-kanban-app
```

### 重启应用
```bash
# 重启容器
docker-compose restart stock-kanban-api

# 或完全删除后重建
docker-compose down
docker-compose up -d
```

### 停止应用
```bash
# 停止但保留容器
docker-compose stop stock-kanban-api

# 完全删除
docker-compose down
```

---

## 🚨 故障排查

### 容器无法启动

```bash
# 1. 查看详细错误
docker logs stock-kanban-app

# 2. 常见错误解决

# 错误：Network caddy-net not found
docker network create caddy-net

# 错误：port already in use
docker-compose down
docker rmi stock_kanban-stock-kanban-api

# 错误：npm install failed
docker-compose build --no-cache
docker-compose up -d
```

### Caddy 无法代理

```bash
# 1. 检查 Caddy 是否运行
docker ps | grep caddy

# 2. 检查网络连接
docker exec caddy ping stock-kanban-app

# 3. 检查配置有效性
docker exec caddy caddy validate --config /etc/caddy/Caddyfile

# 4. 查看 Caddy 日志
docker logs caddy

# 5. 重新加载 Caddy
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 应用无法加载数据

```bash
# 1. 检查数据文件
docker exec stock-kanban-app ls -la /app/data

# 2. 检查文件内容
docker exec stock-kanban-app cat /app/data/quant-metrics.json | head

# 3. 检查权限
ls -la ~/stock_kanban/data/

# 4. 查看 API 日志
docker logs stock-kanban-app | tail -20
```

---

## 📝 完成清单

### 部署前准备
- [ ] 已读 DOCKER_QUICK_START.md
- [ ] Dockerfile 已创建
- [ ] docker-compose.yml 已创建
- [ ] 代码已推送到 GitHub

### 云端部署
- [ ] SSH 连接成功
- [ ] git pull 完成
- [ ] docker-check.sh 检查通过（可选）
- [ ] docker-deploy.sh 执行成功
- [ ] 容器状态显示 "Up"

### Caddy 配置
- [ ] 找到 Caddyfile 文件
- [ ] 添加反向代理配置
- [ ] 配置验证通过
- [ ] Caddy 已重新加载

### 功能验证
- [ ] curl API 端点返回数据
- [ ] Caddy 代理工作正常
- [ ] 浏览器可访问应用
- [ ] 应用界面加载正确
- [ ] 日志无错误

### 后续维护
- [ ] 理解常用命令
- [ ] 知道如何查看日志
- [ ] 知道如何更新应用
- [ ] 知道如何故障排查

---

## 📞 帮助资源

| 问题 | 解决方案 |
|------|--------|
| 快速入门 | 查看 DOCKER_QUICK_START.md |
| 常用命令 | 查看 DOCKER_DEPLOY_GUIDE.md |
| 深度学习 | 查看 deploy/DOCKER_CADDY_DEPLOYMENT.md |
| 方案对比 | 查看 DEPLOYMENT_SUMMARY.md |
| 日志信息 | `docker logs stock-kanban-app` |
| 容器状态 | `docker ps` 或 `docker stats` |

---

## 🎉 部署成功标志

当你看到这些，说明部署成功了：

✅ `docker ps` 显示容器状态为 "Up"
✅ `curl https://stocks.yourdomain.com` 返回 HTML
✅ 浏览器可以访问应用
✅ 股票数据正常加载显示
✅ 日志中没有错误信息

---

## 🎯 下一步

### 立即做
1. 本地推送代码
2. SSH 连接到云服务器
3. 运行 `bash deploy/docker-deploy.sh`
4. 配置 Caddy
5. 验证访问

### 可选做
- [ ] 配置 SSL 证书（Caddy 自动处理）
- [ ] 设置日志监控
- [ ] 配置自动备份
- [ ] 创建 CI/CD 流程

### 文档阅读
1. 快速开始（5 分钟）
2. 常用命令参考（10 分钟）
3. 详细部署指南（20 分钟）

---

**预计总时间**：10-15 分钟

**难度级别**：⭐⭐ (简单!)

**状态**：✅ 完全就绪！

---

*最后更新：2026-01-23*
*版本：1.0（Docker + Caddy 完整方案）*

