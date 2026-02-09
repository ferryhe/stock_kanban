import YahooFinance from "yahoo-finance2";

export interface PriceSeriesPoint {
  date: string;
  close: number;
}

export type PriceSeriesMap = Map<string, PriceSeriesPoint[]>;

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

const PRICE_FETCH_CONCURRENCY = 5;
const PRICE_CACHE_TTL_MS = 30 * 60 * 1000;
const PRICE_CACHE_MAX_ENTRIES = 2000;

type CachedSeries = {
  points: PriceSeriesPoint[];
  expiresAtMs: number;
  updatedAtMs: number;
};

const priceSeriesCache = new Map<string, CachedSeries>();
const inFlightFetches = new Map<string, Promise<PriceSeriesPoint[]>>();

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildCacheKey(ticker: string, startDate: Date, endDate: Date): string {
  return `${ticker}|${toDateKey(startDate)}|${toDateKey(endDate)}`;
}

function clonePoints(points: PriceSeriesPoint[]): PriceSeriesPoint[] {
  return points.map((point) => ({ ...point }));
}

function cleanupExpiredCache(nowMs: number): void {
  Array.from(priceSeriesCache.entries()).forEach(([key, value]) => {
    if (value.expiresAtMs <= nowMs) {
      priceSeriesCache.delete(key);
    }
  });
}

function cleanupOverflowCache(): void {
  if (priceSeriesCache.size <= PRICE_CACHE_MAX_ENTRIES) {
    return;
  }

  const rows = Array.from(priceSeriesCache.entries()).sort(
    (a, b) => a[1].updatedAtMs - b[1].updatedAtMs,
  );
  const removeCount = priceSeriesCache.size - PRICE_CACHE_MAX_ENTRIES;

  for (let i = 0; i < removeCount; i += 1) {
    priceSeriesCache.delete(rows[i][0]);
  }
}

async function fetchTickerDailyPrices(
  ticker: string,
  startDate: Date,
  endDate: Date,
): Promise<PriceSeriesPoint[]> {
  const chart = await yf.chart(ticker, {
    period1: startDate,
    period2: endDate,
    interval: "1d",
  });

  const points = chart.quotes
    .map((quote) => {
      const close = quote.close;
      if (close === null || close === undefined || !Number.isFinite(close)) {
        return null;
      }

      return {
        date: toDateKey(new Date(quote.date)),
        close,
      };
    })
    .filter((row): row is PriceSeriesPoint => row !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return points;
}

async function fetchTickerDailyPricesWithCache(
  ticker: string,
  startDate: Date,
  endDate: Date,
): Promise<PriceSeriesPoint[]> {
  const key = buildCacheKey(ticker, startDate, endDate);
  const nowMs = Date.now();

  cleanupExpiredCache(nowMs);

  const cached = priceSeriesCache.get(key);
  if (cached && cached.expiresAtMs > nowMs) {
    return clonePoints(cached.points);
  }

  const inFlight = inFlightFetches.get(key);
  if (inFlight) {
    return clonePoints(await inFlight);
  }

  const fetchPromise = fetchTickerDailyPrices(ticker, startDate, endDate)
    .then((points) => {
      const now = Date.now();
      priceSeriesCache.set(key, {
        points: clonePoints(points),
        expiresAtMs: now + PRICE_CACHE_TTL_MS,
        updatedAtMs: now,
      });
      cleanupOverflowCache();
      return points;
    })
    .finally(() => {
      inFlightFetches.delete(key);
    });

  inFlightFetches.set(key, fetchPromise);
  return clonePoints(await fetchPromise);
}

export async function loadHistoricalPrices(
  tickers: string[],
  startDate: Date,
  endDate: Date,
): Promise<PriceSeriesMap> {
  const uniqueTickers = Array.from(
    new Set(
      tickers
        .map((ticker) => ticker.trim().toUpperCase())
        .filter((ticker) => ticker.length > 0),
    ),
  );

  const result: PriceSeriesMap = new Map();

  for (let i = 0; i < uniqueTickers.length; i += PRICE_FETCH_CONCURRENCY) {
    const batch = uniqueTickers.slice(i, i + PRICE_FETCH_CONCURRENCY);
    const rows = await Promise.all(
      batch.map(async (ticker) => {
        try {
          const points = await fetchTickerDailyPricesWithCache(
            ticker,
            startDate,
            endDate,
          );
          return { ticker, points };
        } catch (error) {
          console.warn(`[Backtest] Failed to fetch prices for ${ticker}:`, error);
          return { ticker, points: [] as PriceSeriesPoint[] };
        }
      }),
    );

    rows.forEach(({ ticker, points }) => {
      if (points.length > 0) {
        result.set(ticker, points);
      }
    });
  }

  return result;
}

export function getPriceCacheStats(): {
  cacheSize: number;
  inFlightSize: number;
  ttlMs: number;
  maxEntries: number;
} {
  return {
    cacheSize: priceSeriesCache.size,
    inFlightSize: inFlightFetches.size,
    ttlMs: PRICE_CACHE_TTL_MS,
    maxEntries: PRICE_CACHE_MAX_ENTRIES,
  };
}
