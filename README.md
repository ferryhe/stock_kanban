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

## 🚀 Quick Start

### For Linux Deployment

```bash
# Step 1: Pre-flight check (optional)
bash deploy/check-linux-environment.sh

# Step 2: Configure environment
cp .env.production.example .env.production
nano .env.production

# Step 3: Deploy
chmod +x stock_kanban_update_and_run.sh
./stock_kanban_update_and_run.sh

# Step 4: Verify
bash deploy/verify-database.sh
```

**Documentation**: [Linux Deployment Guide](./docs/DEPLOYMENT_INDEX.md)

### For Windows Local Development

```bash
start-dev.bat
```

This opens two terminals:
- **Backend**: Node.js API (http://localhost:3000)
- **Frontend**: Vite dev server (http://localhost:5000)

**Documentation**: [Local Development](./docs/LOCAL_DEVELOPMENT.md)

## 📂 Project Scripts

### Root Scripts
- `stock_kanban_update_and_run.sh` - One-command Linux deploy & update
- `start-dev.bat` - Windows local development launcher

### Deploy Scripts
Located in `deploy/`:
- `check-linux-environment.sh` - Pre-flight environment check
- `verify-database.sh` - Database initialization verification
- `sql/` - Database initialization scripts

See [PROJECT_CLEANUP.md](./PROJECT_CLEANUP.md) for file organization guide.

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

Your current routing:
- **Caddy** reverse proxy → `stock-kanban-app:3000`
- **Domain**: `stockkanban.aixintelligence.com` (HTTPS via Caddy)

### One-Command Update

After initial deployment, update anytime with:

```bash
./stock_kanban_update_and_run.sh
```

This automatically:
1. Pulls latest code
2. Checks database connection
3. Rebuilds Docker image
4. Restarts application

## Required Production Env (`.env.production`)

See [ENV_CONFIGURATION_GUIDE](./docs/ENV_CONFIGURATION_GUIDE.md) for all options.

Minimum required:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (choose one):
# Option A: Auto-create (leave empty)
# Option B: Existing PostgreSQL
DATABASE_URL=postgresql://stock_user:password@host:5432/stock_kanban
# Option C: Cloud database (RDS, Azure, etc.)

# Frontend & Security
VITE_API_BASE_URL=https://stockkanban.aixintelligence.com
ADMIN_SECRET=<generate: openssl rand -base64 32>
ENABLE_USER_ISOLATION=true
```

## 📚 Documentation Index

### Getting Started
| Document | Purpose |
|----------|---------|
| [Linux Quick Start](./docs/LINUX_QUICKSTART.md) | 5-minute deployment guide |
| [Local Development](./docs/LOCAL_DEVELOPMENT.md) | Windows/Linux dev setup |
| [Deployment Index](./docs/DEPLOYMENT_INDEX.md) | All deployment docs |

### Configuration & Reference
| Document | Content |
|----------|---------|
| [Environment Variables](./docs/ENV_CONFIGURATION_GUIDE.md) | All .env options explained |
| [Linux Deployment Guide](./docs/LINUX_DEPLOYMENT_GUIDE.md) | Comprehensive deployment guide |
| [PostgreSQL Config](./docs/LINUX_FRONTEND_PGSQL_CONFIG.md) | Database & frontend setup |

### Development
| Document | Topic |
|----------|-------|
| [Development Docs](./docs/DEVELOPMENT_GUIDE.md) | Development docs index |
| [Architecture](./docs/CONSOLIDATED_DESIGN.md) | System architecture & design |
| [Backtest Guide](./docs/BACKTEST_UI_OPERATION_GUIDE.md) | Backtest functionality |

### Cleanup
- [Project Cleanup Guide](./PROJECT_CLEANUP.md) - File organization & cleanup instructions

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
