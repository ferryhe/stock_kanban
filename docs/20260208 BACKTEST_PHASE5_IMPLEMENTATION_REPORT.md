# Backtest Phase 5 Implementation Report

Date: 2026-02-08
Status: Completed

## 1. Objective

Implement the requested next step:

1. History pagination
2. History status filter
3. User isolation using `user_id`

## 2. Delivered Changes

## 2.1 Shared API contract

Updated `shared/backtest.ts`:
- `BacktestStatus` enum type
- `BacktestHistoryQuery` adds:
  - `status`
  - `page`
  - `pageSize`
- `BacktestHistoryItem` adds:
  - `userId`
- New `BacktestHistoryResponse`:
  - `{ items, page, pageSize, total, totalPages }`

## 2.2 Backend implementation

### Routes (`server/routes.ts`)
- Added user extraction from request:
  - header: `x-user-id`
  - fallback: `query.userId` or `body.userId`
- User context is passed to:
  - `POST /api/backtests`
  - `POST /api/backtests/compare`
  - `GET /api/backtests/history`
  - `GET /api/backtests/:id`
  - `GET /api/backtests/:id/persistence`

### Service (`server/backtest/service.ts`)
- Added `normalizeBacktestUserId()`
- Extended history query normalization with:
  - `status` validation
  - `page` / `pageSize`
- Added request context (`userId`) across run/query methods
- In-memory fallback now also respects user scope and pagination shape

### Repository (`server/backtest/repository.ts`)
- Persist backtest with user context:
  - `saveBacktestResultToDb(result, userId?)`
  - portfolio rows write `user_id`
- Added automatic external user provisioning:
  - if `user_id` does not exist in `users`, create lightweight user row
  - avoids FK failures on `portfolios.user_id -> users.id`
- History DB query now supports:
  - `user_id` isolation
  - `status` filter
  - `page` + `pageSize`
  - `total` counting
- Result/persistence lookup now supports user-scoped access checks

## 2.3 Frontend implementation

### API layer (`client/src/lib/stockApi.ts`)
- Added local user scope helpers:
  - `getBacktestUserId()`
  - `setBacktestUserId()`
- Default user id: `demo-user`
- Backtest APIs now send `x-user-id`:
  - run
  - compare
  - result fetch
  - history fetch
- `useBacktestHistory` now consumes paginated response

### Pages
- `BacktestCenter`:
  - user id input
- `ComparePage`:
  - user id input
- `BacktestHistoryPage`:
  - user id input
  - status filter
  - page size selector
  - prev/next pagination controls
  - total/page metadata display

## 2.4 Documentation updates

- `BACKTEST_UI_OPERATION_GUIDE.md`:
  - user id workflow
  - status filter and pagination usage
- `LINUX_FRONTEND_PGSQL_CONFIG.md`:
  - `x-user-id` examples
  - paginated history query examples
  - user isolation note
- `README.md`:
  - updated history API and user isolation summary

## 3. Validation Results

Environment:
- Windows + Docker PostgreSQL
- DB: `postgresql://stock_user:stock_pass@127.0.0.1:55432/stock_kanban_test`

Checks passed:
- `npm run check`
- `npm run build`
- `npm run db:prepare`
- `npm run db:push`

Service-level verification:
- Created:
  - `alpha_user`: 2 runs
  - `beta_user`: 1 run
- Updated one `alpha_user` portfolio status to `failed` for filter verification
- Results:
  - `alpha_user` page1/pageSize1 -> total=2, totalPages=2, items=1
  - `alpha_user` status=failed -> total=1
  - `alpha_user` status=completed -> total=1
  - `beta_user` total=1, items all `userId=beta_user`

Route-level verification (`/api/backtests/history` with headers):
- `x-user-id: alpha_user`:
  - paginated query returns only alpha rows
  - status=failed returns 1 row
- `x-user-id: beta_user`:
  - returns only beta rows

## 4. Notable Fix During Validation

Issue:
- FK error on `portfolios.user_id` when using external `x-user-id`

Fix:
- Added auto-provision logic for external users before portfolio insert.

## 5. Next Recommended Step

1. Replace lightweight `x-user-id` isolation with real auth/session binding.
2. Add DB indexes for status/date/user combined filtering if history volume grows.
3. Add page jump + server-driven sorting options in history UI.
