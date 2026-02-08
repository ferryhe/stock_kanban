# Backtest Phase 5 Plan (Pagination + Status Filter + User Isolation)

Date: 2026-02-08
Status: In Progress

## 1. Goal

Implement next enhancement on top of Phase 4 history:

1. History pagination (`page`, `pageSize`, `total`, `totalPages`)
2. History status filtering (`completed`, `failed`, etc.)
3. User isolation (`user_id`) for run, query, and detail lookup

## 2. Scope

### In scope
- Backend:
  - Extend history query contract (`status`, `page`, `pageSize`)
  - Return paginated response object
  - Filter by `x-user-id` and persist `portfolios.user_id`
  - Apply user scope to:
    - run backtest
    - compare run
    - history query
    - result fetch
    - persistence summary fetch
- Frontend:
  - Add user id input and persistence (`localStorage`)
  - History page:
    - status filter
    - pagination controls
    - user scope display
  - Backtest/Compare pages: set user id before submitting runs
- Docs:
  - Phase 5 implementation report
  - Phase 5 testing guide
  - Update operation/deployment docs and README

### Out of scope
- Full auth/login system
- RBAC and token verification
- Server-side session binding

## 3. Key decisions

1. Lightweight user isolation uses request header: `x-user-id`.
2. Default frontend user id: `demo-user` (stored in localStorage key `backtest_user_id`).
3. History API shape upgraded from array to:
   - `{ items, page, pageSize, total, totalPages }`
4. Status filter is validated against finite enum:
   - `pending|running|completed|failed|cancelled`

## 4. Validation checklist

- `npm run check`
- `npm run build`
- DB path test on Docker PostgreSQL:
  - create runs under two users
  - verify user isolation in history API
  - verify status filter with at least one non-completed row
  - verify pagination metadata and page navigation behavior

## 5. Commit plan

1. docs: add phase5 plan
2. feat(api): pagination + status filter + user isolation backend
3. feat(ui): history pagination/status + user scope controls
4. docs: phase5 report/testing + guide updates
