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

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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
          const points = await fetchTickerDailyPrices(ticker, startDate, endDate);
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
