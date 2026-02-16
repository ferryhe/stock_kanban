# Backtest Phase 4 Implementation Report

Date: 2026-02-08
Status: Completed
Mapping: Internal execution phase, aligned mainly to `CONSOLIDATED_DESIGN.md` original `Phase 2` subset

## 1. Objective

Implement the next step from Phase 3 recommendation:

1. `GET /api/backtests/history` list API
2. Frontend history page with algorithm/date filters
3. Keep existing backtest flow compatible

## 2. Delivered Changes

## 2.1 Shared contract

Updated `shared/backtest.ts`:
- `BacktestHistoryQuery`
- `BacktestHistoryItem`

This keeps backend and frontend aligned for history API payload and query fields.

## 2.2 Backend history API

### Repository (`server/backtest/repository.ts`)
- Added `listBacktestHistoryFromDb(query)`:
  - source tables: `portfolios` + `strategies` + `strategy_performance`
  - filters:
    - `algorithm`
    - `runDateFrom`
    - `runDateTo`
    - `limit` (clamped to `1..200`)
  - sorting: latest run first (`created_at desc`)

### Service (`server/backtest/service.ts`)
- Added `normalizeBacktestHistoryQuery(input)`
- Added `getBacktestHistory(query)`
  - DB path: uses repository query
  - fallback path: in-memory cache when `DATABASE_URL` is not set

### Routes (`server/routes.ts`)
- Added endpoint:
  - `GET /api/backtests/history`
- Route is placed before `GET /api/backtests/:id` to avoid path conflict.

## 2.3 Frontend history page

### API hook (`client/src/lib/stockApi.ts`)
- Added `useBacktestHistory(query)`

### New page (`client/src/pages/BacktestHistoryPage.tsx`)
- Route: `/backtest/history`
- Filters:
  - algorithm (`all/us/cn/hk`)
  - run date range (`runDateFrom` / `runDateTo`)
- List columns:
  - run time
  - algorithm
  - backtest period
  - final value
  - total return
  - sharpe
  - max drawdown
  - trades
  - status
- Row action:
  - `View` -> `/backtest/:id/results`

### Navigation updates
- Added route in `client/src/App.tsx`
- Added history entry links in:
  - `BacktestCenter`
  - `BacktestResultsPage`
  - `ComparePage`
  - `Dashboard` (history icon)

## 2.4 Deployment/UI docs update

- Updated `BACKTEST_UI_OPERATION_GUIDE.md` with `/backtest/history` operation guide.
- Updated `LINUX_FRONTEND_PGSQL_CONFIG.md`:
  - include `deploy/sql/002_core_trading_tables.sql`
  - include history API verification commands

## 3. Validation Results

Environment:
- Windows + Docker PostgreSQL
- DB: `postgresql://stock_user:stock_pass@127.0.0.1:55432/stock_kanban_test`

Automated checks passed:
- `npm run check`
- `npm run build`
- `npm run db:prepare`
- `npm run db:push`

History API smoke test:
- Created runs:
  - `418b61a9-068d-4664-b07a-6af49678d008` (`us`)
  - `c73de361-eee2-4823-82a3-8165995e8f82` (`hk`)
- Query results:
  - `all`: 2
  - `algorithm=us`: 1
  - `algorithm=hk`: 1
  - `runDateFrom=today&runDateTo=today`: 2

Route-level verification (`/api/backtests/history`) also returned expected filtered counts.

## 4. Compatibility

- Existing endpoints keep behavior:
  - `POST /api/backtests`
  - `GET /api/backtests/:id`
  - `POST /api/backtests/compare`
- When PostgreSQL is disabled, history API still works against in-memory run cache.

## 5. Next Recommended Step

1. Add pagination metadata (`total`, `page`, `pageSize`) for large histories.
2. Add optional `status` and `backtest period` filters.
3. Bind history to user scope using `portfolios.user_id`.
