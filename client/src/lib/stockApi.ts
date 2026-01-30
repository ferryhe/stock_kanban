import { useQuery } from "@tanstack/react-query";

export type SignalType = "BUY" | "SELL" | "NEUTRAL" | "WARNING";

export interface QuantMetrics {
  score?: number | null;
  rank?: number;
  predictedReturn?: number;
  risk?: {
    vol60?: number;
    maxdd252?: number;
  };
  signal?: "BUY" | "SELL" | "HOLD" | "RISK_ALERT";
}

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
  week52High?: number;
  week52Low?: number;
  macd?: number;
  macdSignal?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  tags: {
    label: string;
    type: SignalType;
    value?: string;
  }[];
  quant?: QuantMetrics;
}

export interface ChartDataPoint {
  date: string;
  time?: string;
  fullDate: string;
  price: number | null;
  volume: number;
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

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

const getUiLang = (): "en" | "zh" => {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("ui_language");
  return stored === "zh" ? "zh" : "en";
};

const withUiLang = () => ({
  headers: {
    "x-ui-lang": getUiLang(),
  },
});

// Check if US market is open (9:30 AM - 4:00 PM ET, Mon-Fri)
export function isMarketOpen(): boolean {
  const now = new Date();
  
  const etFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  });
  
  const parts = etFormatter.formatToParts(now);
  const weekday = parts.find(p => p.type === "weekday")?.value || "";
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
  
  const timeInMinutes = hour * 60 + minute;
  
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const isDuringHours = timeInMinutes >= 570 && timeInMinutes < 960;

  return isWeekday && isDuringHours;
}

// Get current ET time formatted
export function getCurrentETTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// Get custom watchlists from localStorage or use defaults
// Performs validation to ensure data integrity:
// - Validates parsed data has correct object structure
// - Validates each watchlist has required fields (id, label, tickers)
// - Clears corrupted localStorage data automatically
// - Always returns valid watchlists (defaults if storage is corrupted)
export const getCustomWatchlists = (): Record<string, Watchlist> => {
  if (typeof window === "undefined") {
    return getDefaultWatchlists();
  }

  const saved = localStorage.getItem("custom_watchlists");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Validate that parsed data is a non-empty object
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        localStorage.removeItem("custom_watchlists");
        return getDefaultWatchlists();
      }

      // Filter to keep only valid watchlists
      const validWatchlists = Object.entries(parsed).reduce((acc, [key, w]: [string, any]) => {
        if (
          w &&
          typeof w === "object" &&
          typeof w.id === "string" &&
          typeof w.label === "string" &&
          Array.isArray(w.tickers) &&
          w.tickers.every((t: unknown) => typeof t === "string")
        ) {
          acc[key] = w as Watchlist;
        }
        return acc;
      }, {} as Record<string, Watchlist>);

      // Return valid watchlists if we have at least one
      if (Object.keys(validWatchlists).length > 0) {
        // If we filtered out some invalid watchlists, save the cleaned version
        if (Object.keys(validWatchlists).length !== Object.keys(parsed).length) {
          try {
            localStorage.setItem("custom_watchlists", JSON.stringify(validWatchlists));
          } catch (error) {
            // Log storage errors for debugging, but do not disrupt user flow
            console.error("Failed to save cleaned custom_watchlists to localStorage:", error);
          }
        }
        return validWatchlists;
      }

      // No valid watchlists found, clear storage and return defaults
      localStorage.removeItem("custom_watchlists");
      return getDefaultWatchlists();
    } catch {
      // If parsing fails, clear corrupted data and return defaults
      localStorage.removeItem("custom_watchlists");
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

export let WATCHLISTS: Record<string, Watchlist> = getCustomWatchlists();

export const refreshWatchlists = () => {
  WATCHLISTS = getCustomWatchlists();
  return WATCHLISTS;
};

// Hook to get watchlists with reactivity
export const useWatchlists = () => {
  return useQuery({
    queryKey: ["watchlists"],
    queryFn: () => getCustomWatchlists(),
    staleTime: Infinity,
  });
};

type WatchlistListener = () => void;
const watchlistListeners: Set<WatchlistListener> = new Set();

export const subscribeToWatchlistChanges = (listener: WatchlistListener): (() => void) => {
  watchlistListeners.add(listener);
  return () => { watchlistListeners.delete(listener); };
};

const notifyWatchlistChange = () => {
  watchlistListeners.forEach(listener => listener());
};

const saveAndRefresh = (newWatchlists: Record<string, Watchlist>) => {
  localStorage.setItem("custom_watchlists", JSON.stringify(newWatchlists));
  WATCHLISTS = newWatchlists;
  notifyWatchlistChange();
};

export const saveWatchlist = (watchlistId: string, tickers: string[]) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key) {
    current[key].tickers = tickers;
    saveAndRefresh(current);
  }
};

