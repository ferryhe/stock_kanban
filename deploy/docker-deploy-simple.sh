#!/bin/bash

# Stock Kanban Docker deployment script
# - pull latest code
# - rebuild image
# - restart container
# - use .env.production for DATABASE_URL and runtime config

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

echo "[Deploy] Start stock_kanban docker deploy"

DOCKER_NETWORK="caddy-net"
CONTAINER_NAME="stock-kanban-app"
IMAGE_NAME="stock-kanban:latest"
ENV_FILE=".env.production"

echo "[Deploy] git pull"
git pull origin main

echo "[Deploy] ensure docker network: $DOCKER_NETWORK"
if ! docker network ls | grep -q "$DOCKER_NETWORK"; then
  docker network create "$DOCKER_NETWORK"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "[Deploy] ERROR: $ENV_FILE not found"
  echo "[Deploy] Create it from .env.production.example first"
  exit 1
fi

echo "[Deploy] stop and remove previous container/image"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true
docker rmi "$IMAGE_NAME" 2>/dev/null || true

echo "[Deploy] build image"
docker build --no-cache -t "$IMAGE_NAME" .

echo "[Deploy] start container"
docker run -d \
  --name "$CONTAINER_NAME" \
  --network "$DOCKER_NETWORK" \
  --env-file "$ENV_FILE" \
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

echo "[Deploy] wait for health check"
sleep 20

STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
if [ "$STATUS" == "healthy" ]; then
  echo "[Deploy] success: container is healthy"
else
  echo "[Deploy] warning: container status is $STATUS"
  echo "[Deploy] check logs: docker logs $CONTAINER_NAME"
fi

echo "[Deploy] tail logs: docker logs -f $CONTAINER_NAME"
