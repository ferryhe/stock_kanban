#!/bin/bash

# Stock Kanban - Docker 环境检查脚本

echo "🔍 Stock Kanban Docker 环境检查"
echo "================================="
echo ""

# 1. 检查 Docker
echo "1️⃣  检查 Docker..."
if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    echo "✅ $docker_version"
else
    echo "❌ Docker 未安装"
    exit 1
fi

# 2. 检查 Docker Compose
echo ""
echo "2️⃣  检查 Docker Compose..."
if command -v docker-compose &> /dev/null; then
    compose_version=$(docker-compose --version)
    echo "✅ $compose_version"
else
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 3. 检查必要文件
echo ""
echo "3️⃣  检查必要文件..."
files=("Dockerfile" "docker-compose.yml" ".dockerignore")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
    fi
done

# 4. 检查 package.json
echo ""
echo "4️⃣  检查 package.json..."
if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
else
    echo "❌ package.json 不存在"
    exit 1
fi

# 5. 检查 Git
echo ""
echo "5️⃣  检查 Git..."
if [ -d ".git" ]; then
    git_status=$(git status --porcelain)
    echo "✅ Git 仓库已初始化"
    if [ -z "$git_status" ]; then
        echo "   📝 工作目录干净"
    else
        echo "   ⚠️  有未提交的更改:"
        echo "$git_status" | head -5
    fi
else
    echo "⚠️  不是 Git 仓库"
fi

# 6. 检查 Docker 网络
echo ""
echo "6️⃣  检查 Docker 网络..."
if docker network inspect caddy-net &> /dev/null; then
    echo "✅ 'caddy-net' 网络存在"
    # 显示网络中的容器
    echo "   网络中的容器:"
    docker network inspect caddy-net --format="{{json .Containers}}" | grep -o '"Name":"[^"]*' | cut -d'"' -f4 | sed 's/^/     /'
else
    echo "⚠️  'caddy-net' 网络不存在（部署时自动创建）"
fi

# 7. 构建可行性检查
echo ""
echo "7️⃣  检查构建可行性..."
if docker build -t stock-kanban:test --target builder . > /dev/null 2>&1; then
    echo "✅ Dockerfile 构建测试通过"
    docker rmi stock-kanban:test > /dev/null 2>&1
else
    echo "❌ Dockerfile 构建测试失败"
    echo "   运行: docker build -t stock-kanban:latest ."
fi

# 8. 配置有效性检查
echo ""
echo "8️⃣  检查 docker-compose.yml..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml 配置有效"
else
    echo "❌ docker-compose.yml 配置无效"
    docker-compose config
fi

# 9. 显示部署步骤
echo ""
echo "================================="
echo "✅ 环境检查完成！"
echo ""
echo "📋 后续步骤："
echo "1. 推送代码: git push origin main"
echo "2. SSH 登录: ssh ec2-user@your-server"
echo "3. 拉取代码: cd ~/stock_kanban && git pull"
echo "4. 部署应用: bash deploy/docker-deploy.sh"
echo "5. 配置 Caddy: 编辑 /etc/caddy/Caddyfile"
echo "6. 重新加载: docker exec caddy caddy reload"
echo ""
echo "📖 更多信息: cat DOCKER_QUICK_START.md"
echo ""
