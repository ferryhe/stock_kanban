# Backtest Original Phase 2 Wave 1 Testing Guide

Date: 2026-02-08

## 1. Preparation

1. Install dependencies:
```bash
npm install
```

2. Start app:
```bash
npm run dev
```

## 2. Compare analytics verification

1. Open `/compare`
2. Select at least 2 algorithms
3. Set date range and run compare
4. Verify sections render:
- Equity Curves
- Drawdown Curves
- Summary
- Correlation Matrix (Daily Returns)
- Monthly Return Heatmap

Expected:
- all sections display without runtime error
- correlation diagonal equals `1.000`

## 3. Export verification

1. On compare result page, click `Export CSV`
- expected: CSV file downloads
- expected sections in file:
  - summary
  - correlation matrix
  - monthly returns

2. Click `Export PDF`
- expected: printable report opens in new tab/window
- expected: browser print dialog appears
- expected: user can Save as PDF

## 4. Price cache benchmark verification

Run:

```bash
npm run benchmark:price-cache
```

Expected output JSON:
- includes `timingsMs.cold` and `timingsMs.warm`
- includes cache stats:
  - `cacheSize`
  - `ttlMs`
  - `maxEntries`

Sample verified on `2026-02-08`:
- cold: `415ms`
- warm: `0ms`
- `warmCacheHitLikely: true`

## 5. Build/type gate

Run:
```bash
npm run check
npm run build
```

Expected:
- both commands pass

## 6. Diagnostics

1. Compare chart/heatmap empty:
- ensure at least 2 algorithms are selected and run succeeded

2. Export CSV/PDF no response:
- check popup blocker settings for PDF print window
- check browser download permission for CSV

3. Benchmark shows no warm improvement:
- verify benchmark runs twice in same process
- verify cache key inputs (algorithm/date range) are unchanged
