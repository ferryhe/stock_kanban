# Backtest Original-Phase Alignment Report

Date: 2026-02-08
Status: Updated
Source of truth: `CONSOLIDATED_DESIGN.md` section `5. 分阶段实施计划`

## 1. Why this document

Current `docs/` contains internal execution phases `BACKTEST_PHASE1` to `BACKTEST_PHASE5`.
`CONSOLIDATED_DESIGN.md` defines original product roadmap phases `Phase 1` to `Phase 4`.

This file aligns the two and lists remaining work against the original roadmap.

## 2. Mapping (Internal docs -> Original roadmap)

1. Internal `BACKTEST_PHASE1` + `BACKTEST_PHASE2` + `BACKTEST_PHASE3`
- Maps to original `Phase 1: 回测核心功能`
- Scope delivered: single-algorithm backtest flow, API, UI pages, PG persistence, normalized core tables.

2. Internal `BACKTEST_PHASE4`
- Maps to original `Phase 2` subset
- Scope delivered: history query and history UI (algorithm/date filtering).

3. Internal `BACKTEST_PHASE5`
- Maps to original `Phase 3` subset
- Scope delivered: lightweight user-scoped isolation (`x-user-id`), status filtering, pagination.

## 3. Original roadmap completion status

### Original Phase 1: 回测核心功能

Status: Mostly completed (with architecture deviation)

Done:
- signal provider from `quant-metrics-*.json`
- price provider integration
- backtest engine and core run loop
- cost model (commission + slippage)
- backtest APIs and frontend pages
- performance metrics and equity visualization
- DB core tables and persistence

Gap / deviation:
- `stock_trading_sim` standalone service was planned, but implementation is inside `stock_kanban` (not split repo/service yet).

### Original Phase 2: 多算法对比与优化

Status: Partially completed

Done:
- compare page and multi-algorithm run endpoint
- history query and query-oriented UI evolution

Not done:
- correlation analysis
- drawdown curve and monthly return heatmap enhancements
- export capability (CSV/PDF)
- explicit backtest performance optimization (parallel compute/caching roadmap item)

### Original Phase 3: 实时虚拟交易与用户系统

Status: Partially started

Done:
- lightweight data isolation by `user_id` on backtest paths
- user-scoped history/result/persistence query checks

Not done:
- real-time paper trading (non-backtest)
- daily scheduled settlement jobs
- full auth system (register/login/session/token)
- user preferences
- full portfolio management workflow
- risk manager module (position checks/stop-loss/take-profit)

### Original Phase 4: 高级功能

Status: Not started

Not done:
- indicator expansion roadmap
- strategy parameter optimization tools
- mobile adaptation roadmap tasks
- community sharing
- live broker trading integration

## 4. Recommended documentation convention (from now)

To avoid phase naming confusion:

1. Keep existing files unchanged for history traceability.
2. In every new phase doc, include explicit mapping section:
- `Mapping to CONSOLIDATED_DESIGN Phase X`
3. Treat `BACKTEST_PHASE*` in `docs/` as **execution waves**, not the original product phase IDs.

## 5. Next work package suggestion (strictly aligned to original roadmap)

Recommended next package: original `Phase 2` remaining items

1. Add correlation analysis in compare output.
2. Add drawdown curve + monthly return heatmap visualization.
3. Add export API/UI (CSV first, then PDF).
4. Add performance optimization benchmark and caching strategy.
