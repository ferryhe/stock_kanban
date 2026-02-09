# Backtest Phase 3 Testing Guide

Date: 2026-02-08

## 1. Preparation

Set database connection in current shell:

```powershell
$env:DATABASE_URL="postgresql://stock_user:stock_pass@127.0.0.1:55432/stock_kanban_test"
$env:PGSSL="false"
```

Initialize DB:

```bash
npm run db:prepare
npm run db:push
```

## 2. Run one backtest

```bash
curl -X POST http://127.0.0.1:5000/api/backtests \
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

Record the returned `id`.

## 3. Verify persistence summary endpoint

```bash
curl http://127.0.0.1:5000/api/backtests/<ID>/persistence
```

Expected:
- `strategyId` and `portfolioId` not null
- `tradeCount > 0`
- `settlementCount > 0`
- `performanceCount = 1`

## 4. Verify SQL row counts

```sql
select count(*) from backtest_results;
select count(*) from strategies;
select count(*) from portfolios;
select count(*) from trades;
select count(*) from daily_settlements;
select count(*) from holdings;
select count(*) from strategy_performance;
```

Expected:
- all counts increase after each successful backtest run

## 5. Windows verified sample (2026-02-08)

Sample run id:
- `72410fea-2af1-48bb-83f9-2d8d049f413e`

Observed summary:
- `tradeCount = 129`
- `settlementCount = 64`
- `holdingCount = 10`
- `performanceCount = 1`

Observed SQL counts:
- `backtest_results = 1`
- `strategies = 1`
- `portfolios = 1`
- `trades = 129`
- `daily_settlements = 64`
- `holdings = 10`
- `strategy_performance = 1`

## 6. Failure diagnostics

If `persistence` endpoint returns null ids:
1. check `DATABASE_URL` in process environment
2. check server logs for `[Backtest] Failed to persist result to PostgreSQL`
3. rerun `npm run db:prepare && npm run db:push`
4. verify DB connectivity with `psql "$DATABASE_URL" -c "select now();"`
