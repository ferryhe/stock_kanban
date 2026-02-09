import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { getStockAnalysis, getMarketOverview, getStockChart, searchStocks, scheduleZhNameUpdate, getAvailableLeaderboards, getLeaderboardData } from "./stockService";
import {
  getBacktestAlgorithms,
  getBacktestHistory,
  getBacktestPersistenceSummary,
  getBacktestResult,
  normalizeBacktestUserId,
  normalizeBacktestHistoryQuery,
  normalizeBacktestConfig,
  runBacktest,
  runBacktestCompare,
} from "./backtest/service";
import { type BacktestAlgorithm } from "../shared/backtest";
import {
  getLivePortfolioSnapshot,
  normalizeLiveTradingAlgorithm,
  runLiveSettlementOnce,
  runLiveTradingCycle,
} from "./liveTrading/service";
import { register, login, logout, getCurrentUser } from "./routes/auth";
import { getProfile, updateProfile } from "./routes/profile";
import { getPortfolios, createPortfolio, getPortfolioDetails } from "./routes/portfolios";

const getUiLang = (req: Request) => {
  const uiHeader = req.headers["x-ui-lang"];
  const uiLang = Array.isArray(uiHeader) ? uiHeader[0] : uiHeader;
  if (typeof uiLang === "string") {
    if (uiLang.toLowerCase().startsWith("zh")) {
      return "zh";
    }
    return "en";
  }

  const acceptHeader = req.headers["accept-language"];
  const acceptLang = Array.isArray(acceptHeader) ? acceptHeader[0] : acceptHeader;
  if (typeof acceptLang === "string") {
    const entries = acceptLang.split(",").map((part) => part.trim()).filter(Boolean);
    let bestLang: string | null = null;
    let bestQ = 0;

    for (const entry of entries) {
      const segments = entry.split(";").map((segment) => segment.trim()).filter(Boolean);
      if (segments.length === 0) continue;

      const langRange = segments[0];
      let q = 1;

      for (let i = 1; i < segments.length; i++) {
        const [key, value] = segments[i].split("=").map((s) => s.trim());
        if (key && key.toLowerCase() === "q" && value) {
          const parsed = parseFloat(value);
          if (!Number.isNaN(parsed)) {
            q = parsed;
          }
        }
      }

      if (q > bestQ) {
        bestQ = q;
        bestLang = langRange;
      }
    }

    if (bestLang && bestLang.toLowerCase().startsWith("zh")) {
      return "zh";
    }
  }

  return "en";
};

const firstString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const isUserIsolationEnabled = (): boolean =>
  process.env.ENABLE_USER_ISOLATION === "true";

const getBacktestUserIdFromRequest = (req: Request): string | undefined => {
  // If ENABLE_USER_ISOLATION is not set or false, allow client-controlled userId (demo mode)
  // In production with real auth, this should derive from session/JWT
  const enableUserIsolation = isUserIsolationEnabled();
  
  if (!enableUserIsolation) {
    // Demo mode: accept client-provided userId for local testing
    const headerUserId = firstString(req.headers["x-user-id"]);
    const queryUserId = firstString(req.query.userId);
    const bodyUserId =
      req.body && typeof req.body === "object" ? firstString((req.body as Record<string, unknown>).userId) : undefined;
    const raw = headerUserId ?? queryUserId ?? bodyUserId;
    return normalizeBacktestUserId(raw);
  }
  
  // Production mode: derive userId from authentication
  // TODO: Extract from JWT/session instead of client-controlled header
  const headerUserId = firstString(req.headers["x-user-id"]);
  return normalizeBacktestUserId(headerUserId);
};

const resolveBacktestUserIdOrReject = (
  req: Request,
  res: Response,
): string | undefined => {
  const userId = getBacktestUserIdFromRequest(req);
  if (isUserIsolationEnabled() && !userId) {
    res.status(401).json({ error: "Unauthorized: missing user identity" });
    return undefined;
  }
  return userId;
};

const getLiveUserIdFromRequest = (req: Request): string | undefined => {
  const userId = getBacktestUserIdFromRequest(req);
  if (userId) return userId;
  if (isUserIsolationEnabled()) return undefined;
  return "demo-user";
};

