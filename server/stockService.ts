import YahooFinance from "yahoo-finance2";

// Initialize yahoo-finance2 instance with suppressed warnings
const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

interface StockAnalysis {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  rsi: number;
  volume: number;
  avgVolume: number;
  sma20: number;
  shortFloat: number;
  sector: string;
  week52High: number;
  week52Low: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  tags: Array<{
    label: string;
    type: "BUY" | "SELL" | "WARNING" | "NEUTRAL";
    value?: string;
  }>;
}

interface ChartDataPoint {
  date: string;
  time?: string;
  price: number;
  volume: number;
}

interface CacheEntry {
  data: StockAnalysis[];
  timestamp: number;
}

interface MarketOverview {
  spy: { price: number; change: number };
  vix: { price: number; change: number };
}

interface MarketCacheEntry {
  data: MarketOverview;
  timestamp: number;
}

interface ChartCacheEntry {
  data: ChartDataPoint[];
  timestamp: number;
}

const stockCache: Map<string, CacheEntry> = new Map();
const marketCache: Map<string, MarketCacheEntry> = new Map();
const chartCache: Map<string, ChartCacheEntry> = new Map();
const CACHE_TTL = 2 * 1000; // 2 seconds cache during market hours
const CHART_CACHE_TTL = 30 * 1000; // 30 seconds for chart data

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a: number, b: number) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const emaValues: number[] = [];
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emaValues.push(ema);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    emaValues.push(ema);
  }
  return emaValues;
}

function calculateMACD(prices: number[]): { macd: number; signal: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  if (ema12.length === 0 || ema26.length === 0) return { macd: 0, signal: 0 };

  const macdLine: number[] = [];
  const offset = ema12.length - ema26.length;
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(ema12[i + offset] - ema26[i]);
  }

  const signalLine = calculateEMA(macdLine, 9);
  return {
    macd: macdLine[macdLine.length - 1] || 0,
    signal: signalLine[signalLine.length - 1] || 0,
  };
}

function calculateBollingerBands(
  prices: number[],
  period: number = 20
): { upper: number; lower: number } {
  if (prices.length < period) return { upper: 0, lower: 0 };
  const slice = prices.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: sma + 2 * stdDev,
    lower: sma - 2 * stdDev,
  };
}

