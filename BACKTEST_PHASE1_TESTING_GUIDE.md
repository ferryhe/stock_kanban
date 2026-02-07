# Backtest Phase 1 Testing Guide

Date: 2026-02-07

## 1. Start the app

```bash
npm run dev
```

Open: `http://localhost:5000`

## 2. Verify backtest center

Path: `/backtest`

- [ ] Algorithm dropdown loads available values (`US`, `CN`, `HK` if data files exist)
- [ ] Default date range and cash fields are prefilled
- [ ] Clicking `Run Backtest` navigates to `/backtest/:id/results`

Expected:
- No runtime errors in browser console
- API request `POST /api/backtests` returns 200

## 3. Verify result page

Path: `/backtest/:id/results`

- [ ] Metric cards render (final value, return, annualized, sharpe, max drawdown, volatility)
- [ ] Equity chart renders non-empty line
- [ ] Trades table displays recent trades

Expected:
- Result data comes from `GET /api/backtests/:id`

## 4. Verify compare page

Path: `/compare`

- [ ] Select at least two algorithms
- [ ] Run compare successfully
- [ ] Multi-line equity chart renders
- [ ] Summary table includes all selected algorithms

Expected:
- API request `POST /api/backtests/compare` returns list of results

## 5. Verify dashboard entry points

Path: `/`

- [ ] Header has quick action icon for Backtest (`/backtest`)
- [ ] Header has quick action icon for Compare (`/compare`)

## 6. API smoke checks (optional)

```bash
curl http://localhost:5000/api/backtests/algorithms
```

```bash
curl -X POST http://localhost:5000/api/backtests \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm":"us",
    "startDate":"2025-10-01",
    "endDate":"2025-12-31",
    "initialCash":100000,
    "positionParams":{"maxPositionPerStock":0.1,"maxTotalPositions":10,"minCashReserve":0.1},
    "executionParams":{"commissionBps":5,"slippageBps":5,"minCommission":1},
    "options":{"rebalanceFrequency":"weekly","benchmark":"SPY"}
  }'
```

## 7. Type-check gate

```bash
npm run check
```

Expected:
- `tsc` exits with code 0

## If issues are found

Please report:
1. Which step failed
2. Request URL and payload (if API-related)
3. Error message and stack trace (if available)
4. Screenshot if UI rendering is incorrect
