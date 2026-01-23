#!/bin/bash
# 生产环境启动脚本
# 在 EC2 上运行此脚本以启动应用

set -e

# 获取应用目录
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 检查 .env.production
if [ ! -f ".env.production" ]; then
  echo "❌ 错误: .env.production 文件不存在"
  echo "请复制 .env.production.example 并修改:"
  echo "  cp .env.production.example .env.production"
  exit 1
fi

# 加载环境变量
export $(cat .env.production | xargs)

# 启动应用
echo "🚀 启动 Stock Kanban..."
pm2 start ecosystem.config.js --env production

echo ""
echo "✅ 应用已启动"
echo "📊 监控: pm2 monit"
echo "📝 日志: pm2 logs"
echo ""