export const createWatchlist = (label: string, tickers: string[] = []): Watchlist => {
  const current = getCustomWatchlists();
  const id = label.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
  const key = "CUSTOM_" + Date.now();
  const newWatchlist: Watchlist = { id, label, tickers };
  current[key] = newWatchlist;
  saveAndRefresh(current);
  return newWatchlist;
};

export const deleteWatchlist = (watchlistId: string) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key && Object.keys(current).length > 1) {
    delete current[key];
    saveAndRefresh(current);
  }
};

export const addTickerToWatchlist = (watchlistId: string, ticker: string) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key && !current[key].tickers.includes(ticker.toUpperCase())) {
    current[key].tickers.push(ticker.toUpperCase());
    saveAndRefresh(current);
  }
};

export const removeTickerFromWatchlist = (watchlistId: string, ticker: string) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key) {
    current[key].tickers = current[key].tickers.filter(t => t !== ticker.toUpperCase());
    saveAndRefresh(current);
  }
};

export const updateWatchlistLabel = (watchlistId: string, newLabel: string) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key) {
    current[key].label = newLabel;
    saveAndRefresh(current);
  }
};

export const reorderTickersInWatchlist = (watchlistId: string, orderedTickers: string[]) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key) {
    current[key].tickers = orderedTickers;
    saveAndRefresh(current);
  }
};

export const reorderWatchlists = (orderedIds: string[]) => {
  const current = getCustomWatchlists();
  const entries = Object.entries(current);
  const reordered: Record<string, Watchlist> = {};
  
  const orderedSet = new Set(orderedIds);
  let index = 0;
  
  orderedIds.forEach((id) => {
    const entry = entries.find(([_, w]) => w.id === id);
    if (entry) {
      reordered[`CUSTOM_${index}`] = entry[1];
      index++;
    }
  });
  
  entries.forEach(([_, watchlist]) => {
    if (!orderedSet.has(watchlist.id)) {
      reordered[`CUSTOM_${index}`] = watchlist;
      index++;
    }
  });
  
  saveAndRefresh(reordered);
};

export const getWatchlistsArray = () => Object.values(getCustomWatchlists());

export const useStockData = (watchlistId: string) => {
  return useQuery<StockData[]>({
    queryKey: ["stocks", watchlistId],
    queryFn: async () => {
      // Get fresh watchlist data to find the current watchlist
      const currentWatchlists = getCustomWatchlists();
      const watchlist = Object.values(currentWatchlists).find((w) => w.id === watchlistId);
      
      // If no watchlist found or no tickers, return empty array
      if (!watchlist || watchlist.tickers.length === 0) {
        return [];
      }

      const customTickers = watchlist.tickers.join(",");
      const url = `/api/stocks/${watchlistId}?tickers=${encodeURIComponent(customTickers)}`;

      const res = await fetch(url, withUiLang());
      if (!res.ok) {
        throw new Error("Failed to fetch stock data");
      }
      return res.json();
    },
    refetchInterval: isMarketOpen() ? 2000 : 60000,
    staleTime: 1000,
  });
};

export const useMarketOverview = () => {
  return useQuery<MarketOverview>({
    queryKey: ["market"],
    queryFn: async () => {
      const res = await fetch("/api/market", withUiLang());
      if (!res.ok) {
        throw new Error("Failed to fetch market data");
      }
      return res.json();
    },
    refetchInterval: isMarketOpen() ? 2000 : 60000,
    staleTime: 1000,
  });
};

export type ChartInterval = "1d" | "5d" | "1mo" | "3mo" | "1y";

export const useStockChart = (ticker: string, interval: ChartInterval, enabled: boolean = true) => {
  return useQuery<ChartDataPoint[]>({
    queryKey: ["chart", ticker, interval],
    queryFn: async () => {
      const res = await fetch(`/api/chart/${ticker}?interval=${interval}`, withUiLang());
      if (!res.ok) {
        throw new Error("Failed to fetch chart data");
      }
      return res.json();
    },
    enabled,
    staleTime: interval === "1d" ? 5000 : 30000,
    refetchInterval: interval === "1d" && isMarketOpen() ? 5000 : undefined,
  });
};

export const useStockSearch = (query: string) => {
  return useQuery<SearchResult[]>({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query || query.length < 1) return [];
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, withUiLang());
      if (!res.ok) {
        throw new Error("Failed to search stocks");
      }
      return res.json();
    },
    enabled: query.length >= 1,
    staleTime: 60000,
  });
};

// Hook to fetch single stock data with real-time updates
export const useSingleStock = (ticker: string, enabled: boolean = true) => {
  return useQuery<StockData>({
    queryKey: ["single-stock", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/stock/${ticker}`, withUiLang());
      if (!res.ok) {
        throw new Error("Failed to fetch stock data");
      }
      return res.json();
    },
    enabled,
    refetchInterval: isMarketOpen() ? 2000 : 60000,
    staleTime: 1000,
  });
};
