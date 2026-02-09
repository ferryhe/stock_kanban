import { useQuery } from "@tanstack/react-query";
import {
  type BacktestAlgorithm,
  type BacktestConfig,
  type BacktestHistoryQuery,
  type BacktestHistoryResponse,
  type BacktestResult,
} from "@shared/backtest";
import {
  type LivePortfolioSnapshot,
  type LiveSettlementRunResult,
  type LiveTradingRunResult,
} from "@shared/liveTrading";

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
  nasdaq?: { price: number; change: number };
  shanghaiA?: { price: number; change: number };
  shenzhenA?: { price: number; change: number };
  hsi?: { price: number; change: number };
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

const STRATEGY_ACCOUNT_ID_KEY = "strategy_account_id";
const DEFAULT_STRATEGY_ACCOUNT_ID = "demo-user";

export const getStrategyAccountId = (): string => {
  if (typeof window === "undefined") {
    return DEFAULT_STRATEGY_ACCOUNT_ID;
  }
  const value = localStorage.getItem(STRATEGY_ACCOUNT_ID_KEY)?.trim();
  return value && value.length > 0 ? value : DEFAULT_STRATEGY_ACCOUNT_ID;
};

export const setStrategyAccountId = (accountId: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  const trimmed = accountId.trim();
  localStorage.setItem(
    STRATEGY_ACCOUNT_ID_KEY,
    trimmed.length > 0 ? trimmed : DEFAULT_STRATEGY_ACCOUNT_ID,
  );
};

const withStrategyAccountHeaders = () => ({
  ...withUiLang().headers,
  "x-strategy-account-id": getStrategyAccountId(),
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

export const pinTickerToTop = (watchlistId: string, ticker: string) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key) {
    const upperTicker = ticker.toUpperCase();
    // Check if ticker exists in the watchlist
    if (!current[key].tickers.includes(upperTicker)) {
      console.warn(`Ticker ${upperTicker} not found in watchlist ${watchlistId}`);
      return;
    }
    const tickers = current[key].tickers.filter(t => t !== upperTicker);
    current[key].tickers = [upperTicker, ...tickers];
    saveAndRefresh(current);
  }
};

