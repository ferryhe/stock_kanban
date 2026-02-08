# Backtest Original Phase 3 Wave 1 Plan

Date: 2026-02-08
Status: In Progress
Mapping: `CONSOLIDATED_DESIGN.md` original `Phase 3` Week 1 (实时交易基础)

## 1. Goal

Deliver the first executable slice of original Phase 3 Week 1:

1. Real-time paper trading (non-backtest) execution
2. Daily auto-settlement scheduled task
3. Real-time holdings and PnL display

## 2. Scope

### In scope
- Backend:
  - `POST /api/live/run` execute one paper-trading rebalance cycle
  - `GET /api/live/portfolio` read current live portfolio snapshot
  - scheduler: periodic daily settlement for live portfolios
  - reuse existing `strategies/portfolios/holdings/trades/daily_settlements` tables with `type='live'`
- Frontend:
  - new page `/live`
  - run-now action + current holdings + PnL cards + recent trades
- Validation:
  - DB-backed live run smoke
  - scheduler one-shot settlement validation

### Out of scope
- Real broker execution
- Intraday websocket streaming
- Advanced risk manager (Phase 3 Week 3)

## 3. Design decisions

1. Live trading uses latest available daily close from Yahoo as execution reference price.
2. Rebalance logic follows simplified target allocation from BUY signals.
3. Scheduler runs at configurable interval and only writes one settlement row per day per portfolio.
4. User isolation continues through `x-user-id`.

## 4. Validation checklist

- `npm run check`
- `npm run build`
- with PostgreSQL:
  - run `POST /api/live/run`
  - verify portfolio/holdings/trades change
  - run scheduler one-shot and verify `daily_settlements` for today
- `/live` page shows current value/cash/holdings/trades

## 5. Commit plan

1. docs: add original phase3 wave1 plan
2. feat(api): add live paper trading service + scheduler + routes
3. feat(ui): add live trading dashboard page
4. docs: add wave1 implementation/testing reports + align original plan checkboxes
