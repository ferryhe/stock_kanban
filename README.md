# Stock Kanban

Stock Kanban is a full-stack stock dashboard + backtest/live-paper-trading service.
Frontend and API are served by one Node process.

## Core Features

- Watchlists and stock data dashboard
- Backtest center (`/backtest`)
- Backtest history with pagination/status filter/user scope (`/backtest/history`)
- Compare page with correlation/heatmap/CSV/PDF export (`/compare`)
- Live paper trading page (`/live`)

## Runtime Model

- API + frontend static are served together
- Persistent storage uses PostgreSQL when `DATABASE_URL` is set
- If `DATABASE_URL` is missing, backtest/live data falls back to in-memory mode

## Scripts in Project Root

- `stock_kanban_update_and_run.sh`:
  One-command Linux deploy/update flow for your current Docker + Caddy setup.
  It does: `git restore .` -> `git pull` -> ensure PostgreSQL -> rebuild/start `stock-kanban-app`.
  
- `verify-database.sh`:
  Verify PostgreSQL is correctly initialized with all required tables.
  
- `check-linux-environment.sh`:  
  Pre-flight check for Linux deployment environment (Docker, Git, ports, disk space, etc).
  
- `start-dev.bat`:
  Windows-only local development launcher (opens backend + frontend terminals).

## Scripts in `deploy/`

- `deploy/docker-deploy-simple.sh`:
  Docker deploy script (uses `.env.production`, rebuilds and restarts `stock-kanban-app`).
- `deploy/start-production.sh`:
  PM2 production startup (non-Docker mode).
- `deploy/ec2-setup.sh`:
  First-time EC2 environment bootstrap helper.
- `deploy/deploy-to-ec2.bat`:
  Windows helper for EC2 deployment steps (Windows-only).

## Removed Obsolete Scripts

The following scripts were removed because they were outdated/unreferenced:

- `deploy/docker-check.sh`
- `deploy/verify-deployment.sh`
- `scripts/update-quant-metrics.sh`
- `scripts/update-quant-metrics.bat`
- `diagnose.bat`

## Local Development

### Linux/macOS

```bash
npm install
npm run dev
```

### Windows

```powershell
npm install
start-dev.bat
```

## Docker Production (Current EC2 Layout)

Your current routing is:

- Caddy -> `stock-kanban-app:3000`
- Domain: `stockkanban.aixintelligence.com`

### Quick Linux Deployment

**For first-time deployment**, follow: [LINUX_QUICKSTART.md](./LINUX_QUICKSTART.md)

**For detailed setup guide**, see: [LINUX_DEPLOYMENT_GUIDE.md](./LINUX_DEPLOYMENT_GUIDE.md)

**For environment variable configuration**, check: [ENV_CONFIGURATION_GUIDE.md](./ENV_CONFIGURATION_GUIDE.md)

**For complete review and summary**, read: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)

### One-Command Update

Once deployed, update with a single command:

```bash
./stock_kanban_update_and_run.sh
```

## Required Production Env (`.env.production`)

Minimum:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/stock_kanban
PGSSL=false
LIVE_SETTLEMENT_SCHEDULER=true
ENABLE_USER_ISOLATION=true
ADMIN_SECRET=change-me
```

## DB Initialization (Manual Option)

```bash
npm install
npm run db:prepare
npm run db:push
```

## Useful Endpoints

- `GET /api/watchlists`
- `GET /api/backtests/algorithms`
- `GET /api/backtests/history?page=1&pageSize=20`
- `POST /api/live/run`
- `GET /api/live/portfolio?algorithm=us`
- `POST /api/live/settle-now` (protected when `ADMIN_SECRET` is set)
