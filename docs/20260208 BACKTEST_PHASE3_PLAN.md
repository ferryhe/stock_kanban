# Backtest Phase 3 Plan (Core Trading Tables from CONSOLIDATED_DESIGN 3.1)

Date: 2026-02-08
Status: Completed

## Mapping to `CONSOLIDATED_DESIGN.md`

- This is an internal execution phase.
- Primary mapping: section `3.1 核心表结构` under the original `Phase 1` core backtest capability.

## 1. Goal

Implement the next step from `CONSOLIDATED_DESIGN.md` section `3.1 核心表结构`:

- Add normalized PostgreSQL tables for trading domain
- Persist backtest output into these tables in addition to `backtest_results`
- Keep existing API behavior backward-compatible

## 2. Scope

### In scope
- Schema additions in `shared/schema.ts`:
  - `strategies`
  - `portfolios`
  - `holdings`
  - `trades`
  - `daily_settlements`
  - `strategy_performance`
- Persist mapping from a completed backtest result to these tables
- SQL helper file in `deploy/sql/`
- Basic persistence summary query endpoint for verification

### Out of scope
- Multi-user authorization for portfolio data
- Real-time trading task scheduler
- Advanced risk module execution

## 3. Implementation decisions

1. IDs use UUID-like string defaults (`gen_random_uuid()::text`) to stay compatible with current `users.id` varchar schema.
2. Keep `backtest_results` as canonical payload table for API compatibility.
3. Add normalized records for analytics and operational query:
   - one strategy (reuse by algorithm)
   - one portfolio per backtest run
   - many trades and settlements
   - one performance snapshot per run date
   - final holdings snapshot
4. Add persistence summary query by `backtest_result_id`.

## 4. Validation checklist

- `npm run check` passes
- `npm run db:prepare && npm run db:push` passes
- Backtest run writes to:
  - `backtest_results`
  - `portfolios`
  - `trades`
  - `daily_settlements`
  - `strategy_performance`
  - `holdings`
- API summary endpoint reflects inserted counts

## 5. Commit plan

1. docs move for phase2 files with date prefix in `docs/`
2. feat(schema+persistence): core trading tables and write mapping
3. feat(api): persistence summary endpoint
4. docs: phase3 implementation/testing reports
