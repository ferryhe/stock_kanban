# Backtest UI Operation Guide

Date: 2026-02-08
Scope: New backtest UI pages in `stock_kanban`

## 1. Entry Points

You can enter the new flow in two ways:

1. Dashboard header icons
- Flask icon -> `/backtest`
- Chart icon -> `/compare`

2. Direct routes
- Backtest center: `/backtest`
- Backtest result: `/backtest/:id/results`
- Compare page: `/compare`

## 2. Backtest Center (`/backtest`)

Main purpose:
- Configure one algorithm and run one backtest.

Key fields:
- `Algorithm`: `US` / `CN` / `HK` (depends on available quant files)
- `Start Date` / `End Date`
- `Initial Cash`
- Position settings:
  - `Max Position Per Stock`
  - `Max Total Positions`
  - `Min Cash Reserve`
- Execution settings:
  - `Commission (bps)`
  - `Slippage (bps)`
  - `Min Commission`
- `Rebalance`: `daily` / `weekly` / `monthly`

Operation steps:
1. Open `/backtest`
2. Fill parameters
3. Click `Run Backtest`
4. Auto jump to `/backtest/:id/results`

Expected behavior:
- request `POST /api/backtests`
- successful response returns a backtest id

## 3. Backtest Result Page (`/backtest/:id/results`)

Main purpose:
- Inspect one run in detail.

What to check:
- Metric cards:
  - final value
  - total return
  - annualized return
  - max drawdown
  - sharpe ratio
  - volatility
  - total trades
  - win rate
- Equity curve chart
- Trades table (recent records)

Operation tips:
- Use `New Backtest` to rerun with changed parameters.
- Use `Compare` to switch to multi-algorithm view.

## 4. Compare Page (`/compare`)

Main purpose:
- Run multiple algorithms under same config and compare outcomes.

Operation steps:
1. Open `/compare`
2. Select at least 2 algorithms
3. Set shared config (date, cash, position/execution params)
4. Click `Run Compare`

Expected outputs:
- Multi-line equity chart (one line per algorithm)
- Summary table with aligned metrics across algorithms

API behind this page:
- `POST /api/backtests/compare`

## 5. Recommended Test Script (UI)

1. Run one backtest in `/backtest`
2. Confirm result page loads chart + table
3. Open `/compare`, run at least two algorithms
4. Confirm compare chart and summary table update
5. Refresh result URL directly and confirm data still loads
   - with PostgreSQL configured, result remains queryable after service restart

## 6. Common Issues

1. Algorithm list empty
- check `/api/backtests/algorithms`
- ensure `data/quant-metrics-*.json` exists

2. Backtest submit fails
- inspect backend logs
- verify date range has valid market data

3. Result disappears after restart
- likely running without `DATABASE_URL`
- configure PostgreSQL and run `npm run db:prepare && npm run db:push`

4. Compare is slow
- expected when many tickers/long periods
- reduce date range or number of algorithms for quick checks
