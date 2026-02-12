#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DOCKER_NETWORK="caddy-net"
APP_CONTAINER="stock-kanban-app"
APP_IMAGE="stock-kanban:latest"
APP_PORT="3000"
ENV_FILE=".env.production"
EXTERNAL_DB_CONTAINER="${EXTERNAL_DB_CONTAINER:-}"

# PostgreSQL 容器配置
PG_IMAGE="postgres:16-alpine"
PG_CONTAINER="stock-kanban-pg"
PG_VOLUME="stock_kanban_pgdata"
PG_DB_DEFAULT="stock_kanban"
PG_USER_DEFAULT="stock_user"
PG_PASSWORD_DEFAULT="stock_pass"

# 脚本配置
SCRIPT_VERSION="2.0"
DEPLOYMENT_READ_ONLY="${DEPLOYMENT_READ_ONLY:-false}"

log() {
  echo ""
  echo "╔════════════════════════════════════════════╗"
  echo "║ [stock-kanban] $*"
  echo "╚════════════════════════════════════════════╝"
  echo ""
}

get_env_value() {
  local key="$1"
  local file="$2"
  if [ ! -f "$file" ]; then
    return 0
  fi
  awk -F= -v k="$key" '$1==k {print substr($0, index($0, "=") + 1)}' "$file" | tail -n 1
}

set_env_value() {
  local key="$1"
  local value="$2"
  local file="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|g" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

has_upstream() {
  git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1
}

db_reachable() {
  local db_url="$1"
  docker run --rm \
    --network "$DOCKER_NETWORK" \
    -e DATABASE_URL="$db_url" \
    "$PG_IMAGE" \
    sh -ec 'pg_isready -d "$DATABASE_URL" -t 5 >/dev/null 2>&1'
}

wait_pg_ready() {
  local max_try=60
  local i=0
  until docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge "$max_try" ]; then
      log "ERROR: PostgreSQL container is not ready after ${max_try} checks."
      return 1
    fi
    sleep 2
  done
}

bootstrap_schema() {
  local db_url="$1"
  docker run --rm \
    --network "$DOCKER_NETWORK" \
    -e DATABASE_URL="$db_url" \
    -v "$ROOT_DIR/deploy/sql:/sql:ro" \
    "$PG_IMAGE" \
    sh -ec '
      set -e
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS users (id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text, username text NOT NULL UNIQUE, password text NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS user_profiles (id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE, display_name varchar(100), email varchar(255), risk_tolerance varchar(20) NOT NULL DEFAULT \$\$moderate\$\$, notifications_trade_alerts boolean NOT NULL DEFAULT true, notifications_daily_report boolean NOT NULL DEFAULT false, notifications_weekly_report boolean NOT NULL DEFAULT false, theme varchar(10) NOT NULL DEFAULT \$\$light\$\$, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id), CONSTRAINT user_profiles_email_unique UNIQUE (email));"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);"
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /sql/001_backtest_results.sql
      psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /sql/002_core_trading_tables.sql
    '
}

if ! command -v docker >/dev/null 2>&1; then
  log "ERROR: docker is not installed."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  log "ERROR: git is not installed."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "ERROR: current directory is not a git repository."
  exit 1
fi

if [ ! -f "package.json" ]; then
  log "ERROR: package.json not found. Are you in the project root?"
  exit 1
fi

log "✓ Prerequisites check passed (Docker, Git, Project structure)"

log "Step 1/7: Reset local tracked changes"
git restore .

log "Step 2/7: Pull latest code"
if has_upstream; then
  git pull --ff-only
else
  git pull --ff-only origin main
fi

log "Step 3/7: Ensure Docker network (${DOCKER_NETWORK})"
if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
  docker network create "$DOCKER_NETWORK" >/dev/null
fi

# Optional: attach an existing external DB container to this network.
# Example:
#   EXTERNAL_DB_CONTAINER=meal_score-db-1 bash stock_kanban_update_and_run.sh
if [ -n "$EXTERNAL_DB_CONTAINER" ]; then
  if docker inspect "$EXTERNAL_DB_CONTAINER" >/dev/null 2>&1; then
    if ! docker network inspect "$DOCKER_NETWORK" --format '{{json .Containers}}' | grep -q "\"$EXTERNAL_DB_CONTAINER\""; then
      docker network connect "$DOCKER_NETWORK" "$EXTERNAL_DB_CONTAINER" >/dev/null || true
      log "Attached external DB container to ${DOCKER_NETWORK}: $EXTERNAL_DB_CONTAINER"
    fi
  else
    log "WARNING: EXTERNAL_DB_CONTAINER not found: $EXTERNAL_DB_CONTAINER"
  fi
fi

log "Step 4/7: Prepare .env.production"
if [ ! -f "$ENV_FILE" ]; then
  if [ ! -f ".env.production.example" ]; then
    log "ERROR: .env.production.example not found!"
    exit 1
  fi
  log "Creating $ENV_FILE from template..."
  cp .env.production.example "$ENV_FILE"
  log "Please edit .env.production with your settings (DATABASE_URL, etc)"
fi

# 验证.env.production格式
if ! grep -q "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null; then
  log "⚠ WARNING: DATABASE_URL not set in $ENV_FILE"
  log "You need to set DATABASE_URL before continuing"
fi

# Ensure required production secret exists to prevent crash loop on boot.
SESSION_SECRET="$(get_env_value "SESSION_SECRET" "$ENV_FILE")"
if [ -z "${SESSION_SECRET:-}" ]; then
  if command -v openssl >/dev/null 2>&1; then
    SESSION_SECRET="$(openssl rand -base64 48 | tr -d '\r\n')"
  else
    SESSION_SECRET="$(cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s)"
  fi
  set_env_value "SESSION_SECRET" "$SESSION_SECRET" "$ENV_FILE"
  log "Generated missing SESSION_SECRET in $ENV_FILE"
