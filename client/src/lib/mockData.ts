import { useQuery } from "@tanstack/react-query";

export type SignalType = "BUY" | "SELL" | "NEUTRAL" | "WARNING";

export interface StockData {
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
  tags: {
    label: string;
    type: SignalType;
    value?: string;
  }[];
}

// Get custom watchlists from localStorage
const getCustomWatchlists = () => {
  if (typeof window === 'undefined') return {
    AI_CHIPS: { id: "ai_chips", label: "🔥 AI & Chips", tickers: ["NVDA", "AMD", "TSM", "PLTR"] },
    NUCLEAR: { id: "nuclear", label: "⚛️ Nuclear/Energy", tickers: ["OKLO", "SMR", "CCJ"] },
    INDICES: { id: "indices", label: "📉 Market Indices", tickers: ["SPY", "QQQ", "IWM"] },
    VOLATILITY: { id: "volatility", label: "👀 High Volatility", tickers: ["UVIX", "SVIX"] },
  };
  
  const saved = localStorage.getItem("custom_watchlists");
  if (saved) return JSON.parse(saved);
  return {
    AI_CHIPS: { id: "ai_chips", label: "🔥 AI & Chips", tickers: ["NVDA", "AMD", "TSM", "PLTR"] },
    NUCLEAR: { id: "nuclear", label: "⚛️ Nuclear/Energy", tickers: ["OKLO", "SMR", "CCJ"] },
    INDICES: { id: "indices", label: "📉 Market Indices", tickers: ["SPY", "QQQ", "IWM"] },
    VOLATILITY: { id: "volatility", label: "👀 High Volatility", tickers: ["UVIX", "SVIX"] },
  };
};

export const WATCHLISTS: Record<string, any> = getCustomWatchlists();

export const saveWatchlist = (id: string, tickers: string[]) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find(k => current[k].id === id);
  if (key) {
    current[key].tickers = tickers;
    localStorage.setItem("custom_watchlists", JSON.stringify(current));
    window.location.reload();
  }
};

// Helper to generate random stock data
const generateStockData = (ticker: string, sector: string): StockData => {
  const basePrice = Math.random() * 200 + 50;
  const change = (Math.random() - 0.5) * 10;
  const changePercent = (change / basePrice) * 100;
  
  const rsi = Math.floor(Math.random() * 100);
  const volume = Math.floor(Math.random() * 50000000) + 1000000;
  const avgVolume = 20000000; // Simplified
  const sma20 = basePrice * (1 + (Math.random() - 0.5) * 0.1); // +/- 5% of price
  const shortFloat = Math.random() * 30; // 0-30% range

  const tags: StockData["tags"] = [];

  // Logic 1: RSI
  if (rsi < 30) {
    tags.push({ label: "Oversold", type: "BUY", value: `RSI ${rsi}` });
  } else if (rsi > 70) {
    tags.push({ label: "Overbought", type: "SELL", value: `RSI ${rsi}` });
  } else {
    tags.push({ label: "Neutral", type: "NEUTRAL", value: `RSI ${rsi}` });
  }

  // Logic 2: Volume Spike
  if (volume > avgVolume * 1.5) {
    tags.push({ label: "Heavy Vol", type: "WARNING", value: `${((volume/avgVolume)*100).toFixed(0)}% Avg` });
  }

  // Logic 3: Trend
  if (basePrice > sma20) {
    tags.push({ label: "Uptrend", type: "BUY", value: "> SMA20" });
  } else {
    tags.push({ label: "Downtrend", type: "SELL", value: "< SMA20" });
  }

  // Logic 4: Short Float
  if (shortFloat > 20) {
    tags.push({ label: "High Short", type: "SELL", value: `${shortFloat.toFixed(1)}%` });
  }

  return {
    ticker,
    name: ticker, // Simplified for MVP
    price: basePrice,
    changePercent,
    rsi,
    volume,
    avgVolume,
    sma20,
    shortFloat,
    sector,
    tags,
  };
};

export const useStockData = (watchlistId: string) => {
  return useQuery({
    queryKey: ["stocks", watchlistId],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const watchlist = Object.values(WATCHLISTS).find((w) => w.id === watchlistId);
      if (!watchlist) return [];

      return watchlist.tickers.map((ticker) => generateStockData(ticker, watchlist.label));
    },
    refetchInterval: 1000, // Update every 1 second as requested
  });
};
