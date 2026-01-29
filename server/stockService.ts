import YahooFinance from "yahoo-finance2";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Initialize yahoo-finance2 instance with suppressed warnings
const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

interface QuantMetrics {
  score?: number | null;
  rank?: number;
  predictedReturn?: number;
  risk?: {
    vol60?: number;
    maxdd252?: number;
  };
  signal?: "BUY" | "SELL" | "HOLD" | "RISK_ALERT";
}

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
  quant?: QuantMetrics;
}

interface ChartDataPoint {
  date: string;
  time?: string;
  fullDate: string;
  price: number | null;
  volume: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
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

type UILang = "en" | "zh";

type MarketSession = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
};

type MarketInfo = {
  timeZone: string;
  sessions: MarketSession[];
};

const US_MARKET: MarketInfo = {
  timeZone: "America/New_York",
  sessions: [{ startHour: 9, startMinute: 30, endHour: 16, endMinute: 0 }],
};

const CN_MARKET: MarketInfo = {
  timeZone: "Asia/Shanghai",
  sessions: [
    { startHour: 9, startMinute: 30, endHour: 11, endMinute: 30 },
    { startHour: 13, startMinute: 0, endHour: 15, endMinute: 0 },
  ],
};

const HK_MARKET: MarketInfo = {
  timeZone: "Asia/Hong_Kong",
  sessions: [
    { startHour: 9, startMinute: 30, endHour: 12, endMinute: 0 },
    { startHour: 13, startMinute: 0, endHour: 16, endMinute: 0 },
  ],
};

function getMarketInfo(ticker: string): MarketInfo {
  const upper = ticker.toUpperCase();
  if (upper.endsWith(".SS") || upper.endsWith(".SZ")) return CN_MARKET;
  if (upper.endsWith(".HK")) return HK_MARKET;
  return US_MARKET;
}

function getLocalZhName(ticker: string, uiLang: UILang) {
  if (uiLang !== "zh") return undefined;
  const map = loadZhNameMap();
  return map.get(ticker.toUpperCase());
}

function buildFixedTimes(sessions: MarketSession[], stepMinutes: number = 5): string[] {
  const fixedTimes: string[] = [];
  for (const session of sessions) {
    for (let h = session.startHour; h <= session.endHour; h++) {
      const startMin = h === session.startHour ? session.startMinute : 0;
      const endMin = h === session.endHour ? session.endMinute : 60 - stepMinutes;
      for (let m = startMin; m <= endMin; m += stepMinutes) {
        const hour24 = h % 24;
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = h >= 12 ? "PM" : "AM";
        const timeStr = `${hour12.toString().padStart(2, "0")}:${m
          .toString()
          .padStart(2, "0")} ${ampm}`;
        fixedTimes.push(timeStr);
        if (h === session.endHour && m === session.endMinute) break;
      }
    }
  }
  return fixedTimes;
}

const stockCache: Map<string, CacheEntry> = new Map();
const marketCache: Map<string, MarketCacheEntry> = new Map();
const chartCache: Map<string, ChartCacheEntry> = new Map();
const CACHE_TTL = 2 * 1000; // 2 seconds cache during market hours
const CHART_CACHE_TTL = 30 * 1000; // 30 seconds for chart data
const ZH_NAME_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ZH_NAME_SCRIPT = path.join(process.cwd(), "scripts", "build_zh_name_map.py");
const pendingZhUpdates: Set<string> = new Set();
const queuedZhUpdates: Set<string> = new Set();
let zhUpdateRunning = false;
const STOCK_FETCH_CONCURRENCY = 6;
const SHORT_FLOAT_CACHE_TTL = 15 * 60 * 1000;
const shortFloatCache: Map<string, { value: number; expiresAt: number }> = new Map();

const BASE_HISTORY_DAYS = 90;
const EXTENDED_HISTORY_DAYS = 365;

// Load quantitative metrics from JSON file
let quantMetricsCache: Map<string, QuantMetrics> | null = null;
let quantMetricsCacheTime = 0;
let quantMetricsCacheMtime = 0;
const QUANT_CACHE_TTL = 60 * 60 * 1000; // 1 hour cache for quant metrics

