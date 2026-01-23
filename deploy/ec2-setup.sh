#!/bin/bash
# EC2 完整部署脚本
# 适用于 Ubuntu 22.04 LTS (t3-medium)

set -e

echo "=========================================="
echo "  Stock Kanban EC2 部署脚本"
echo "=========================================="
echo ""

# 1. 更新系统
echo "[1/8] 更新系统..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. 安装 Node.js
echo "[2/8] 安装 Node.js..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Node 版本: $(node --version)"
echo "npm 版本: $(npm --version)"

# 3. 安装 PM2 (进程管理)
echo "[3/8] 安装 PM2..."
sudo npm install -g pm2

# 4. 安装 Git
echo "[4/8] 安装 Git..."
sudo apt-get install -y git

# 5. 创建应用目录
echo "[5/8] 创建应用目录..."
APP_DIR="/home/ubuntu/stock_kanban"
mkdir -p $APP_DIR
cd $APP_DIR

# 6. 克隆/设置项目（如果尚未存在）
echo "[6/8] 设置项目..."
if [ ! -d ".git" ]; then
  # 如果还没有 git repo，需要初始化或克隆
  echo "请从 GitHub 克隆项目:"
  echo "  git clone <your-repo-url> ."
  echo "或初始化 git:"
  echo "  git init"
  echo ""
  echo "然后推送你的代码到这个目录"
else
  git pull origin main || true
fi

# 7. 安装依赖
echo "[7/8] 安装项目依赖..."
npm install --production

# 8. 构建生产版本
echo "[8/8] 构建生产版本..."
npm run build

echo ""
echo "=========================================="
echo "✅ 部署准备完成！"
echo "=========================================="
echo ""
echo "后续步骤:"
echo "1. 复制 .env.production 配置文件"
echo "2. 配置 PM2: pm2 start ecosystem.config.js --env production"
echo "3. 保存 PM2 配置: pm2 save && pm2 startup"
echo ""
