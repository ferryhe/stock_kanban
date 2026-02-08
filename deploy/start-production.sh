#!/bin/bash
# Production startup script for PM2 (Linux)
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

if [ ! -f ".env.production" ]; then
  echo "ERROR: .env.production not found"
  echo "Run: cp .env.production.example .env.production"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.production
set +a

echo "[Start] Running DB schema sync (if DATABASE_URL is set)"
if [ -n "$DATABASE_URL" ]; then
  npm run db:prepare
  npm run db:push
else
  echo "[Start] DATABASE_URL is empty, skip db:push"
fi

echo "[Start] Starting app with PM2"
pm2 start ecosystem.config.js --env production

echo "[Start] Done"
