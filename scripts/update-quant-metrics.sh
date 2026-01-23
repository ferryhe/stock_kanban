#!/bin/bash
# 量化指标更新脚本
# 用途: 从 stock_quant_work 项目拉取最新的量化指标数据

echo "📊 更新量化指标数据..."

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
DATA_DIR="$PROJECT_DIR/data"

# 确保 data 目录存在
mkdir -p "$DATA_DIR"

echo "✅ 执行 git pull 以获取最新的 quant-metrics.json"
cd "$PROJECT_DIR"
git pull

# 检查是否有更新
if [ $? -eq 0 ]; then
  if [ -f "$DATA_DIR/quant-metrics.json" ]; then
    echo "✨ 量化指标数据已更新!"
    echo "   位置: $DATA_DIR/quant-metrics.json"
    echo "   股票数量: $(grep -o '"ticker"' "$DATA_DIR/quant-metrics.json" | wc -l)"
    echo "   💡 提示: 缓存将在下次应用启动后更新（1小时自动刷新）"
  else
    echo "⚠️  警告: data/quant-metrics.json 文件未找到"
  fi
else
  echo "❌ git pull 失败，请检查网络连接"
  exit 1
fi
