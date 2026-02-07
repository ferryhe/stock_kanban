# Backtest Phase 1 Plan (Aligned with stock_quant_work)

Date: 2026-02-07
Status: Approved for implementation in this branch

## 1. Scope for this iteration

This implementation follows `CONSOLIDATED_DESIGN.md` Phase 1 with a practical in-repo target:

- Deliver a runnable single-algorithm backtest loop in `stock_kanban`
- Add API endpoints to run backtests and query results
- Add frontend pages for backtest config, result visualization, and multi-algorithm comparison
- Reuse existing indicator logic through a shared module

Out of scope for this iteration:

- New standalone `stock_trading_sim` service deployment
- Database persistence for portfolios/trades/backtests
- Real-time paper trading and auth isolation

## 2. Alignment with C:\Projects\stock_quant_work

### 2.1 Confirmed upstream contract (already present)

`stock_quant_work` exports market snapshots to `quant-metrics-*.json` with:

- `metadata.generated_at_utc`
- `metadata.config_file`
- `data[]` entries containing:
  - `ticker`
  - `signal` (`BUY` / `SELL` / `HOLD` / `RISK_ALERT`)
  - `predictedReturn`
  - `score`
  - `rank`
  - `risk.vol60` and `risk.maxdd252`

This structure is already consumed by `stock_kanban` and will be reused as signal input for backtests.

### 2.2 Necessary adjustments

Because current `quant-metrics-*.json` is a latest snapshot (not daily signal history), this phase will:

- Treat one selected market snapshot (`us`/`cn`/`hk`) as one algorithm input
- Use static signal-derived target positions with periodic rebalancing over historical prices
- Compute realistic PnL from Yahoo daily close data, including commission and slippage

This preserves compatibility with the current upstream outputs while enabling Phase 1 usability.

## 3. Technical design decisions for this iteration

1. Domain model:
- Add shared backtest types in `shared/backtest.ts`

2. Engine modules:
- `server/backtest/signalProvider.ts`
- `server/backtest/priceProvider.ts`
- `server/backtest/engine.ts`
- `server/backtest/service.ts` (run + in-memory result store)

3. API endpoints:
- `GET /api/backtests/algorithms`
- `POST /api/backtests`
- `GET /api/backtests/:id`

4. Frontend routes:
- `/backtest`
- `/backtest/:id/results`
- `/compare`

5. Indicator reuse:
- Extract indicator functions to `shared/indicators.ts`
- Reuse from `server/stockService.ts`

## 4. Validation checklist

- `npm run check` passes
- Backtest API can run a `us` snapshot backtest over a date range
- Result page renders:
  - equity curve
  - summary metrics
  - trade list
- Compare page can run selected algorithms and render metric table

## 5. Commit strategy (multi-commit)

Planned commits:

1. plan+types skeleton
2. backend backtest engine + APIs + indicator extraction
3. frontend backtest/compare + docs/test guide
