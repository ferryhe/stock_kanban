# Backtest Original Phase 3 Wave 1 Testing Guide

Date: 2026-02-08  
Scope: original `Phase 3` Week 1 live paper-trading baseline

## 1. Preparation

Set DB env (PowerShell):

```powershell
$env:DATABASE_URL="postgresql://stock_user:stock_pass@127.0.0.1:55432/stock_kanban_test"
$env:PGSSL="false"
```

Initialize schema:

```bash
npm run db:prepare
npm run db:push
```

Optional reset:

```bash
docker exec -i stock-kanban-pg-test psql -U stock_user -d stock_kanban_test -c "TRUNCATE TABLE strategy_performance, daily_settlements, trades, holdings, portfolios, strategies, backtest_results, users RESTART IDENTITY CASCADE;"
```

## 2. Start application

```bash
npm run dev
```

## 3. API test steps

## 3.1 Run one live cycle

```bash
curl -X POST http://127.0.0.1:5000/api/live/run \
  -H "x-user-id: live_demo_a" \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"us"}'
```

Expected:
- HTTP 200
- `tradeCount >= 0`
- `portfolio` object returned

## 3.2 Read live snapshot

```bash
curl -H "x-user-id: live_demo_a" "http://127.0.0.1:5000/api/live/portfolio?algorithm=us"
```

Expected:
- contains `portfolioId`, `cash`, `totalValue`
- contains `holdings[]` and `recentTrades[]`

## 3.3 Verify user isolation

Run another user:

```bash
curl -X POST http://127.0.0.1:5000/api/live/run \
  -H "x-user-id: live_demo_b" \
  -H "Content-Type: application/json" \
  -d '{"algorithm":"us"}'
```

Query both snapshots:

```bash
curl -H "x-user-id: live_demo_a" "http://127.0.0.1:5000/api/live/portfolio?algorithm=us"
curl -H "x-user-id: live_demo_b" "http://127.0.0.1:5000/api/live/portfolio?algorithm=us"
```

Expected:
- different `portfolioId`
- each user sees own live portfolio state

## 3.4 Trigger settlement manually

```bash
curl -X POST http://127.0.0.1:5000/api/live/settle-now
```

Expected:
- returns `{ processedPortfolios, settledPortfolios }`
- both numbers are non-negative

## 3.5 DB verification

```bash
docker exec -i stock-kanban-pg-test psql -U stock_user -d stock_kanban_test -c "select count(*) from portfolios where type='live';"
docker exec -i stock-kanban-pg-test psql -U stock_user -d stock_kanban_test -c "select count(*) from trades;"
docker exec -i stock-kanban-pg-test psql -U stock_user -d stock_kanban_test -c "select count(*) from daily_settlements where settlement_date=current_date;"
```

Expected:
- live portfolios >= number of tested users
- trades > 0 after run
- settlement rows exist for current date

## 4. UI test steps (`/live`)

1. Open `/live`
2. Input `User ID`
3. Select algorithm (`US/CN/HK`)
4. Click `Run Now`
5. Verify metric cards and holdings/trades tables refresh
6. Click `Settle Now`
7. Verify no error and snapshot remains readable

Expected:
- page is usable on desktop and mobile widths
- values refresh after run/settle
- no cross-user data leakage when changing `User ID`

## 5. Sample pass record (2026-02-08)

- `runGammaTrades=10`, `runDeltaTrades=10`
- `gammaPortfolio != deltaPortfolio`
- `settleProcessed=4`, `settleSettled=4`
- DB counts:
  - live portfolios: `4`
  - trades: `40`
  - settlements today: `4`
