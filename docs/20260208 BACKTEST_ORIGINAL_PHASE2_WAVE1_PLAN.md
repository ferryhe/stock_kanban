# Backtest Original Phase 2 Wave 1 Plan

Date: 2026-02-08
Status: In Progress
Mapping: `CONSOLIDATED_DESIGN.md` original `Phase 2: 多算法对比与优化`

## 1. Goal

Deliver the first wave for original Phase 2 remaining items:

1. Correlation analysis in compare output
2. Drawdown curve + monthly return heatmap
3. Export capability (CSV + PDF report workflow)
4. Backtest performance optimization via reusable historical price cache

## 2. Scope

### In scope
- Frontend compare analytics enhancements:
  - correlation matrix table
  - drawdown multi-line chart
  - monthly return heatmap table
- Frontend export actions:
  - CSV export for summary/correlation/monthly returns
  - PDF report export workflow (browser print-to-PDF report page)
- Backend optimization:
  - in-memory price data cache in `priceProvider`
  - in-flight request deduplication for same ticker/date range
- Benchmark script for cache effect validation

### Out of scope
- True server-side PDF binary generation engine
- Deep quant correlation factors beyond equity return correlation
- Distributed cache (Redis) or persistent market data lake

## 3. Design decisions

1. Correlation uses daily portfolio return series and Pearson coefficient.
2. Monthly heatmap uses month-end to month-end return.
3. PDF export in this wave uses printable HTML report + browser "Save as PDF".
4. Price cache key format: `TICKER|START|END`, TTL-based in-memory cache.

## 4. Validation checklist

- `npm run check`
- `npm run build`
- compare page renders:
  - equity curve
  - drawdown curve
  - correlation matrix
  - monthly heatmap
- CSV export file can be downloaded and parsed
- PDF export opens printable report page
- cache benchmark script shows warm-run improvement trend

## 5. Commit plan

1. docs: add original phase2 wave1 plan
2. feat(backtest): add price cache + benchmark script
3. feat(ui): add compare analytics and CSV/PDF export
4. docs: add wave1 implementation/testing reports and update guides
