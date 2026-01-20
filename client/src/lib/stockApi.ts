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

export interface Watchlist {
  id: string;
  label: string;
  tickers: string[];
}

export interface MarketOverview {
  spy: { price: number; change: number };
  vix: { price: number; change: number };
}

// Get custom watchlists from localStorage or use defaults
const getCustomWatchlists = (): Record<string, Watchlist> => {
  if (typeof window === "undefined") {
    return getDefaultWatchlists();
  }
  
  const saved = localStorage.getItem("custom_watchlists");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return getDefaultWatchlists();
    }
  }
  return getDefaultWatchlists();
};

const getDefaultWatchlists = (): Record<string, Watchlist> => ({
  AI_CHIPS: { id: "ai_chips", label: "🔥 AI & Chips", tickers: ["NVDA", "AMD", "TSM", "PLTR"] },
  NUCLEAR: { id: "nuclear", label: "⚛️ Nuclear/Energy", tickers: ["OKLO", "SMR", "CCJ"] },
  INDICES: { id: "indices", label: "📉 Market Indices", tickers: ["SPY", "QQQ", "IWM"] },
  VOLATILITY: { id: "volatility", label: "👀 High Volatility", tickers: ["UVIX", "SVIX"] },
});

export const WATCHLISTS: Record<string, Watchlist> = getCustomWatchlists();

export const saveWatchlist = (watchlistId: string, tickers: string[]) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key) {
    current[key].tickers = tickers;
    localStorage.setItem("custom_watchlists", JSON.stringify(current));
    window.location.reload();
  }
};

export const useStockData = (watchlistId: string) => {
  const watchlist = Object.values(WATCHLISTS).find((w) => w.id === watchlistId);
  const customTickers = watchlist?.tickers.join(",") || "";

  return useQuery<StockData[]>({
    queryKey: ["stocks", watchlistId, customTickers],
    queryFn: async () => {
      const url = customTickers
        ? `/api/stocks/${watchlistId}?tickers=${encodeURIComponent(customTickers)}`
        : `/api/stocks/${watchlistId}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch stock data");
      }
      return res.json();
    },
    refetchInterval: 60000, // Refresh every 60 seconds (aligned with cache)
    staleTime: 30000, // Consider data stale after 30 seconds
  });
};

export const useMarketOverview = () => {
  return useQuery<MarketOverview>({
    queryKey: ["market"],
    queryFn: async () => {
      const res = await fetch("/api/market");
      if (!res.ok) {
        throw new Error("Failed to fetch market data");
      }
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
};
