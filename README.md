# Stock Kanban

> **A Full-Stack Stock Dashboard with Backtesting & Live Paper Trading**  
> Version 1.0 | Last Updated: February 16, 2026

Stock Kanban is a comprehensive stock market analysis and trading simulation platform. It combines real-time market data, algorithmic backtesting, and live paper trading with a robust user authentication and multi-tenant architecture.

Frontend and API are served by one Node process with PostgreSQL persistence.

## ✨ Core Features

### 📊 Stock Market Analysis
- **Real-time Dashboard** - Live stock data with technical indicators (RSI, MACD, SMA, EMA, Bollinger Bands)
- **Watchlists** - Track and monitor multiple stocks
- **Compare Page** - Correlation analysis, heatmaps, CSV/PDF export
- **Multi-Market Support** - US and Hong Kong stocks with localized names

### 🔬 Backtesting Engine
- **Multi-Algorithm Support** - Test multiple trading strategies simultaneously
- **Historical Analysis** - Backtest with historical market data
- **Performance Metrics** - Sharpe ratio, max drawdown, win rate, profit factor
- **Backtest History** - Paginated history with status filters and user scope (`/backtest/history`)
- **Results Comparison** - Side-by-side algorithm performance analysis

### 📈 Live Paper Trading
- **Virtual Trading** - Real-time paper trading with simulated capital
- **Portfolio Management** - Multi-portfolio support with visibility controls
- **Risk Management** - Position limits, daily loss limits, exposure controls
- **Daily Settlements** - Automated end-of-day portfolio valuation
- **Trade History** - Complete audit trail of all trades

### 👥 User Management
- **Email Authentication** - Secure registration, login, password reset
- **Role-Based Permissions** - User, Analyst, Admin, SuperAdmin roles
- **Multi-Tenant Architecture** - Complete user data isolation
- **API Keys** - Programmatic access with scoped permissions
- **Rankings & Leaderboards** - Public/private ranking system

## 🏗️ Architecture

- **Frontend**: React 19 + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket for live updates
- **API**: RESTful endpoints with session-based authentication

### Runtime Model
- API + frontend static assets served by single Node process
- PostgreSQL for persistent storage (configurable via `DATABASE_URL`)
- Automatic fallback to in-memory mode when database unavailable
- Production deployment via Docker + Caddy reverse proxy

## 📊 Project Status

**Current Version**: 1.0 (Production Ready)  
**Last Major Update**: February 16, 2026

### ✅ Completed Features (Phases 1-5)
- ✅ **Phase 1**: Backtest engine core implementation
- ✅ **Phase 2**: PostgreSQL persistence layer
- ✅ **Phase 3**: Multi-algorithm comparison
- ✅ **Phase 4**: Backtest history UI
- ✅ **Phase 5**: Live trading & user authentication

### 🚀 Next Steps (Phase 6)
See [Phase 6 Development Plan](./docs/Plans/20260216 DEVELOPMENT_PLAN_PHASE6.md) for details:
- Performance optimization (frontend & backend)
- Enhanced user experience (customizable dashboards, PWA)
- Advanced trading features (strategy builder, analytics)
- Infrastructure improvements (monitoring, testing, CI/CD)
- Security hardening (rate limiting, audits)

**Target Timeline**: Q2 2026 (16 weeks)

---

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

**Documentation**: [Deployment Index](./docs/Summaries/DEPLOYMENT_INDEX.md)

### For Windows Local Development

```bash
start-dev.bat
```