// Load Chinese name mapping from JSON file (AKShare or other source)
let zhNameCache: Map<string, string> | null = null;
let zhNameCacheTime = 0;
let zhNameCacheMtime = 0;
const zhNamePath = path.join(process.cwd(), "data", "zh-name-map-all.json");

function loadZhNameMap(): Map<string, string> {
  const now = Date.now();
  let newestMtime = 0;
  if (fs.existsSync(zhNamePath)) {
    try {
      newestMtime = fs.statSync(zhNamePath).mtimeMs;
    } catch {
      newestMtime = 0;
    }
  }

  const cacheFresh = zhNameCache !== null && now - zhNameCacheTime < ZH_NAME_CACHE_TTL;
  const fileUnchanged =
    newestMtime > 0 ? newestMtime <= zhNameCacheMtime : zhNameCacheMtime === 0;
  if (cacheFresh && fileUnchanged && zhNameCache) {
    return zhNameCache;
  }

  const map = new Map<string, string>();
  if (fs.existsSync(zhNamePath)) {
    try {
      const raw = fs.readFileSync(zhNamePath, "utf-8");
      const data = JSON.parse(raw) as Record<string, string>;
      Object.entries(data || {}).forEach(([symbol, name]) => {
        if (symbol && name) {
          map.set(symbol.toUpperCase(), name);
        }
      });
    } catch (error) {
      console.warn("[Names] Failed to load zh name map:", error);
    }
  }

  if (map.size > 0) {
    console.log(`[Names] Loaded ${map.size} zh names from ${zhNamePath}`);
  }

  zhNameCache = map;
  zhNameCacheTime = now;
  zhNameCacheMtime = newestMtime;
  return map;
}

function runQueuedZhUpdates(uiLang: UILang) {
  if (uiLang !== "zh" || zhUpdateRunning) return;
  if (queuedZhUpdates.size === 0) return;

  const batch = Array.from(queuedZhUpdates);
  queuedZhUpdates.clear();

  let includeA = false;
  let includeHk = false;
  let includeUs = false;
  for (const symbol of batch) {
    if (symbol.endsWith(".SS") || symbol.endsWith(".SZ")) {
      includeA = true;
    } else if (symbol.endsWith(".HK")) {
      includeHk = true;
    } else {
      includeUs = true;
    }
  }

  if (!includeA && !includeHk && !includeUs) return;
  batch.forEach((s) => pendingZhUpdates.add(s));
  zhUpdateRunning = true;
  console.log(
    `[ZhName] Update start: batch=${batch.length} A=${includeA ? 1 : 0} HK=${includeHk ? 1 : 0} US=${includeUs ? 1 : 0}`,
  );

  const args = [ZH_NAME_SCRIPT, "--out", zhNamePath];
  if (includeA) args.push("--include-a");
  if (includeHk) args.push("--include-hk");
  if (includeUs) args.push("--include-us-cname");
  args.push("--symbols", batch.join(","));

  const python = process.env.PYTHON || "python";
  const child = spawn(python, args, {
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });

  if (child.stderr) {
    child.stderr.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        console.error(`[ZhName] Python stderr: ${msg}`);
      }
    });
  }

  child.on("close", (code: number | null) => {
    if (code !== 0) {
      console.error(
        `[ZhName] Python script exited with code ${code} for symbols: ${batch.join(",")}`,
      );
    }
    batch.forEach((s) => pendingZhUpdates.delete(s));
    if (code === 0) {
      zhNameCacheTime = 0;
    }
    zhUpdateRunning = false;
    if (queuedZhUpdates.size > 0) {
      runQueuedZhUpdates(uiLang);
    }
  });

  child.on("error", (err) => {
    console.error(
      `[ZhName] Failed to spawn Python process "${python}" with args ${JSON.stringify(
        args,
      )} for symbols: ${batch.join(",")}`,
      err,
    );
    batch.forEach((s) => pendingZhUpdates.delete(s));
    zhUpdateRunning = false;
    if (queuedZhUpdates.size > 0) {
      runQueuedZhUpdates(uiLang);
    }
  });
}

