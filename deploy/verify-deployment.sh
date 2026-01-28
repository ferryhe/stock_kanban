#!/bin/bash

# 部署验证脚本 / Deployment Verification Script
# 用于验证Docker部署是否成功 / Verify Docker deployment success

set -e

echo "🔍 检查 Docker 部署状态 / Checking Docker Deployment Status"
echo "================================================"

# 1. 检查容器运行状态 / Check container status
echo ""
echo "1️⃣  容器状态 / Container Status:"
if docker ps -f name=stock-kanban-app --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}" | grep stock-kanban-app > /dev/null; then
    docker ps -f name=stock-kanban-app --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
    echo "✅ 容器正在运行 / Container is running"
else
    echo "❌ 容器未运行 / Container is not running"
    exit 1
fi

# 2. 检查镜像创建时间 / Check image creation time
echo ""
echo "2️⃣  镜像创建时间 / Image Creation Time:"
docker images stock-kanban:latest --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}"
IMAGE_AGE=$(docker images stock-kanban:latest --format "{{.CreatedSince}}")
echo "📅 镜像年龄 / Image Age: $IMAGE_AGE"

# 3. 检查容器日志 / Check container logs
echo ""
echo "3️⃣  最近日志 / Recent Logs (last 10 lines):"
docker logs stock-kanban-app --tail 10

# 4. 测试API / Test API
echo ""
echo "4️⃣  API 健康检查 / API Health Check:"
if curl -f -s http://localhost:3000/api/watchlists > /dev/null 2>&1; then
    echo "✅ API 响应正常 / API is responding"
else
    echo "⚠️  API 未响应或出错 / API is not responding or error"
fi

# 5. 检查端口 / Check ports
echo ""
echo "5️⃣  端口映射 / Port Mappings:"
docker port stock-kanban-app 2>/dev/null || echo "ℹ️  使用 host 网络模式 / Using host network mode"

# 6. 检查网络 / Check network
echo ""
echo "6️⃣  网络连接 / Network Connections:"
NETWORK=$(docker inspect stock-kanban-app --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null)
if [ -n "$NETWORK" ]; then
    echo "📡 网络: $NETWORK / Networks: $NETWORK"
else
    echo "ℹ️  无法获取网络信息 / Cannot get network info"
fi

# 7. 检查构建版本（从容器内部）/ Check build version (from inside container)
echo ""
echo "7️⃣  构建信息 / Build Information:"
if docker exec stock-kanban-app test -f /app/dist/index.cjs 2>/dev/null; then
    BUILD_TIME=$(docker exec stock-kanban-app stat -c %y /app/dist/index.cjs 2>/dev/null || echo "Unknown")
    echo "📦 服务端构建时间 / Server Build Time: $BUILD_TIME"
else
    echo "⚠️  找不到构建文件 / Build file not found"
fi

# 8. 浏览器缓存提示 / Browser cache reminder
echo ""
echo "================================================"
echo "📝 部署验证完成 / Deployment Verification Complete"
echo ""
echo "🔄 如果更新仍未显示，请清除浏览器缓存："
echo "   If updates still not showing, clear browser cache:"
echo ""
echo "   - Chrome/Edge: Ctrl+Shift+Delete"
echo "   - Firefox: Ctrl+Shift+Delete"  
echo "   - Safari: ⌘+Option+E"
echo "   - 或使用无痕模式 / Or use incognito mode"
echo ""
echo "🌐 测试网址 / Test URL: http://localhost:3000"
echo ""
