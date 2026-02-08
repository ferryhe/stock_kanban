# Backtest Phase 3 Implementation Report

Date: 2026-02-08
Status: Completed

## 1. Objective

Based on `CONSOLIDATED_DESIGN.md` section `3.1 核心表结构`, this phase adds normalized trading tables and persistence mapping on top of Phase 2 payload storage.

## 2. Delivered Changes

### 2.1 Schema expansion (`shared/schema.ts`)

Added core trading domain tables:

- `strategies`
- `portfolios`
- `holdings`
- `trades`
- `daily_settlements`
- `strategy_performance`

And kept existing payload table:
- `backtest_results`

Added indexes and uniqueness constraints matching design intent:
- portfolio/date indexes for settlements and trades
- unique `(portfolio_id, ticker)` for holdings
- unique `(portfolio_id, calculation_date)` for performance

### 2.2 Persistence mapping (`server/backtest/repository.ts`)

Enhanced `saveBacktestResultToDb`:
- writes `backtest_results`
- reuses or creates one strategy by algorithm
- creates one portfolio per run
- writes all trade rows
- writes all daily settlement rows
- writes one strategy performance row
- computes and writes final holdings snapshot

All writes are executed in one DB transaction.

### 2.3 Service and API updates

- `server/backtest/service.ts`
  - Added `getBacktestPersistenceSummary(id)`
- `server/routes.ts`
  - Added endpoint: `GET /api/backtests/:id/persistence`

### 2.4 SQL helper

Added manual SQL file:
- `deploy/sql/002_core_trading_tables.sql`

## 3. Validation Results

Environment:
- Windows local
- Docker PostgreSQL (`postgres:16-alpine`)
- DB URL: `postgresql://stock_user:stock_pass@127.0.0.1:55432/stock_kanban_test`

Commands passed:
- `npm run check`
- `npm run db:prepare`
- `npm run db:push`

Backtest test run result:
- backtest id: `72410fea-2af1-48bb-83f9-2d8d049f413e`
- total return: `-0.17229447650070195`
- persistence summary:
  - strategyId: present
  - portfolioId: present
  - tradeCount: `129`
  - settlementCount: `64`
  - holdingCount: `10`
  - performanceCount: `1`

Direct SQL verification:
- `backtest_results`: 1
- `strategies`: 1
- `portfolios`: 1
- `trades`: 129
- `daily_settlements`: 64
- `holdings`: 10
- `strategy_performance`: 1

## 4. Compatibility

- Existing API contract for `/api/backtests` and `/api/backtests/:id` remains compatible.
- If `DATABASE_URL` is absent, app still works with in-memory fallback.

## 5. Next Recommended Step

Move from single-result persistence to queryable history features:
1. `GET /api/backtests/history` list endpoint from `portfolios + strategy_performance`
2. Frontend history page with filters (algorithm/date/status)
3. Optional auth binding (`portfolios.user_id`) for per-user isolation
