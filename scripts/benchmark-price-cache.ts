import { loadHistoricalPrices, getPriceCacheStats } from "../server/backtest/priceProvider";
import { loadSignalSnapshot } from "../server/backtest/signalProvider";
import { type BacktestAlgorithm } from "../shared/backtest";

function parseAlgorithm(value: string | undefined): BacktestAlgorithm {
  if (value === "us" || value === "cn" || value === "hk") {
    return value;
  }
  return "us";
}

function nowMs(): number {
  return Date.now();
}

async function run(): Promise<void> {
  const algorithm = parseAlgorithm(process.env.BENCH_ALGO);
  const startDate = process.env.BENCH_START ?? "2025-10-01";
  const endDate = process.env.BENCH_END ?? "2025-12-31";
  const limit = Number(process.env.BENCH_TICKERS ?? 12);

  const snapshot = await loadSignalSnapshot(algorithm);
  const tickers = snapshot.entries
    .filter((entry) => entry.signal === "BUY")
    .slice(0, Math.max(1, Number.isFinite(limit) ? limit : 12))
    .map((entry) => entry.ticker);

  if (tickers.length === 0) {
    throw new Error(`No benchmark tickers found for algorithm: ${algorithm}`);
  }

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59Z`);

  const t1 = nowMs();
  const first = await loadHistoricalPrices(tickers, start, end);
  const t2 = nowMs();
  const second = await loadHistoricalPrices(tickers, start, end);
  const t3 = nowMs();

  const coldMs = t2 - t1;
  const warmMs = t3 - t2;
  const speedup = warmMs > 0 ? coldMs / warmMs : null;

  console.log(
    JSON.stringify(
      {
        algorithm,
        dateRange: { startDate, endDate },
        tickerCount: tickers.length,
        resultSizes: { cold: first.size, warm: second.size },
        timingsMs: { cold: coldMs, warm: warmMs },
        speedupRatio: speedup === null ? null : Number(speedup.toFixed(2)),
        warmCacheHitLikely: warmMs <= 1,
        cache: getPriceCacheStats(),
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