export function scheduleZhNameUpdate(symbols: string[], uiLang: UILang) {
  if (uiLang !== "zh") return;
  const map = loadZhNameMap();
  const missing: string[] = [];
  for (const raw of symbols) {
    const symbol = raw.toUpperCase();
    if (map.has(symbol) || pendingZhUpdates.has(symbol) || queuedZhUpdates.has(symbol)) {
      continue;
    }
    missing.push(symbol);
    queuedZhUpdates.add(symbol);
  }

  if (missing.length === 0) return;
  runQueuedZhUpdates(uiLang);
}

function loadQuantMetrics(): Map<string, QuantMetrics> {
  const now = Date.now();
  const metricsPath = path.join(process.cwd(), "data", "quant-metrics.json");
  let fileMtime = 0;
  if (fs.existsSync(metricsPath)) {
    try {
      fileMtime = fs.statSync(metricsPath).mtimeMs;
    } catch {
      fileMtime = 0;
    }
  }

  const cacheFresh =
    quantMetricsCache && now - quantMetricsCacheTime < QUANT_CACHE_TTL;
  const fileUnchanged = fileMtime > 0 ? fileMtime <= quantMetricsCacheMtime : quantMetricsCacheMtime === 0;

  if (cacheFresh && fileUnchanged) {
    return quantMetricsCache;
  }

  const metricsMap = new Map<string, QuantMetrics>();

  try {
    if (fs.existsSync(metricsPath)) {
      const rawData = fs.readFileSync(metricsPath, "utf-8");
      const data = JSON.parse(rawData);
      
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.ticker) {
            metricsMap.set(item.ticker.toUpperCase(), {
              score: item.score,
              rank: item.rank,
              predictedReturn: item.predictedReturn,
              risk: item.risk,
              signal: item.signal,
            });
          }
        });
      }
      console.log(`[Quant] Loaded metrics for ${metricsMap.size} tickers from ${metricsPath}`);
    } else {
      console.warn(`[Quant] Metrics file not found at ${metricsPath}`);
    }
  } catch (error) {
    console.warn(`[Quant] Failed to load metrics:`, error);
  }
  
  quantMetricsCache = metricsMap;
  quantMetricsCacheTime = now;
  quantMetricsCacheMtime = fileMtime;
  
  return metricsMap;
}

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

async function getShortFloat(ticker: string): Promise<number> {
  const cacheKey = ticker.toUpperCase();
  const cached = shortFloatCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let shortFloat = 0;
  try {
    const keyStats = await yf.quoteSummary(ticker, {
      modules: ["defaultKeyStatistics"],
    });
    shortFloat = (keyStats.defaultKeyStatistics?.shortPercentOfFloat || 0) * 100;
  } catch {
    // If the API call fails, keep shortFloat at 0 rather than using a random fallback.
    shortFloat = 0;
  }

  shortFloatCache.set(cacheKey, {
    value: shortFloat,
    expiresAt: Date.now() + SHORT_FLOAT_CACHE_TTL,
  });
  return shortFloat;
}