export const DEFAULT_WATCHLISTS: Record<string, { label: string; tickers: string[] }> = {
  ai_chips: { label: "🔥 AI & Chips", tickers: ["NVDA", "AMD", "TSM", "PLTR"] },
  nuclear: { label: "⚛️ Nuclear/Energy", tickers: ["OKLO", "SMR", "CCJ"] },
  indices: { label: "📉 Market Indices", tickers: ["SPY", "QQQ", "IWM"] },
  volatility: { label: "👀 High Volatility", tickers: ["UVIX", "SVIX"] },
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Authentication Routes ===
  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/me", getCurrentUser);

  // === User Profile Routes ===
  app.get("/api/profile", getProfile);
  app.put("/api/profile", updateProfile);

  // === Portfolio Routes ===
  app.get("/api/portfolios", getPortfolios);
  app.post("/api/portfolios", createPortfolio);
  app.get("/api/portfolios/:portfolioId", getPortfolioDetails);

  // Get stock data for a watchlist
  app.get("/api/stocks/:watchlistId", async (req, res) => {
    try {
      const { watchlistId } = req.params;
      const customTickers = req.query.tickers as string | undefined;
      
      let tickers: string[];
      let label: string;

      // Always use custom tickers if provided, fall back to defaults
      if (customTickers) {
        tickers = customTickers.split(",").map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
        label = DEFAULT_WATCHLISTS[watchlistId]?.label || "Custom Watchlist";
      } else {
        const watchlist = DEFAULT_WATCHLISTS[watchlistId];
        if (!watchlist) {
          // Return empty array for unknown watchlists without custom tickers
          return res.json([]);
        }
        tickers = watchlist.tickers;
        label = watchlist.label;
      }

      if (tickers.length === 0) {
        return res.json([]);
      }

      const uiLang = getUiLang(req);
      scheduleZhNameUpdate(tickers, uiLang);
      const data = await getStockAnalysis(tickers, label, uiLang);
      res.json(data);
    } catch (error) {
      console.error("Error in /api/stocks:", error);
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  // Get market overview (SPY + VIX)
  app.get("/api/market", async (_req, res) => {
    try {
      const data = await getMarketOverview();
      res.json(data);
    } catch (error) {
      console.error("Error in /api/market:", error);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // Get default watchlist configuration
  app.get("/api/watchlists", (_req, res) => {
    const watchlists = Object.entries(DEFAULT_WATCHLISTS).map(([id, data]) => ({
      id,
      label: data.label,
      tickers: data.tickers,
    }));
    res.json(watchlists);
  });

  // Get historical chart data for a stock
  app.get("/api/chart/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const interval = (req.query.interval as string) || "1mo";
      const data = await getStockChart(ticker.toUpperCase(), interval);
      res.json(data);
    } catch (error) {
      console.error("Error in /api/chart:", error);
      res.status(500).json({ error: "Failed to fetch chart data" });
    }
  });

  // Search for stocks by name or symbol
  app.get("/api/search", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      if (!query || query.length < 1) {
        return res.json([]);
      }
      const results = await searchStocks(query, getUiLang(req));
      res.json(results);
    } catch (error) {
      console.error("Error in /api/search:", error);
      res.status(500).json({ error: "Failed to search stocks" });
    }
  });

  // Get single stock data
  app.get("/api/stock/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      const uiLang = getUiLang(req);
      const symbol = ticker.toUpperCase();
      scheduleZhNameUpdate([symbol], uiLang);
      const data = await getStockAnalysis([symbol], "Single Stock", uiLang);
      if (data.length === 0) {
        return res.status(404).json({ error: "Stock not found" });
      }
      res.json(data[0]);
    } catch (error) {
      console.error("Error in /api/stock:", error);
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  // Get available leaderboards
  app.get("/api/leaderboards", (_req, res) => {
    try {
      const markets = getAvailableLeaderboards();
      res.json(markets);
    } catch (error) {
      console.error("Error in /api/leaderboards:", error);
      res.status(500).json({ error: "Failed to fetch leaderboards" });
    }
  });

  // Get leaderboard data for a specific market
  app.get("/api/leaderboard/:market", async (req, res) => {
    try {
      const { market } = req.params;
      const uiLang = getUiLang(req);
      const data = await getLeaderboardData(market, uiLang);
      if (!data) {
        return res.status(404).json({ error: "Leaderboard not found" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error in /api/leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard data" });
    }
  });

  // Get available algorithms for backtesting
  app.get("/api/backtests/algorithms", (_req, res) => {
    try {
      const algorithms = getBacktestAlgorithms();
      res.json(algorithms);
    } catch (error) {
      console.error("Error in /api/backtests/algorithms:", error);
      res.status(500).json({ error: "Failed to fetch backtest algorithms" });
    }
  });

  // Run a single backtest
  app.post("/api/backtests", async (req, res) => {
    try {
      const config = normalizeBacktestConfig(req.body);
      const userId = resolveBacktestUserIdOrReject(req, res);
      if (isUserIsolationEnabled() && !userId) {
        return;
      }
      const available = getBacktestAlgorithms();
      if (!available.includes(config.algorithm)) {
        return res.status(400).json({
          error: `Algorithm not available: ${config.algorithm}`,
        });
      }

      const result = await runBacktest(config, { userId });
      res.json(result);
    } catch (error) {
      console.error("Error in /api/backtests:", error);
      const message =
        error instanceof Error ? error.message : "Failed to run backtest";
      res.status(400).json({ error: message });
    }
  });

  // Get backtest history list with filters
  app.get("/api/backtests/history", async (req, res) => {
    try {
      const userId = resolveBacktestUserIdOrReject(req, res);
      if (isUserIsolationEnabled() && !userId) {
        return;
      }
      const query = normalizeBacktestHistoryQuery(req.query);
      const response = await getBacktestHistory(query, { userId });
      res.json(response);
    } catch (error) {
      console.error("Error in /api/backtests/history:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch backtest history";
      res.status(400).json({ error: message });
    }
  });

  // Get single backtest result
  app.get("/api/backtests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = resolveBacktestUserIdOrReject(req, res);
      if (isUserIsolationEnabled() && !userId) {
        return;
      }
      const result = await getBacktestResult(id, { userId });
      if (!result) {
        return res.status(404).json({ error: "Backtest result not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error in /api/backtests/:id:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch backtest result";
      res.status(400).json({ error: message });
    }
  });

  // Get persistence details for one backtest run
  app.get("/api/backtests/:id/persistence", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = resolveBacktestUserIdOrReject(req, res);
      if (isUserIsolationEnabled() && !userId) {
        return;
      }
      const summary = await getBacktestPersistenceSummary(id, { userId });
      if (!summary) {
        return res.status(404).json({ error: "Backtest persistence not found" });
      }
      res.json(summary);
    } catch (error) {
      console.error("Error in /api/backtests/:id/persistence:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch persistence summary";
      res.status(400).json({ error: message });
    }
  });

  // Run multiple algorithms for compare view
  app.post("/api/backtests/compare", async (req, res) => {
    try {
      const userId = resolveBacktestUserIdOrReject(req, res);
      if (isUserIsolationEnabled() && !userId) {
        return;
      }
      const rawAlgorithms = Array.isArray(req.body?.algorithms)
        ? req.body.algorithms
        : [];
      const algorithms = rawAlgorithms
        .filter((item: unknown): item is string => typeof item === "string")
        .map((item: string) => item.toLowerCase())
        .filter(
          (item: string): item is BacktestAlgorithm =>
            item === "us" || item === "cn" || item === "hk",
        );

      if (algorithms.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one algorithm is required" });
      }

      const firstConfig = normalizeBacktestConfig({
        ...(req.body?.config ?? {}),
        algorithm: algorithms[0],
      });
      const { algorithm: _ignored, ...baseConfig } = firstConfig;

      const results = await runBacktestCompare(algorithms, baseConfig, { userId });
      res.json(results);
    } catch (error) {
      console.error("Error in /api/backtests/compare:", error);
      const message =
        error instanceof Error ? error.message : "Failed to run backtest compare";
      res.status(400).json({ error: message });
    }
  });

  // Run one live paper-trading cycle
  app.post("/api/live/run", async (req, res) => {
    try {
      const userId = getLiveUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: missing user identity" });
      }
      const algorithm = normalizeLiveTradingAlgorithm(req.body?.algorithm ?? "us");
      const result = await runLiveTradingCycle(userId, algorithm);
      res.json(result);
    } catch (error) {
      console.error("Error in /api/live/run:", error);
      const message =
        error instanceof Error ? error.message : "Failed to run live trading cycle";
      res.status(400).json({ error: message });
    }
  });

  // Get current live portfolio snapshot
  app.get("/api/live/portfolio", async (req, res) => {
    try {
      const userId = getLiveUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: missing user identity" });
      }
      const algorithm = normalizeLiveTradingAlgorithm(req.query.algorithm ?? "us");
      const snapshot = await getLivePortfolioSnapshot(userId, algorithm);
      res.json(snapshot);
    } catch (error) {
      console.error("Error in /api/live/portfolio:", error);
      const message =
        error instanceof Error ? error.message : "Failed to fetch live portfolio";
      res.status(400).json({ error: message });
    }
  });

  // Trigger settlement once (for validation / ops)
  // Requires ADMIN_SECRET header for security
  app.post("/api/live/settle-now", async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret) {
      const providedSecret = req.headers["x-admin-secret"];
      if (providedSecret !== adminSecret) {
        return res.status(403).json({ error: "Forbidden: invalid or missing admin secret" });
      }
    }
    try {
      const result = await runLiveSettlementOnce();
      res.json(result);
    } catch (error) {
      console.error("Error in /api/live/settle-now:", error);
      const message =
        error instanceof Error ? error.message : "Failed to run live settlement";
      res.status(400).json({ error: message });
    }
  });

  return httpServer;
}
