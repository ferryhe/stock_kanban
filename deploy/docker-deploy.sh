#!/bin/bash

# Stock Kanban - Docker 浜戠閮ㄧ讲鑴氭湰
# 鐢ㄤ簬宸叉湁 Caddy 鐨?EC2 鐜

set -e

echo "馃殌 Stock Kanban Docker 閮ㄧ讲寮€濮?.."

# 閰嶇疆鍙橀噺
APP_DIR="/home/ec2-user/stock_kanban"
DOCKER_NETWORK="caddy-net"

# 1. 妫€鏌?Docker 鍜?Docker Compose
echo "鉁?妫€鏌?Docker..."
if ! command -v docker &> /dev/null; then
    echo "鉂?Docker 鏈畨瑁咃紝璇峰厛瀹夎 Docker"
    exit 1
fi

docker --version

# 2. 鍒涘缓搴旂敤鐩綍
echo "鉁?鍒涘缓搴旂敤鐩綍..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 3. 鎷夊彇鏈€鏂伴」鐩唬鐮?echo "鉁?鑾峰彇鏈€鏂颁唬鐮?.."
if [ -d ".git" ]; then
    # 宸茬粡鏄?Git 浠撳簱锛岀洿鎺ユ媺鍙?    git pull origin main 2>/dev/null || true
    echo "浠ｇ爜宸叉洿鏂?
else
    # 涓嶆槸 Git 浠撳簱锛堢涓€娆¤繍琛岋級锛屽垵濮嬪寲
    git init
    git remote add origin https://github.com/your-username/stock_kanban.git
    git pull origin main || echo "鈿狅笍  鏃犳硶浠?GitHub 鎷夊彇锛屽亣璁炬湰鍦版枃浠跺凡瀹屾暣"
fi

# 4. 妫€鏌ユ垨鍒涘缓 Caddy 缃戠粶
echo "鉁?妫€鏌?Caddy 缃戠粶..."
if ! docker network ls | grep -q "$DOCKER_NETWORK"; then
    echo "鍒涘缓 Caddy 缃戠粶..."
    docker network create "$DOCKER_NETWORK"
else
    echo "Caddy 缃戠粶宸插瓨鍦?
fi

# 5. 鏋勫缓闀滃儚
echo "鉁?鏋勫缓 Docker 闀滃儚..."
docker build -t stock-kanban:latest .

# 6. 鍚姩瀹瑰櫒
echo "鉁?鍚姩 Docker 瀹瑰櫒..."
docker compose down 2>/dev/null || true
docker compose up -d

# 7. 绛夊緟瀹瑰櫒鍚姩
echo "鉁?绛夊緟瀹瑰櫒鍚姩..."
sleep 5

# 8. 娴嬭瘯鍋ュ悍妫€鏌?echo "鉁?娴嬭瘯瀹瑰櫒鍋ュ悍..."
if docker exec stock-kanban-app node -e "fetch('http://localhost:3000/api/watchlists').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" > /dev/null 2>&1; then
    echo "鉁?瀹瑰櫒鍋ュ悍妫€鏌ラ€氳繃"
else
    echo "鈿狅笍  瀹瑰櫒鍙兘杩樺湪鍚姩涓紝鏌ョ湅鏃ュ織锛?
    docker logs stock-kanban-app
fi

# 9. 鏄剧ず瀹瑰櫒淇℃伅
echo ""
echo "鉁?Docker 閮ㄧ讲瀹屾垚锛?
echo ""
echo "馃搳 瀹瑰櫒鐘舵€侊細"
docker ps -f name=stock-kanban-app --format "table {{.Names}}\t{{.Status}}\t{{.Networks}}"

echo ""
echo "馃摑 涓嬩竴姝ワ細"
echo "1. 鏇存柊 Caddy 閰嶇疆锛堟坊鍔?reverse_proxy 鍒?stock-kanban-app:3000锛?
echo "2. 閲嶆柊鍔犺浇 Caddy: docker exec caddy caddy reload --config /etc/caddy/Caddyfile"
echo "3. 璁块棶搴旂敤: https://stocks.yourdomain.com"
echo ""
echo "馃搵 鏈夌敤鐨勫懡浠わ細"
echo "   docker logs -f stock-kanban-app          # 鏌ョ湅鏃ュ織"
echo "   docker compose restart stock-kanban-api  # 閲嶅惎搴旂敤"
echo "   docker compose down                      # 鍋滄搴旂敤"
echo ""

