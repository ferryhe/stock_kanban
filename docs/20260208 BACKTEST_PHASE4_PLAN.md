# Backtest Phase 4 Plan (History API + History UI)

Date: 2026-02-08
Status: Completed

## Mapping to `CONSOLIDATED_DESIGN.md`

- This is an internal execution phase.
- Primary mapping: original `Phase 2` (multi-algorithm compare and query/visualization enhancement).

## 1. Goal

Implement the next step after Phase 3:

- Add backtest history list API
- Add frontend history page with algorithm/date filters
- Keep compatibility with current backtest run/result pages

This phase follows `CONSOLIDATED_DESIGN.md` and extends the Phase 3 normalized persistence.

## 2. Scope

### In scope
- Backend:
  - `GET /api/backtests/history`
  - Query by `algorithm`, `runDateFrom`, `runDateTo`, `limit`
  - Data source: `portfolios` + `strategies` + `strategy_performance` (+ `backtest_results` fields)
  - In-memory fallback when PostgreSQL is not enabled
- Frontend:
  - New page `/backtest/history`
  - Filters: algorithm/date
  - Link to result page `/backtest/:id/results`
- Documentation:
  - Phase 4 implementation report
  - Phase 4 testing guide
  - UI operation guide update

### Out of scope
- User-level permission isolation (`user_id`)
- Advanced pagination UI
- Export/download capability

## 3. Technical decisions

1. History items will include run metadata and key metrics:
   - algorithm, run time, backtest period, status
   - final value, total return, sharpe, max drawdown, total trades
2. Date filter is based on run time (`portfolios.created_at`).
3. API response order is latest run first.
4. Use shared TypeScript types in `shared/backtest.ts` for consistent API contract.

## 4. Validation checklist

- `npm run check` passes
- Docker PostgreSQL path:
  - `npm run db:prepare`
  - `npm run db:push`
- At least two runs are inserted and queryable through history API
- Filters produce expected subset:
  - algorithm filter
  - date range filter

## 5. Commit plan

1. docs: add phase4 plan
2. feat(api): backtest history list endpoint and service/repository query
3. feat(ui): add backtest history page and route/navigation
4. docs: add phase4 implementation report + testing guide + UI guide update
