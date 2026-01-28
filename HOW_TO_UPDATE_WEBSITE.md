# 如何更新网站 / How to Update Website

## 问题 / Problem
更新代码后，网页刷新看不到更新？
Website not showing updates after code changes?

## 原因 / Root Causes
1. **Docker镜像缓存** - Docker使用旧的镜像层，没有包含新代码
2. **浏览器缓存** - 浏览器缓存了旧的JS/CSS文件
3. **容器未重启** - 只重启服务不够，必须重建镜像

## 正确的更新步骤 / Correct Update Steps

### 方法1: 使用部署脚本（推荐）/ Method 1: Use Deployment Script (Recommended)

```bash
# 进入项目目录 / Go to project directory
cd /home/ec2-user/stock_kanban

# 拉取最新代码 / Pull latest code
git pull origin main

# 运行部署脚本（会自动强制重建）/ Run deployment script (force rebuild)
bash deploy/docker-deploy-simple.sh
```

### 方法2: 手动部署 / Method 2: Manual Deployment

```bash
# 1. 停止旧容器 / Stop old container
docker stop stock-kanban-app
docker rm stock-kanban-app

# 2. 删除旧镜像（重要！）/ Remove old image (Important!)
docker rmi stock-kanban:latest

# 3. 强制重新构建镜像（不使用缓存）/ Force rebuild image (no cache)
docker build --no-cache -t stock-kanban:latest .

# 4. 启动新容器 / Start new container
docker compose up -d

# 或使用 docker run / Or use docker run
docker run -d \
  --name stock-kanban-app \
  --network caddy-net \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -p 3000:3000 \
  --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  stock-kanban:latest
```

## 验证更新 / Verify Updates

### 1. 检查容器日志 / Check Container Logs
```bash
docker logs stock-kanban-app --tail 50
```

### 2. 测试API / Test API
```bash
curl http://localhost:3000/api/watchlists
```

### 3. 检查镜像创建时间 / Check Image Creation Time
```bash
docker images | grep stock-kanban
```
应该显示最新的创建时间 / Should show recent creation time

### 4. 清除浏览器缓存 / Clear Browser Cache
- **Chrome/Edge**: Ctrl+Shift+Delete → 清除缓存
- **Firefox**: Ctrl+Shift+Delete → 清除缓存
- **Safari**: ⌘+Option+E
- **或使用无痕模式测试** / Or test in incognito/private mode

## 重要提示 / Important Notes

### ⚠️ 必须使用 `--no-cache` 标志
部署脚本已更新，默认使用 `--no-cache` 来强制重建镜像，确保包含所有最新代码。

The deployment scripts have been updated to use `--no-cache` by default to force a complete rebuild with all latest code.

### 🔄 更新后的文件会自动添加哈希值
静态文件（JS/CSS）现在会在文件名中包含哈希值（如 `app-a1b2c3d4.js`），每次构建都会生成新的哈希值，强制浏览器下载新文件。

Static files (JS/CSS) now include hash in filenames (like `app-a1b2c3d4.js`), forcing browsers to download new files on each build.

### 📝 缓存策略
- **index.html** - 不缓存（no-cache）
- **带哈希的JS/CSS** - 缓存1年（因为哈希值改变时文件名也改变）
- **其他静态文件** - 不缓存

Cache Policy:
- **index.html** - No cache
- **Hashed JS/CSS** - 1 year cache (because filename changes when content changes)
- **Other static files** - No cache

## 常见问题 / Troubleshooting

### Q: 脚本运行成功但还是看不到更新？
**A**: 清除浏览器缓存或使用无痕模式测试

### Q: Docker构建很慢？
**A**: `--no-cache` 会重新构建所有层，这是正常的。但这确保了更新被正确应用。

### Q: 可以不用 `--no-cache` 吗？
**A**: 不推荐。虽然会快一点，但可能会使用缓存的旧代码层，导致更新不生效。

### Q: 如何快速验证代码版本？
**A**: 可以在代码中添加版本号或时间戳，在网页控制台中打印出来。

## 部署检查清单 / Deployment Checklist

- [ ] 拉取最新代码 `git pull origin main`
- [ ] 停止并删除旧容器 `docker stop/rm`
- [ ] 删除旧镜像 `docker rmi stock-kanban:latest`
- [ ] 使用 `--no-cache` 构建新镜像
- [ ] 启动新容器
- [ ] 检查容器日志确认启动成功
- [ ] 测试API端点
- [ ] 清除浏览器缓存
- [ ] 验证更新已生效

## 快速命令 / Quick Commands

```bash
# 一键更新（在项目根目录执行）/ One-click update (run in project root)
git pull origin main && bash deploy/docker-deploy-simple.sh

# 查看容器状态 / Check container status
docker ps -f name=stock-kanban-app

# 查看实时日志 / View live logs
docker logs -f stock-kanban-app

# 进入容器调试 / Enter container for debugging
docker exec -it stock-kanban-app sh
```