fi

DATABASE_URL="$(get_env_value "DATABASE_URL" "$ENV_FILE")"
PG_USER="$PG_USER_DEFAULT"
PG_PASSWORD="$PG_PASSWORD_DEFAULT"
PG_DB="$PG_DB_DEFAULT"

log "Step 5/7: Ensure PostgreSQL is available"
USE_EXISTING_DB="false"

DATABASE_URL="$(get_env_value "DATABASE_URL" "$ENV_FILE")"
if [ -z "${DATABASE_URL:-}" ]; then
  log "No DATABASE_URL set. Will create local PostgreSQL container..."
else
  log "Testing DATABASE_URL connectivity..."
  if db_reachable "$DATABASE_URL"; then
    USE_EXISTING_DB="true"
    log "✓ Existing DATABASE_URL is reachable. Will reuse it."
  else
    log "✗ Existing DATABASE_URL is not reachable from Docker network."
    log "Will provision local PostgreSQL container instead."
  fi
fi

if [ "$USE_EXISTING_DB" != "true" ]; then
  if docker inspect "$PG_CONTAINER" >/dev/null 2>&1; then
    PG_USER="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$PG_CONTAINER" | awk -F= '$1=="POSTGRES_USER"{print $2}' | tail -n1)"
    PG_PASSWORD="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$PG_CONTAINER" | awk -F= '$1=="POSTGRES_PASSWORD"{print $2}' | tail -n1)"
    PG_DB="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$PG_CONTAINER" | awk -F= '$1=="POSTGRES_DB"{print $2}' | tail -n1)"
    PG_USER="${PG_USER:-$PG_USER_DEFAULT}"
    PG_PASSWORD="${PG_PASSWORD:-$PG_PASSWORD_DEFAULT}"
    PG_DB="${PG_DB:-$PG_DB_DEFAULT}"
    docker start "$PG_CONTAINER" >/dev/null || true
    log "Reusing existing PostgreSQL container: $PG_CONTAINER"
  else
    docker volume create "$PG_VOLUME" >/dev/null
    docker run -d \
      --name "$PG_CONTAINER" \
      --network "$DOCKER_NETWORK" \
      -e POSTGRES_DB="$PG_DB" \
      -e POSTGRES_USER="$PG_USER" \
      -e POSTGRES_PASSWORD="$PG_PASSWORD" \
      -v "$PG_VOLUME:/var/lib/postgresql/data" \
      --restart unless-stopped \
      --health-cmd="pg_isready -U $PG_USER -d $PG_DB" \
      --health-interval=10s \
      --health-timeout=5s \
      --health-retries=5 \
      "$PG_IMAGE" >/dev/null
    log "Created PostgreSQL container: $PG_CONTAINER"
  fi

  wait_pg_ready
  DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_CONTAINER}:5432/${PG_DB}"
  set_env_value "DATABASE_URL" "$DATABASE_URL" "$ENV_FILE"
  set_env_value "PGSSL" "false" "$ENV_FILE"
  set_env_value "PGSSL_REJECT_UNAUTHORIZED" "false" "$ENV_FILE"
fi

log "Step 6/7: Initialize DB schema"
bootstrap_schema "$DATABASE_URL"

log "Step 7/7: Rebuild and restart stock-kanban app container"
log "Stopping and removing old container if exists..."
docker stop "$APP_CONTAINER" >/dev/null 2>&1 || true
docker rm "$APP_CONTAINER" >/dev/null 2>&1 || true
docker rmi "$APP_IMAGE" >/dev/null 2>&1 || true

log "Building Docker image: $APP_IMAGE"
docker build -t "$APP_IMAGE" . >/dev/null || {
  log "ERROR: Docker build failed!"
  exit 1
}

log "Starting container..."
docker run -d \
  --name "$APP_CONTAINER" \
  --network "$DOCKER_NETWORK" \
  --env-file "$ENV_FILE" \
  -e NODE_ENV=production \
  -e PORT="$APP_PORT" \
  -e HOST=0.0.0.0 \
  -p "${APP_PORT}:${APP_PORT}" \
  --restart unless-stopped \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  --health-cmd="node -e \"require('http').get('http://localhost:${APP_PORT}/api/watchlists', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=20s \
  -v "$ROOT_DIR/data:/app/data" \
  -v "$ROOT_DIR/logs:/app/logs" \
  "$APP_IMAGE" >/dev/null

log "Waiting for container health check (max 60 seconds)..."
sleep 5
for i in {1..12}; do
  APP_HEALTH="$(docker inspect --format='{{.State.Health.Status}}' "$APP_CONTAINER" 2>/dev/null || echo "unknown")"
  log "Health check [$i/12]: $APP_HEALTH"
  if [ "$APP_HEALTH" = "healthy" ]; then
    break
  fi
  sleep 5
done

APP_HEALTH="$(docker inspect --format='{{.State.Health.Status}}' "$APP_CONTAINER" 2>/dev/null || echo "unknown")"
log "✓ Deployment complete!"
log ""
log "Container Status:"
log "  Name: $APP_CONTAINER"
log "  Health: $APP_HEALTH"
log "  Port: $APP_PORT"
log "  Database: ${DATABASE_URL:0:50}..."
log ""
log "View logs:"
log "  docker logs --tail 100 $APP_CONTAINER"
log "  docker logs --follow $APP_CONTAINER"
log ""
log "Via Caddy: https://stockkanban.aixintelligence.com"
