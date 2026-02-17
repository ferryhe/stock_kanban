# Backtest Phase 5 Testing Guide

Date: 2026-02-08

## 1. Preparation

Set DB env:

```powershell
$env:DATABASE_URL="postgresql://stock_user:stock_pass@127.0.0.1:55432/stock_kanban_test"
$env:PGSSL="false"
```

Initialize schema:

```bash
npm run db:prepare
npm run db:push
```

Optional clean:

```bash
docker exec -i stock-kanban-pg-test psql -U stock_user -d stock_kanban_test -c "TRUNCATE TABLE strategy_performance, daily_settlements, trades, holdings, portfolios, strategies, backtest_results, users RESTART IDENTITY CASCADE;"
```

## 2. Create runs for multiple users

Create one run for `alpha_user`:

```bash
curl -X POST http://127.0.0.1:5000/api/backtests \
  -H "x-user-id: alpha_user" \
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

Repeat for:
- `alpha_user` + another algorithm (`hk` or `cn`)
- `beta_user` + `us`

## 3. Verify user isolation

```bash
curl -H "x-user-id: alpha_user" "http://127.0.0.1:5000/api/backtests/history?page=1&pageSize=20"
curl -H "x-user-id: beta_user" "http://127.0.0.1:5000/api/backtests/history?page=1&pageSize=20"
```

Expected:
- each user only sees own runs

## 4. Verify pagination

```bash
curl -H "x-user-id: alpha_user" "http://127.0.0.1:5000/api/backtests/history?page=1&pageSize=1"
curl -H "x-user-id: alpha_user" "http://127.0.0.1:5000/api/backtests/history?page=2&pageSize=1"
```

Expected:
- `total` and `totalPages` are correct
- each page returns exactly one row (`pageSize=1`)

## 5. Verify status filter

Set one alpha row to failed (SQL):

```sql
update portfolios
set backtest_status='failed'
where user_id='alpha_user'
  and source_backtest_result_id in (
    select source_backtest_result_id
    from portfolios
    where user_id='alpha_user'
    order by created_at asc
    limit 1
  );
```

Then query:

```bash
curl -H "x-user-id: alpha_user" "http://127.0.0.1:5000/api/backtests/history?status=failed&page=1&pageSize=20"
curl -H "x-user-id: alpha_user" "http://127.0.0.1:5000/api/backtests/history?status=completed&page=1&pageSize=20"
```

Expected:
- failed/completed subsets return expected counts

## 6. Verify frontend behavior

1. Open `/backtest`, set `User ID`, run one backtest
2. Open `/compare`, set same `User ID`, run compare
3. Open `/backtest/history`
4. Set:
   - same `User ID`
   - status filter
   - page size
5. Click `Apply Filters`
6. Use `Prev`/`Next` to switch pages
7. Click `View` to open result detail

Expected:
- records align with selected user scope
- pagination and status filtering work in UI

## 7. Phase 5 verified sample (2026-02-08)

Created:
- `alpha_user`: 2 runs
- `beta_user`: 1 run

Observed:
- `alpha_user` page1/pageSize1 -> `total=2`, `totalPages=2`, `items=1`
- `alpha_user` status=failed -> `total=1`
- `alpha_user` status=completed -> `total=1`
- `beta_user` -> `total=1` and `userId=beta_user`

## 8. Failure diagnostics

1. History empty
- verify same `x-user-id` is used in run and history requests

2. FK error on `portfolios.user_id`
- ensure code includes auto-provision fix
- verify `users` table exists and writable

3. Invalid status/page params
- ensure `status` is one of:
  `pending|running|completed|failed|cancelled`
- ensure `page` and `pageSize` are positive integers