This opens two terminals:
- **Backend**: Node.js API (http://localhost:3000)
- **Frontend**: Vite dev server (http://localhost:5000)

**Documentation**: [Local Development Guide](./docs/Guides/LOCAL_DEVELOPMENT.md)

## 📂 Project Structure

### Root Scripts
- `stock_kanban_update_and_run.sh` - One-command Linux deploy & update
- `start-dev.bat` - Windows local development launcher

### Key Directories
- `client/` - React frontend application
- `server/` - Express backend API
- `shared/` - Shared TypeScript types and schemas
- `docs/` - Comprehensive documentation (reorganized Feb 2026)
- `deploy/` - Deployment scripts and SQL migrations
- `scripts/` - Utility scripts for development

### Deploy Scripts
Located in `deploy/`:
- `check-linux-environment.sh` - Pre-flight environment check
- `verify-database.sh` - Database initialization verification
- `sql/` - Database migration scripts

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

Minimum required environment variables:

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

# Email Configuration (for authentication)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@stockkanban.com
```

See `.env.production.example` in the repository for complete configuration options.

## 📚 Documentation

> **New!** Documentation has been reorganized for easier navigation. See [docs/README.md](./docs/README.md) for the complete index.

### 🚀 Quick Links

| Category | Document | Description |
|----------|----------|-------------|
| **Getting Started** | [Local Development](./docs/Guides/LOCAL_DEVELOPMENT.md) | Windows/Linux dev setup |
| **Getting Started** | [Deployment Index](./docs/Summaries/DEPLOYMENT_INDEX.md) | Production deployment guides |
| **Architecture** | [Consolidated Design](./docs/Summaries/CONSOLIDATED_DESIGN.md) | Complete system architecture |
| **User Management** | [User Permissions](./docs/Summaries/USER_PERMISSION_MANAGEMENT.md) | Authentication & authorization |
| **Development** | [Development Guide](./docs/Guides/DEVELOPMENT_GUIDE.md) | Developer documentation index |
| **Planning** | [Phase 6 Development Plan](./docs/Plans/20260216 DEVELOPMENT_PLAN_PHASE6.md) | Next development priorities |

### 📂 Documentation Structure

- **[Plans/](./docs/Plans)** - Development roadmaps and feature planning
- **[Reports/](./docs/Reports)** - Implementation and testing reports
- **[Guides/](./docs/Guides)** - User and developer guides
- **[Summaries/](./docs/Summaries)** - Architecture and system overviews
- **[References/](./docs/References)** - Technical references and best practices
- **[Archive/](./docs/Archive)** - Historical documentation

## DB Initialization (Manual Option)

```bash
npm install
npm run db:prepare
npm run db:push
```

## 🌐 API Endpoints

### Core Services
```
Stock Data & Watchlists
GET  /api/watchlists              # Get user watchlists
POST /api/watchlists              # Create watchlist
GET  /api/stock/:symbol           # Get stock details

Backtesting
GET  /api/backtests/algorithms    # List available algorithms
POST /api/backtests/run           # Run backtest
GET  /api/backtests/history       # Backtest history (paginated)

Live Trading
POST /api/live/run                # Start live trading
GET  /api/live/portfolio          # Get portfolio status
POST /api/live/settle-now         # Trigger settlement (admin)

Authentication
POST /api/auth/register           # Register new user
POST /api/auth/login              # Login
POST /api/auth/logout             # Logout
GET  /api/auth/me                 # Get current user
POST /api/auth/verify-email       # Verify email
POST /api/auth/forgot-password    # Request password reset
POST /api/auth/reset-password     # Reset password

User Management
GET  /api/profile                 # Get user profile
PUT  /api/profile                 # Update profile
GET  /api/rankings                # Get leaderboard
POST /api/api-keys                # Create API key
GET  /api/api-keys                # List API keys
```

See [API Documentation](./docs/Summaries/USER_PERMISSION_MANAGEMENT.md) for complete endpoint reference.

---

## 🔒 Security Features

- **Password Security**: Bcrypt hashing with salt rounds
- **Email Verification**: Required for new accounts
- **Session Management**: Secure cookie-based sessions
- **Password Reset**: Time-limited reset tokens
- **Password Requirements**: Strong password validation (8+ chars, mixed case, numbers, special chars)
- **API Keys**: Scoped access with permission levels
- **CSRF Protection**: Built-in CSRF token validation
- **User Isolation**: Complete multi-tenant data separation
- **Role-Based Access**: Hierarchical permission system

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **Styling**: TailwindCSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Charts**: Recharts
- **Form Handling**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle
- **Authentication**: Passport.js + bcryptjs
- **Email**: Nodemailer
- **Real-time**: WebSocket (ws)
- **Market Data**: Yahoo Finance 2

### DevOps
- **Containerization**: Docker
- **Reverse Proxy**: Caddy
- **Process Manager**: PM2
- **Database Migrations**: Drizzle Kit

---

## 🤝 Contributing

Contributions are welcome! Please read the [Development Guide](./docs/Guides/DEVELOPMENT_GUIDE.md) first.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (local dev environment)
5. Submit a pull request

### Code Quality
- Follow TypeScript best practices
- Add tests for new features
- Update documentation as needed
- Ensure all existing tests pass

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📮 Support & Feedback

- **Issues**: GitHub Issues for bugs and feature requests
- **Documentation**: See [docs/README.md](./docs/README.md)
- **Development Plan**: [Phase 6 Roadmap](./docs/Plans/20260216 DEVELOPMENT_PLAN_PHASE6.md)

---

**Built with ❤️ for traders and developers**
