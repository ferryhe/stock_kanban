# Backtest Phase 2 Plan (PostgreSQL + Linux Deployment)

Date: 2026-02-07
Status: In Progress

## 1. Goal

Continue from `BACKTEST_PHASE1_IMPLEMENTATION_REPORT.md` by delivering:

- Persistent backtest storage in PostgreSQL
- Backward-compatible fallback when PostgreSQL is not configured
- Production-ready configuration guidance for Linux deployment with existing PGSQL
- Frontend/API connectivity guidance in a dedicated Markdown document

## 2. Scope

### In scope
- Extend Drizzle schema with `backtest_results` table
- Add optional DB bootstrap (`DATABASE_URL` driven)
- Persist backtest results on run
- Query backtest result by id from DB when not found in memory
- Keep existing API contracts unchanged for frontend compatibility
- Add deployment/config documentation for frontend + PGSQL

### Out of scope
- Full normalization into multiple relational backtest tables
- Async background job queue for long-running backtests
- Multi-tenant auth and row-level security

## 3. Design decisions

1. Storage model for this phase
- Use one table `backtest_results` storing:
  - core columns (`id`, `algorithm`, `start_date`, `end_date`, `initial_cash`, `created_at`)
  - JSONB payload columns (`config`, `summary`, `equity_curve`, `trades`, `metadata`)

2. Runtime behavior
- If `DATABASE_URL` exists:
  - initialize DB client
  - persist run results into PGSQL
  - read by id from PGSQL on cache miss
- If `DATABASE_URL` is absent:
  - keep Phase 1 in-memory behavior

3. Deployment behavior
- Linux deployment guide covers:
  - `.env.production` with PGSQL params
  - `npm run db:push` schema sync
  - PM2 and Docker environment wiring
  - frontend reverse-proxy/API path considerations

## 4. Validation checklist

- `npm run check` passes
- Backtest run works without DATABASE_URL
- `GET /api/backtests/:id` still returns result from memory fallback
- Documentation includes end-to-end Linux setup with existing PGSQL

## 5. Commit plan

1. `feat(db): persist backtest results in PostgreSQL with fallback`
2. `docs(deploy): add linux frontend+pgsql configuration guide`
