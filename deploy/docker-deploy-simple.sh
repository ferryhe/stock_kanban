#!/bin/bash

# Stock Kanban - 简化版 Docker 部署脚本
# 不依赖 docker-compose（云端环境用）

set -e

echo "🚀 Stock Kanban Docker 部署开始..."

# 配置变量
DOCKER_NETWORK="caddy-net"
CONTAINER_NAME="stock-kanban-app"
IMAGE_NAME="stock-kanban:latest"

# 1. 检查 Docker
echo "✓ 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi
docker --version

# 2. 检查或创建网络
echo "✓ 检查网络..."
if ! docker network ls | grep -q "$DOCKER_NETWORK"; then
    echo "创建 Caddy 网络..."
    docker network create "$DOCKER_NETWORK"
else
    echo "网络已存在"
fi

# 3. 停止旧容器
echo "✓ 清理旧容器..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# 4. 删除旧镜像
echo "✓ 删除旧镜像..."
docker rmi "$IMAGE_NAME" 2>/dev/null || true

# 5. 构建镜像
echo "✓ 构建镜像..."
docker build -t "$IMAGE_NAME" .

# 6. 启动容器
echo "✓ 启动容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --network "$DOCKER_NETWORK" \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e HOST=0.0.0.0 \
    -p 3000:3000 \
    --restart unless-stopped \
    --health-cmd='curl -f http://localhost:3000/api/watchlists || exit 1' \
    --health-interval=30s \
    --health-timeout=10s \
    --health-retries=3 \
    -v $(pwd)/data:/app/data \
    -v $(pwd)/logs:/app/logs \
    "$IMAGE_NAME"

# 7. 等待容器启动
echo "✓ 等待容器启动..."
sleep 5

# 8. 检查健康状态
echo "✓ 检查容器状态..."
if docker ps | grep -q "$CONTAINER_NAME"; then
    echo "✅ 容器正在运行"
    docker ps -f name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Networks}}"
else
    echo "❌ 容器启动失败，查看日志："
    docker logs "$CONTAINER_NAME"
    exit 1
fi

# 9. 测试 API
echo "✓ 测试 API..."
if curl -f http://localhost:3000/api/watchlists > /dev/null 2>&1; then
    echo "✅ API 正常工作"
else
    echo "⚠️  API 暂未就绪，查看日志："
    docker logs "$CONTAINER_NAME"
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 后续步骤："
echo "1. 查看日志: docker logs -f $CONTAINER_NAME"
echo "2. 停止容器: docker stop $CONTAINER_NAME"
echo "3. 删除容器: docker rm $CONTAINER_NAME"
echo ""
echo "📝 更新应用："
echo "git pull origin main && bash deploy/docker-deploy-simple.sh"
echo ""
