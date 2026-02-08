# Backtest Phase 4 Testing Guide

Date: 2026-02-08

## 1. Preparation

Set PostgreSQL env in current shell:

```powershell
$env:DATABASE_URL="postgresql://stock_user:stock_pass@127.0.0.1:55432/stock_kanban_test"
$env:PGSSL="false"
```

Initialize schema:

```bash
npm run db:prepare
npm run db:push
```

Optional clean test data:

```bash
docker exec -i stock-kanban-pg-test psql -U stock_user -d stock_kanban_test -c "TRUNCATE TABLE strategy_performance, daily_settlements, trades, holdings, portfolios, strategies, backtest_results RESTART IDENTITY CASCADE;"
```

## 2. Create sample backtest runs

Run at least two backtests using different algorithms (`us`, `hk` or `cn`):

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

Repeat with `algorithm` = `hk` (or `cn`).

## 3. Verify history API filters

All:

```bash
curl "http://127.0.0.1:5000/api/backtests/history?limit=10"
```

By algorithm:

```bash
curl "http://127.0.0.1:5000/api/backtests/history?algorithm=us&limit=10"
```

By run date:

```bash
curl "http://127.0.0.1:5000/api/backtests/history?runDateFrom=2026-02-08&runDateTo=2026-02-08&limit=10"
```

Expected:
- Latest runs first
- `algorithm=us` only returns `us`
- Date filter returns only records in range

## 4. Verify frontend history page

1. Open `/backtest/history`
2. Select algorithm and run date range
3. Click `Apply Filters`
4. Validate table values and count cards
5. Click `View` on one row and confirm it opens `/backtest/:id/results`

Expected:
- Filters map to API response
- Row detail jump works
- Existing backtest/compare pages still work

## 5. SQL cross-check

```sql
select count(*) from portfolios where type='backtest';
select strategy_id, backtest_status, source_backtest_result_id, created_at from portfolios order by created_at desc limit 10;
select p.source_backtest_result_id, s.algorithm_id, sp.total_return, sp.sharpe_ratio
from portfolios p
left join strategies s on s.id = p.strategy_id
left join strategy_performance sp on sp.portfolio_id = p.id
where p.type='backtest'
order by p.created_at desc
limit 10;
```

## 6. Phase 4 verified sample (2026-02-08)

Created run ids:
- `418b61a9-068d-4664-b07a-6af49678d008` (`us`)
- `c73de361-eee2-4823-82a3-8165995e8f82` (`hk`)

Observed history counts:
- all = 2
- algorithm=us = 1
- algorithm=hk = 1
- today filter = 2

## 7. Failure diagnostics

1. `Failed to fetch backtest history`
- check server logs for `/api/backtests/history`
- verify query dates use `YYYY-MM-DD`

2. Empty history after restart
- verify `DATABASE_URL` is configured in server process
- run `npm run db:prepare && npm run db:push`

3. `algorithm` filter returns 0 unexpectedly
- verify source run was created with matching algorithm
- check `strategies.algorithm_id` values in DB
