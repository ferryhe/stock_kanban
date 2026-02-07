# Backtest Phase 2 Testing Guide

Date: 2026-02-07

## 1. Preconditions

- Linux server has reachable PostgreSQL instance
- `.env.production` contains valid `DATABASE_URL`

## 2. Database preparation

```bash
npm run db:prepare
npm run db:push
```

## 3. Start service

```bash
npm run build
bash deploy/start-production.sh
```

## 4. API verification

### 4.1 Available algorithms

```bash
curl http://127.0.0.1:3000/api/backtests/algorithms
```

### 4.2 Run one backtest

```bash
curl -X POST http://127.0.0.1:3000/api/backtests \
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

Record returned `id`.

### 4.3 Query result by id

```bash
curl http://127.0.0.1:3000/api/backtests/<ID>
```

## 5. PostgreSQL verification

```bash
psql "$DATABASE_URL" -c "select id, algorithm, created_at from backtest_results order by created_at desc limit 5;"
```

Expected:
- New row exists for the run
- `id` matches API response

## 6. Frontend verification

- Open `/backtest` and run a backtest
- Open `/backtest/:id/results`
- Open `/compare` and run at least two algorithms

## 7. Failure diagnostics

If API works but DB has no row:
1. check app log for `[Backtest] Failed to persist result to PostgreSQL`
2. validate `DATABASE_URL`, SSL flags, network ACL
3. rerun `npm run db:prepare && npm run db:push`
