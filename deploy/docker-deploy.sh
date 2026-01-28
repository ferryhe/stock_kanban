#!/usr/bin/env bash
# Stock Kanban - Docker deployment script (Caddy environment)
set -euo pipefail

echo "Starting Stock Kanban Docker deploy..."

APP_DIR="/home/ec2-user/stock_kanban"
DOCKER_NETWORK="caddy-net"

# 1) Check Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed."
  exit 1
fi

docker --version

# 2) Go to app dir
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# 3) Update code
if [ -d ".git" ]; then
  git pull origin main || true
  echo "Code updated."
else
  echo "WARNING: Not a git repo. Skipping pull."
fi

# 4) Ensure Caddy network
if ! docker network ls | grep -q "$DOCKER_NETWORK"; then
  docker network create "$DOCKER_NETWORK"
  echo "Created network: $DOCKER_NETWORK"
else
  echo "Network exists: $DOCKER_NETWORK"
fi

# 5) Build image
echo "Building Docker image..."
docker build -t stock-kanban:latest .

# 6) Start container
echo "Starting containers..."
docker compose down || true
docker compose up -d

# 7) Health check
sleep 5
if docker exec stock-kanban-app node -e "fetch('http://localhost:3000/api/watchlists').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  echo "Health check passed."
else
  echo "Health check failed. Showing logs:"
  docker logs --tail 200 stock-kanban-app || true
fi

# 8) Show status

docker ps -f name=stock-kanban-app --format "table {{.Names}}\t{{.Status}}\t{{.Networks}}"

echo "Next steps:"
echo "- Configure Caddy reverse_proxy to stock-kanban-app:3000"
echo "- Reload Caddy: docker exec caddy caddy reload --config /etc/caddy/Caddyfile"
