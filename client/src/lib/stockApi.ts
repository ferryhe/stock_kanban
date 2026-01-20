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
}

export interface ChartDataPoint {
  date: string;
  time?: string;
  price: number;
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

// Check if US market is open (9:30 AM - 4:00 PM ET, Mon-Fri)
// Uses Intl API for proper timezone handling including DST
export function isMarketOpen(): boolean {
  const now = new Date();
  
  // Get current time in America/New_York timezone (handles DST automatically)
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
  
  // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes)
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const isDuringHours = timeInMinutes >= 570 && timeInMinutes < 960;

  return isWeekday && isDuringHours;
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
    refetchInterval: isMarketOpen() ? 2000 : 60000, // 2s during market hours, 60s otherwise
    staleTime: 1000,
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
    refetchInterval: isMarketOpen() ? 2000 : 60000,
    staleTime: 1000,
  });
};

export type ChartInterval = "1d" | "5d" | "1mo" | "3mo" | "1y";

export const useStockChart = (ticker: string, interval: ChartInterval, enabled: boolean = true) => {
  return useQuery<ChartDataPoint[]>({
    queryKey: ["chart", ticker, interval],
    queryFn: async () => {
      const res = await fetch(`/api/chart/${ticker}?interval=${interval}`);
      if (!res.ok) {
        throw new Error("Failed to fetch chart data");
      }
      return res.json();
    },
    enabled,
    staleTime: 30000,
  });
};