async function fetchStockAnalysis(
  ticker: string,
  sectorLabel: string,
  uiLang: UILang,
  quantMetrics: Map<string, QuantMetrics>,
): Promise<StockAnalysis> {
  try {
    const quote = await yf.quote(ticker);
    const lookbackDays =
      quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow ? BASE_HISTORY_DAYS : EXTENDED_HISTORY_DAYS;
    const historical = await yf.chart(ticker, {
      period1: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: "1d",
    });
    const localZhName = getLocalZhName(ticker, uiLang);

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

    const { macd, signal: macdSignal } = calculateMACD(prices);
    const { upper: bollingerUpper, lower: bollingerLower } =
      calculateBollingerBands(prices);
    const week52High = quote.fiftyTwoWeekHigh || Math.max(...prices);
    const week52Low = quote.fiftyTwoWeekLow || Math.min(...prices);

    const shortFloat = await getShortFloat(ticker);

    const tags: StockAnalysis["tags"] = [];

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

    if (avgVolume > 0 && currentVolume > avgVolume * 1.5) {
      tags.push({
        label: "Heavy Vol",
        type: "WARNING",
        value: `${((currentVolume / avgVolume) * 100).toFixed(0)}%`,
      });
    }

    if (currentPrice > sma20) {
      tags.push({ label: "Uptrend", type: "BUY", value: "> SMA20" });
    } else {
      tags.push({ label: "Downtrend", type: "SELL", value: "< SMA20" });
    }

    if (shortFloat > 20) {
      tags.push({
        label: "High Short",
        type: "SELL",
        value: `${shortFloat.toFixed(1)}%`,
      });
    }

    if (macd > macdSignal && macd > 0) {
      tags.push({ label: "MACD Bull", type: "BUY" });
    } else if (macd < macdSignal && macd < 0) {
      tags.push({ label: "MACD Bear", type: "SELL" });
    }

    const nearHighPercent = ((week52High - currentPrice) / week52High) * 100;
    const nearLowPercent = ((currentPrice - week52Low) / week52Low) * 100;
    if (nearHighPercent < 5) {
      tags.push({ label: "Near 52W High", type: "WARNING" });
    } else if (nearLowPercent < 10 && week52Low > 0) {
      tags.push({ label: "Near 52W Low", type: "BUY" });
    }

    return {
      ticker,
      name: localZhName || quote.shortName || quote.longName || ticker,
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
      quant: quantMetrics.get(ticker.toUpperCase()),
    };
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
    return {
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
      quant: quantMetrics.get(ticker.toUpperCase()),
    };
  }
}

