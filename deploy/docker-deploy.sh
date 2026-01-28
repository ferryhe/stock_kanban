#!/bin/bash

# Stock Kanban - Docker 云端部署脚本
# 用于已有 Caddy �?EC2 环境

set -e

echo "🚀 Stock Kanban Docker 部署开�?.."

# 配置变量
APP_DIR="/home/ec2-user/stock_kanban"
DOCKER_NETWORK="caddy-net"

# 1. 检�?Docker �?Docker Compose
echo "�?检�?Docker..."
if ! command -v docker &> /dev/null; then
    echo "�?Docker 未安装，请先安装 Docker"
    exit 1
fi

docker --version

# 2. 创建应用目录
echo "�?创建应用目录..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 3. 拉取最新项目代�?echo "�?获取最新代�?.."
if [ -d ".git" ]; then
    # 已经�?Git 仓库，直接拉�?    git pull origin main 2>/dev/null || true
    echo "代码已更�?
else
    # 不是 Git 仓库（第一次运行），初始化
    git init
    git remote add origin https://github.com/your-username/stock_kanban.git
    git pull origin main || echo "⚠️  无法�?GitHub 拉取，假设本地文件已完整"
fi

# 4. 检查或创建 Caddy 网络
echo "�?检�?Caddy 网络..."
if ! docker network ls | grep -q "$DOCKER_NETWORK"; then
    echo "创建 Caddy 网络..."
    docker network create "$DOCKER_NETWORK"
else
    echo "Caddy 网络已存�?
fi

# 5. 构建镜像
echo "�?构建 Docker 镜像..."
docker build -t stock-kanban:latest .

# 6. 启动容器
echo "�?启动 Docker 容器..."
docker compose down 2>/dev/null || true
docker compose up -d

# 7. 等待容器启动
echo "�?等待容器启动..."
sleep 5

# 8. 测试健康检�?echo "�?测试容器健康..."
if docker exec stock-kanban-app curl -f http://localhost:3000/api/watchlists > /dev/null 2>&1; then
    echo "�?容器健康检查通过"
else
    echo "⚠️  容器可能还在启动中，查看日志�?
    docker logs stock-kanban-app
fi

# 9. 显示容器信息
echo ""
echo "�?Docker 部署完成�?
echo ""
echo "📊 容器状态："
docker ps -f name=stock-kanban-app --format "table {{.Names}}\t{{.Status}}\t{{.Networks}}"

echo ""
echo "📝 下一步："
echo "1. 更新 Caddy 配置（添�?reverse_proxy �?stock-kanban-app:3000�?
echo "2. 重新加载 Caddy: docker exec caddy caddy reload --config /etc/caddy/Caddyfile"
echo "3. 访问应用: https://stocks.yourdomain.com"
echo ""
echo "📋 有用的命令："
echo "   docker logs -f stock-kanban-app          # 查看日志"
echo "   docker compose restart stock-kanban-api  # 重启应用"
echo "   docker compose down                      # 停止应用"
echo ""
