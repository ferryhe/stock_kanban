#!/bin/bash

# Stock Kanban - 专业版 Docker 部署脚本
# 功能：自动拉取代码、强制构建镜像、原生健康检查、日志滚动限制

set -e

# 确保脚本在项目根目录下执行
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

echo "🚀 Stock Kanban 部署流程开始..."

# 配置变量
DOCKER_NETWORK="caddy-net"
CONTAINER_NAME="stock-kanban-app"
IMAGE_NAME="stock-kanban:latest"

# 1. 代码同步
echo "✓ 正在从 GitHub 拉取最新代码..."
git pull origin main

# 2. 环境检查
echo "✓ 检查网络..."
if ! docker network ls | grep -q "$DOCKER_NETWORK"; then
    echo "正在创建 Docker 网络: $DOCKER_NETWORK"
    docker network create "$DOCKER_NETWORK"
fi

# 3. 清理旧资源
echo "✓ 正在清理旧容器和镜像..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true
# 注意：删除旧镜像可以释放空间，但会导致下次构建稍微慢一点
# 如果磁盘空间紧张，建议保留此行
docker rmi "$IMAGE_NAME" 2>/dev/null || true

# 4. 构建新镜像
echo "✓ 正在构建镜像 (使用 --no-cache 确保代码最新)..."
docker build --no-cache -t "$IMAGE_NAME" .

# 5. 启动容器 (包含关键修复)
echo "✓ 启动容器并应用安全策略..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --network "$DOCKER_NETWORK" \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e HOST=0.0.0.0 \
    -p 3000:3000 \
    --restart unless-stopped \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    --health-cmd="node -e \"require('http').get('http://localhost:3000/api/watchlists', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\"" \
    --health-interval=30s \
    --health-timeout=10s \
    --health-retries=3 \
    --health-start-period=20s \
    -v "$(pwd)/data:/app/data" \
    -v "$(pwd)/logs:/app/logs" \
    "$IMAGE_NAME"

# 6. 验证
echo "✓ 等待容器初始化 (20s)..."
sleep 20

STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")

if [ "$STATUS" == "healthy" ]; then
    echo "✅ 部署成功！容器状态: $STATUS"
else
    echo "⚠️  容器已启动但健康检查尚未通过 (当前状态: $STATUS)"
    echo "   请稍后运行 'docker ps' 查看，或执行 'docker logs $CONTAINER_NAME' 检查日志。"
fi

echo ""
echo "📋 运维提示："
echo "   - 实时日志: docker logs -f $CONTAINER_NAME"
echo "   - 磁盘占用: docker system df"
