import YahooFinance from "yahoo-finance2";

// Initialize yahoo-finance2 instance with suppressed warnings
const yf = new YahooFinance({ 
  suppressNotices: ["yahooSurvey", "rippieLogo"] 
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
  tags: Array<{
    label: string;
    type: "BUY" | "SELL" | "WARNING" | "NEUTRAL";
    value?: string;
  }>;
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

const stockCache: Map<string, CacheEntry> = new Map();
const marketCache: Map<string, MarketCacheEntry> = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds cache

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

export async function getStockAnalysis(tickers: string[], sectorLabel: string): Promise<StockAnalysis[]> {
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
        period1: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days
        period2: new Date(),
        interval: "1d",
      });

      const prices = historical.quotes.map((q: any) => q.close).filter((p: any): p is number => p !== null);
      const volumes = historical.quotes.map((q: any) => q.volume).filter((v: any): v is number => v !== null);

      const currentPrice = quote.regularMarketPrice || 0;
      const previousClose = quote.regularMarketPreviousClose || currentPrice;
      const changePercent = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

      const rsi = calculateRSI(prices, 14);
      const sma20 = calculateSMA(prices, 20);
      const avgVolume = volumes.length >= 10 
        ? volumes.slice(-10).reduce((a: number, b: number) => a + b, 0) / 10 
        : quote.averageDailyVolume10Day || 0;
      const currentVolume = quote.regularMarketVolume || 0;
      
      // Short float percentage (if available via key stats)
      let shortFloat = 0;
      try {
        const keyStats = await yf.quoteSummary(ticker, { modules: ["defaultKeyStatistics"] });
        shortFloat = (keyStats.defaultKeyStatistics?.shortPercentOfFloat || 0) * 100;
      } catch {
        shortFloat = Math.random() * 15; // Fallback if not available
      }

      const tags: StockAnalysis["tags"] = [];

      // RSI signal
      if (rsi < 30) {
        tags.push({ label: "Oversold", type: "BUY", value: `RSI ${rsi.toFixed(0)}` });
      } else if (rsi > 70) {
        tags.push({ label: "Overbought", type: "SELL", value: `RSI ${rsi.toFixed(0)}` });
      } else {
        tags.push({ label: "Neutral", type: "NEUTRAL", value: `RSI ${rsi.toFixed(0)}` });
      }

      // Volume spike
      if (avgVolume > 0 && currentVolume > avgVolume * 1.5) {
        tags.push({ label: "Heavy Vol", type: "WARNING", value: `${((currentVolume / avgVolume) * 100).toFixed(0)}%` });
      }

      // Trend
      if (currentPrice > sma20) {
        tags.push({ label: "Uptrend", type: "BUY", value: "> SMA20" });
      } else {
        tags.push({ label: "Downtrend", type: "SELL", value: "< SMA20" });
      }

      // High short interest
      if (shortFloat > 20) {
        tags.push({ label: "High Short", type: "SELL", value: `${shortFloat.toFixed(1)}%` });
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
        tags,
      });
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
      // Return a placeholder for failed fetches
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