export const moveTickerToBottom = (watchlistId: string, ticker: string) => {
  const current = getCustomWatchlists();
  const key = Object.keys(current).find((k) => current[k].id === watchlistId);
  if (key) {
    const upperTicker = ticker.toUpperCase();
    // Check if ticker exists in the watchlist
    if (!current[key].tickers.includes(upperTicker)) {
      console.warn(`Ticker ${upperTicker} not found in watchlist ${watchlistId}`);
      return;
    }
    const tickers = current[key].tickers.filter(t => t !== upperTicker);
    current[key].tickers = [...tickers, upperTicker];
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

export interface LeaderboardEntry {
  ticker: string;
  longName: string;
  rank?: number | null;
  predictedReturn: number;
  score?: number;
  signal?: string;
}

export interface LeaderboardData {
  market: string;
  entries: LeaderboardEntry[];
  updateTime: string;
  generatedAtUtc?: string;
}

// Hook to fetch available leaderboards
export const useAvailableLeaderboards = () => {
  return useQuery<string[]>({
    queryKey: ["leaderboards"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboards");
      if (!res.ok) {
        throw new Error("Failed to fetch leaderboards");
      }
      return res.json();
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000,
  });
};

// Hook to fetch leaderboard data for a specific market
export const useLeaderboardData = (market: string, enabled: boolean = true) => {
  return useQuery<LeaderboardData>({
    queryKey: ["leaderboard", market],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard/${market}`, withUiLang());
      if (!res.ok) {
        throw new Error("Failed to fetch leaderboard data");
      }
      return res.json();
    },
    enabled,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000,
  });
};

export const useBacktestAlgorithms = () => {
  return useQuery<BacktestAlgorithm[]>({
    queryKey: ["backtests", "algorithms"],
    queryFn: async () => {
      const res = await fetch("/api/backtests/algorithms");
      if (!res.ok) {
        throw new Error("Failed to fetch backtest algorithms");
      }
      return res.json();
    },
    staleTime: 60_000,
  });
};

export const runBacktestRequest = async (
  config: BacktestConfig,
): Promise<BacktestResult> => {
  const res = await fetch("/api/backtests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...withStrategyAccountHeaders(),
    },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    let message = "Failed to run backtest";
    try {
      const body = await res.json();
      if (body?.error && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return res.json();
};

export const useBacktestResult = (id: string, enabled: boolean = true) => {
  return useQuery<BacktestResult>({
    queryKey: ["backtests", id, getStrategyAccountId()],
    queryFn: async () => {
      const res = await fetch(`/api/backtests/${id}`, {
        headers: withStrategyAccountHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch backtest result");
      }
      return res.json();
    },
    enabled: enabled && id.length > 0,
    staleTime: 60_000,
  });
};

function buildBacktestHistoryQuery(query: BacktestHistoryQuery): string {
  const params = new URLSearchParams();
  if (query.algorithm) {
    params.set("algorithm", query.algorithm);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.runDateFrom) {
    params.set("runDateFrom", query.runDateFrom);
  }
  if (query.runDateTo) {
    params.set("runDateTo", query.runDateTo);
  }
  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.limit !== undefined) {
    params.set("limit", String(query.limit));
  }
  return params.toString();
}

export const useBacktestHistory = (
  query: BacktestHistoryQuery,
  enabled: boolean = true,
) => {
  return useQuery<BacktestHistoryResponse>({
    queryKey: [
      "backtests",
      "history",
      getStrategyAccountId(),
      query.algorithm ?? "",
      query.status ?? "",
      query.runDateFrom ?? "",
      query.runDateTo ?? "",
      query.page ?? 1,
      query.pageSize ?? query.limit ?? 20,
    ],
    queryFn: async () => {
      const qs = buildBacktestHistoryQuery(query);
      const url = qs.length > 0 ? `/api/backtests/history?${qs}` : "/api/backtests/history";
      const res = await fetch(url, {
        headers: withStrategyAccountHeaders(),
      });
      if (!res.ok) {
        let message = "Failed to fetch backtest history";
        try {
          const body = await res.json();
          if (body?.error && typeof body.error === "string") {
            message = body.error;
          }
        } catch {
          // ignore non-json body
        }
        throw new Error(message);
      }
      return res.json();
    },
    enabled,
    staleTime: 30_000,
  });
};

export const runBacktestCompareRequest = async (
  algorithms: BacktestAlgorithm[],
  config: Omit<BacktestConfig, "algorithm">,
): Promise<BacktestResult[]> => {
  const res = await fetch("/api/backtests/compare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...withStrategyAccountHeaders(),
    },
    body: JSON.stringify({
      algorithms,
      config,
    }),
  });

  if (!res.ok) {
    let message = "Failed to run backtest compare";
    try {
      const body = await res.json();
      if (body?.error && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return res.json();
};

export const useLivePortfolio = (
  algorithm: BacktestAlgorithm,
  enabled: boolean = true,
) => {
  return useQuery<LivePortfolioSnapshot>({
    queryKey: ["live", "portfolio", getStrategyAccountId(), algorithm],
    queryFn: async () => {
      const res = await fetch(`/api/live/portfolio?algorithm=${algorithm}`, {
        headers: withStrategyAccountHeaders(),
      });
      if (!res.ok) {
        let message = "Failed to fetch live portfolio";
        try {
          const body = await res.json();
          if (body?.error && typeof body.error === "string") {
            message = body.error;
          }
        } catch {
          // ignore non-json body
        }
        throw new Error(message);
      }
      return res.json();
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
};

export const runLiveTradingRequest = async (
  algorithm: BacktestAlgorithm,
): Promise<LiveTradingRunResult> => {
  const res = await fetch("/api/live/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...withStrategyAccountHeaders(),
    },
    body: JSON.stringify({ algorithm }),
  });

  if (!res.ok) {
    let message = "Failed to run live trading";
    try {
      const body = await res.json();
      if (body?.error && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return res.json();
};

export const runLiveSettlementNowRequest = async (): Promise<LiveSettlementRunResult> => {
  const res = await fetch("/api/live/settle-now", {
    method: "POST",
  });

  if (!res.ok) {
    let message = "Failed to run live settlement";
    try {
      const body = await res.json();
      if (body?.error && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return res.json();
};

// === Authentication API Functions ===

export const registerUser = async (
  username: string,
  password: string,
): Promise<{ message: string; user: { id: string; username: string } }> => {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let message = "Registration failed";
    try {
      const body = await res.json();
      if (body?.error && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return res.json();
};

export const loginUser = async (
  username: string,
  password: string,
): Promise<{ message: string; user: { id: string; username: string } }> => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let message = "Login failed";
    try {
      const body = await res.json();
      if (body?.error && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return res.json();
};

export const logoutUser = async (): Promise<{ message: string }> => {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Logout failed");
  }

  return res.json();
};

export const getCurrentUser = async (): Promise<{
  user: { id: string; username: string; profile?: any };
}> => {
  const res = await fetch("/api/auth/me");

  if (!res.ok) {
    throw new Error("Not authenticated");
  }

  return res.json();
};

// === Profile API Functions ===

export const getProfile = async (): Promise<any> => {
  const res = await fetch("/api/profile");

  if (!res.ok) {
    throw new Error("Failed to fetch profile");
  }

  return res.json();
};

export const updateProfile = async (data: Record<string, any>): Promise<{ message: string; profile: any }> => {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = "Failed to update profile";
    try {
      const body = await res.json();
      if (body?.error && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return res.json();
};

// === Portfolio API Functions ===

export const getPortfolios = async (): Promise<any[]> => {
  const res = await fetch("/api/portfolios");

  if (!res.ok) {
    throw new Error("Failed to fetch portfolios");
  }

  return res.json();
};

export const createPortfolio = async (data: {
  name: string;
  initialCash: number;
  type: "live" | "backtest";
  strategyId?: string;
}): Promise<{ message: string; portfolio: any }> => {
  const res = await fetch("/api/portfolios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = "Failed to create portfolio";
    try {
      const body = await res.json();
      if (body?.error && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return res.json();
};

export const getPortfolioDetails = async (portfolioId: string): Promise<any> => {
  const res = await fetch(`/api/portfolios/${portfolioId}`);

  if (!res.ok) {
    throw new Error("Failed to fetch portfolio details");
  }

  return res.json();
};