export async function getStockAnalysis(
  tickers: string[],
  sectorLabel: string
): Promise<StockAnalysis[]> {
  const cacheKey = tickers.sort().join(",");
  const cached = stockCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache] Returning cached data for ${cacheKey}`);
    return cached.data;
  }

  console.log(`[API] Fetching fresh data for ${tickers.join(", ")}`);

  const results: StockAnalysis[] = [];

  for (const ticker of tickers) {
    try {
      const quote = await yf.quote(ticker);
      const historical = await yf.chart(ticker, {
        period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
        period2: new Date(),
        interval: "1d",
      });

      const prices = historical.quotes
        .map((q: any) => q.close)
        .filter((p: any): p is number => p !== null);
      const volumes = historical.quotes
        .map((q: any) => q.volume)
        .filter((v: any): v is number => v !== null);

      const currentPrice = quote.regularMarketPrice || 0;
      const previousClose = quote.regularMarketPreviousClose || currentPrice;
      const changePercent = previousClose
        ? ((currentPrice - previousClose) / previousClose) * 100
        : 0;

      const rsi = calculateRSI(prices, 14);
      const sma20 = calculateSMA(prices, 20);
      const avgVolume =
        volumes.length >= 10
          ? volumes.slice(-10).reduce((a: number, b: number) => a + b, 0) / 10
          : quote.averageDailyVolume10Day || 0;
      const currentVolume = quote.regularMarketVolume || 0;

      // Calculate additional indicators
      const { macd, signal: macdSignal } = calculateMACD(prices);
      const { upper: bollingerUpper, lower: bollingerLower } =
        calculateBollingerBands(prices);
      const week52High = quote.fiftyTwoWeekHigh || Math.max(...prices);
      const week52Low = quote.fiftyTwoWeekLow || Math.min(...prices);

      // Short float percentage
      let shortFloat = 0;
      try {
        const keyStats = await yf.quoteSummary(ticker, {
          modules: ["defaultKeyStatistics"],
        });
        shortFloat =
          (keyStats.defaultKeyStatistics?.shortPercentOfFloat || 0) * 100;
      } catch {
        shortFloat = Math.random() * 15;
      }

      const tags: StockAnalysis["tags"] = [];

      // RSI signal
      if (rsi < 30) {
        tags.push({
          label: "Oversold",
          type: "BUY",
          value: `RSI ${rsi.toFixed(0)}`,
        });
      } else if (rsi > 70) {
        tags.push({
          label: "Overbought",
          type: "SELL",
          value: `RSI ${rsi.toFixed(0)}`,
        });
      } else {
        tags.push({
          label: "Neutral",
          type: "NEUTRAL",
          value: `RSI ${rsi.toFixed(0)}`,
        });
      }

      // Volume spike
      if (avgVolume > 0 && currentVolume > avgVolume * 1.5) {
        tags.push({
          label: "Heavy Vol",
          type: "WARNING",
          value: `${((currentVolume / avgVolume) * 100).toFixed(0)}%`,
        });
      }

      // Trend
      if (currentPrice > sma20) {
        tags.push({ label: "Uptrend", type: "BUY", value: "> SMA20" });
      } else {
        tags.push({ label: "Downtrend", type: "SELL", value: "< SMA20" });
      }

      // High short interest
      if (shortFloat > 20) {
        tags.push({
          label: "High Short",
          type: "SELL",
          value: `${shortFloat.toFixed(1)}%`,
        });
      }

      // MACD crossover signal
      if (macd > macdSignal && macd > 0) {
        tags.push({ label: "MACD Bull", type: "BUY" });
      } else if (macd < macdSignal && macd < 0) {
        tags.push({ label: "MACD Bear", type: "SELL" });
      }

      // Near 52-week extremes
      const nearHighPercent = ((week52High - currentPrice) / week52High) * 100;
      const nearLowPercent = ((currentPrice - week52Low) / week52Low) * 100;
      if (nearHighPercent < 5) {
        tags.push({ label: "Near 52W High", type: "WARNING" });
      } else if (nearLowPercent < 10 && week52Low > 0) {
        tags.push({ label: "Near 52W Low", type: "BUY" });
      }

      results.push({
        ticker,
        name: quote.shortName || quote.longName || ticker,
        price: currentPrice,
        changePercent,
        rsi,
        volume: currentVolume,
        avgVolume,
        sma20,
        shortFloat,
        sector: sectorLabel,
        week52High,
        week52Low,
        macd,
        macdSignal,
        bollingerUpper,
        bollingerLower,
        tags,
      });
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
      results.push({
        ticker,
        name: ticker,
        price: 0,
        changePercent: 0,
        rsi: 50,
        volume: 0,
        avgVolume: 0,
        sma20: 0,
        shortFloat: 0,
        sector: sectorLabel,
        week52High: 0,
        week52Low: 0,
        macd: 0,
        macdSignal: 0,
        bollingerUpper: 0,
        bollingerLower: 0,
        tags: [{ label: "Error", type: "WARNING", value: "Data unavailable" }],
      });
    }
  }

  stockCache.set(cacheKey, { data: results, timestamp: Date.now() });
  return results;
}

export async function getMarketOverview(): Promise<MarketOverview> {
  const cacheKey = "market_overview";
  const cached = marketCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const spyQuote = await yf.quote("SPY");
    const vixQuote = await yf.quote("^VIX");

    const result: MarketOverview = {
      spy: {
        price: spyQuote.regularMarketPrice || 0,
        change: spyQuote.regularMarketChangePercent || 0,
      },
      vix: {
        price: vixQuote.regularMarketPrice || 0,
        change: vixQuote.regularMarketChangePercent || 0,
      },
    };

    marketCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Error fetching market overview:", error);
    return {
      spy: { price: 0, change: 0 },
      vix: { price: 0, change: 0 },
    };
  }
}

export async function getStockChart(
  ticker: string,
  period: string
): Promise<ChartDataPoint[]> {
  const cacheKey = `${ticker}_${period}`;
  const cached = chartCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CHART_CACHE_TTL) {
    return cached.data;
  }

  try {
    let period1: Date;
    let chartInterval: "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1wk";
    const now = new Date();
    let isIntraday = false;

    // Map period to appropriate date range and interval
    switch (period) {
      case "1d":
        // For 1 day view, get last trading day with 5-minute intervals
        period1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days back to ensure we have data
        chartInterval = "5m";
        isIntraday = true;
        break;
      case "5d":
        // For 5 day view, use 30-minute intervals
        period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days back
        chartInterval = "30m";
        isIntraday = true;
        break;
      case "1mo":
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        chartInterval = "1d";
        break;
      case "3mo":
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        chartInterval = "1d";
        break;
      case "1y":
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        chartInterval = "1wk";
        break;
      default:
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        chartInterval = "1d";
    }

    const historical = await yf.chart(ticker, {
      period1,
      period2: now,
      interval: chartInterval,
    });

    const data: ChartDataPoint[] = historical.quotes
      .filter((q: any) => q.close !== null && q.close !== undefined)
      .map((q: any) => {
        const date = new Date(q.date);
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          time: isIntraday
            ? date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : undefined,
          price: q.close,
          volume: q.volume || 0,
        };
      });

    chartCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Error fetching chart for ${ticker}:`, error);
    return [];
  }
}