export async function getStockAnalysis(
  tickers: string[],
  sectorLabel: string,
  uiLang: UILang = "en"
): Promise<StockAnalysis[]> {
  // Don't sort tickers - preserve the original order from the client
  const cacheKey = tickers.join(",");
  const cached = stockCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache] Returning cached data for ${cacheKey}`);
    return cached.data;
  }

  console.log(`[API] Fetching fresh data for ${tickers.join(", ")}`);

  // Load quantitative metrics
  const quantMetrics = loadQuantMetrics();

  const results: StockAnalysis[] = new Array(tickers.length);
  let cursor = 0;
  const concurrency = Math.min(STOCK_FETCH_CONCURRENCY, tickers.length);

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= tickers.length) break;
      results[index] = await fetchStockAnalysis(
        tickers[index],
        sectorLabel,
        uiLang,
        quantMetrics,
      );
    }
  });

  await Promise.all(workers);

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

    // For 1D, filter to only today's data (using ET timezone)
    let quotes = historical.quotes.filter((q: any) => q.close !== null && q.close !== undefined);
    let data: ChartDataPoint[] = [];
    const market = getMarketInfo(ticker);
    
    if (period === "1d") {
      const dayFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: market.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const todayLocal = dayFormatter.format(new Date());

      let todayQuotes = quotes.filter((q: any) => {
        const qDate = new Date(q.date);
        const qDateLocal = dayFormatter.format(qDate);
        return qDateLocal === todayLocal;
      });

      let targetDate = todayLocal;

      // If no data for today (weekend/holiday), get last trading day's data
      if (todayQuotes.length === 0 && quotes.length > 0) {
        const lastDate = dayFormatter.format(new Date(quotes[quotes.length - 1].date));
        targetDate = lastDate;
        todayQuotes = quotes.filter((q: any) => {
          const qDateLocal = dayFormatter.format(new Date(q.date));
          return qDateLocal === lastDate;
        });
      }

      // Create a map of existing data points by time
      const dataMap = new Map<string, any>();
      for (const q of todayQuotes) {
        const date = new Date(q.date);
        const timeKey = date.toLocaleTimeString("en-US", {
          timeZone: market.timeZone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        dataMap.set(timeKey, q);
      }

      const fixedTimes = buildFixedTimes(market.sessions, 5);

      // Parse targetDate for display
      const [month, day, year] = targetDate.split("/");
      const displayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dateDisplay = displayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const firstTime = fixedTimes[0];
      const lastTime = fixedTimes[fixedTimes.length - 1];
      let firstQuote: any = null;
      let lastQuote: any = null;
      if (dataMap.size > 0) {
        for (const time of fixedTimes) {
          const candidate = dataMap.get(time);
          if (candidate) {
            firstQuote = candidate;
            break;
          }
        }
        for (let i = fixedTimes.length - 1; i >= 0; i -= 1) {
          const candidate = dataMap.get(fixedTimes[i]);
          if (candidate) {
            lastQuote = candidate;
            break;
          }
        }
      }

      // Build data array with fixed timeline
      data = fixedTimes.map((time) => {
        let quote = dataMap.get(time);
        if (!quote && firstQuote && time === firstTime) {
          quote = firstQuote;
        }
        if (!quote && lastQuote && time === lastTime) {
          quote = lastQuote;
        }
        return {
          date: dateDisplay,
          time,
          fullDate: `${displayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} ${time}`,
          price: quote ? quote.close : null,
          volume: quote ? quote.volume || 0 : 0,
        };
      });
    } else if (period === "5d") {
      const dayFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: market.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: market.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const dayMap = new Map<string, Map<string, any>>();
      for (const q of quotes) {
        const qDate = new Date(q.date);
        const dayKey = dayFormatter.format(qDate);
        const timeKey = timeFormatter.format(qDate);
        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, new Map());
        }
        dayMap.get(dayKey)!.set(timeKey, q);
      }

      const fixedTimes = buildFixedTimes(market.sessions, 30);
      let dayKeys = Array.from(dayMap.keys()).sort((a, b) => {
        const [am, ad, ay] = a.split("/");
        const [bm, bd, by] = b.split("/");
        const adate = new Date(parseInt(ay), parseInt(am) - 1, parseInt(ad));
        const bdate = new Date(parseInt(by), parseInt(bm) - 1, parseInt(bd));
        return adate.getTime() - bdate.getTime();
      });
      if (dayKeys.length > 5) {
        dayKeys = dayKeys.slice(-5);
      }

      data = dayKeys.flatMap((dayKey) => {
        const [month, day, year] = dayKey.split("/");
        const displayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dateDisplay = displayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const byTime = dayMap.get(dayKey) || new Map();
        const firstTime = fixedTimes[0];
        const lastTime = fixedTimes[fixedTimes.length - 1];
        let firstQuote: any = null;
        let lastQuote: any = null;
        if (byTime.size > 0) {
          for (const time of fixedTimes) {
            const candidate = byTime.get(time);
            if (candidate) {
              firstQuote = candidate;
              break;
            }
          }
          for (let i = fixedTimes.length - 1; i >= 0; i -= 1) {
            const candidate = byTime.get(fixedTimes[i]);
            if (candidate) {
              lastQuote = candidate;
              break;
            }
          }
        }
        return fixedTimes.map((time) => {
          let quote = byTime.get(time);
          if (!quote && firstQuote && time === firstTime) {
            quote = firstQuote;
          }
          if (!quote && lastQuote && time === lastTime) {
            quote = lastQuote;
          }
          return {
            date: dateDisplay,
            time,
            fullDate: `${displayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} ${time}`,
            price: quote ? quote.close : null,
            volume: quote ? quote.volume || 0 : 0,
          };
        });
      });
    } else {
      data = quotes.map((q: any) => {
        const date = new Date(q.date);
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          time: isIntraday
            ? date.toLocaleTimeString("en-US", {
                timeZone: market.timeZone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          fullDate:
            date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            }) +
            (isIntraday
              ? " " +
                date.toLocaleTimeString("en-US", {
                  timeZone: market.timeZone,
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : ""),
          price: q.close,
          volume: q.volume || 0,
        };
      });
    }

    chartCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Error fetching chart for ${ticker}:`, error);
    return [];
  }
}

export async function searchStocks(query: string, uiLang: UILang = "en"): Promise<SearchResult[]> {
  try {
    const results = await yf.search(query, { quotesCount: 10 }, { validateResult: false });
    return (results.quotes || [])
      .filter((q: any) => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF"))
      .map((q: any) => ({
        symbol: q.symbol,
        name: getLocalZhName(q.symbol, uiLang) || q.shortname || q.longname || q.symbol,
        exchange: q.exchange || "",
        type: q.quoteType || "EQUITY",
      }));
  } catch (error) {
    console.error("Error searching stocks:", error);
    return [];
  }
}
