# Linux Frontend + PostgreSQL Configuration Guide

Date: 2026-02-08
Target: Deploy `stock_kanban` on Linux with an existing PostgreSQL instance.

## 1. Overview

This project serves frontend and backend from one Node process:

- Frontend static files: `dist/public`
- API: `/api/*`
- Backtest persistence: PostgreSQL (when `DATABASE_URL` is configured)

If `DATABASE_URL` is not configured, backtest results fall back to in-memory storage.

## 2. Required environment variables

Create `.env.production` in project root:

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# PostgreSQL (required for persistent backtests)
DATABASE_URL=postgresql://stock_user:strong_password@127.0.0.1:5432/stock_kanban

# Optional PG tuning
PGSSL=false
PGSSL_REJECT_UNAUTHORIZED=false
PGPOOL_MAX=10
PGPOOL_IDLE_TIMEOUT_MS=30000
```

Notes:
- `DATABASE_URL` should point to your existing PGSQL server.
- For managed PG with SSL, set `PGSSL=true`.

## 3. Initialize database schema

### Option A (recommended): Drizzle push

```bash
npm install
npm run db:prepare
npm run db:push
```

### Option B: Manual SQL

```bash
psql "$DATABASE_URL" -f deploy/sql/001_backtest_results.sql
psql "$DATABASE_URL" -f deploy/sql/002_core_trading_tables.sql
```

## 4. Build and run (PM2)

```bash
npm install
npm run build
bash deploy/start-production.sh
```

What `deploy/start-production.sh` does:
- Loads `.env.production`
- Runs `npm run db:push` when `DATABASE_URL` is set
- Starts app with PM2 using `ecosystem.config.js`

Useful commands:

```bash
pm2 status
pm2 logs stock-kanban-api
pm2 restart stock-kanban-api
```

## 5. Docker deployment with PostgreSQL

`deploy/docker-deploy-simple.sh` now loads `.env.production` via `--env-file`.

```bash
bash deploy/docker-deploy-simple.sh
```

For `docker-compose`, ensure shell env has `DATABASE_URL` before starting:

```bash
export DATABASE_URL='postgresql://stock_user:password@10.0.0.5:5432/stock_kanban'
export PGSSL=false
docker compose up -d --build
```

## 6. Nginx reverse proxy for frontend + API

Use `deploy/nginx-stock-kanban.conf` as template:

- `location /` serves frontend SPA
- `location /api/` proxies to `localhost:3000`

Apply and reload:

```bash
sudo ln -s /etc/nginx/sites-available/stock-kanban /etc/nginx/sites-enabled/stock-kanban
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Verification checklist

1. API health:
```bash
curl http://127.0.0.1:3000/api/watchlists
```

2. Backtest algorithms:
```bash
curl http://127.0.0.1:3000/api/backtests/algorithms
```

3. Run one backtest and verify persistence:
```bash
curl -X POST http://127.0.0.1:3000/api/backtests \
  -H "x-user-id: demo-user" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm":"us",
    "startDate":"2025-10-01",
    "endDate":"2025-12-31",
    "initialCash":100000,
    "positionParams":{"maxPositionPerStock":0.1,"maxTotalPositions":10,"minCashReserve":0.1},
    "executionParams":{"commissionBps":5,"slippageBps":5,"minCommission":1},
    "options":{"rebalanceFrequency":"weekly","benchmark":"SPY"}
  }'
```

4. Query DB row count:
```bash
psql "$DATABASE_URL" -c "select count(*) from backtest_results;"
```

5. Query backtest history API:
```bash
curl -H "x-user-id: demo-user" "http://127.0.0.1:3000/api/backtests/history?page=1&pageSize=20"
curl -H "x-user-id: demo-user" "http://127.0.0.1:3000/api/backtests/history?page=1&pageSize=20&algorithm=us&status=completed&runDateFrom=2026-02-01&runDateTo=2026-02-08"
```

Note:
- `x-user-id` is used for record isolation.
- If this `user_id` does not exist in `users`, backend auto-provisions a lightweight user row.

## 8. Frontend integration notes

- Frontend uses relative API paths (`/api/...`), so no frontend env change is required when API and static are served from same domain.
- If frontend and API are split across domains in future, configure reverse proxy or CORS and set a dedicated API base URL strategy.

## 9. Common issues

1. `DATABASE_URL not set` in logs
- Check `.env.production` exists and is loaded.

2. `relation backtest_results does not exist`
- Run `npm run db:push` or execute `deploy/sql/001_backtest_results.sql`.

3. `relation portfolios/strategies does not exist`
- Run `npm run db:push` or execute `deploy/sql/002_core_trading_tables.sql`.

4. SSL connection errors
- Set `PGSSL=true` and verify server CA policy.

5. Backtest ID can be queried immediately but disappears after restart
- This indicates DB persistence is not active and app is using in-memory fallback.

6. History query returns empty unexpectedly
- Check `x-user-id` consistency between run requests and history requests.
