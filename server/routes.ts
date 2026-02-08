import type { Express, Request } from "express";
import { type Server } from "http";
import { getStockAnalysis, getMarketOverview, getStockChart, searchStocks, scheduleZhNameUpdate, getAvailableLeaderboards, getLeaderboardData } from "./stockService";
import {
  getBacktestAlgorithms,
  getBacktestHistory,
  getBacktestPersistenceSummary,
  getBacktestResult,
  normalizeBacktestHistoryQuery,
  normalizeBacktestConfig,
  runBacktest,
  runBacktestCompare,
} from "./backtest/service";
import { type BacktestAlgorithm } from "../shared/backtest";

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
      const available = getBacktestAlgorithms();
      if (!available.includes(config.algorithm)) {
        return res.status(400).json({
          error: `Algorithm not available: ${config.algorithm}`,
        });
      }

      const result = await runBacktest(config);
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
      const query = normalizeBacktestHistoryQuery(req.query);
      const items = await getBacktestHistory(query);
      res.json(items);
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
      const result = await getBacktestResult(id);
      if (!result) {
        return res.status(404).json({ error: "Backtest result not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error in /api/backtests/:id:", error);
      res.status(500).json({ error: "Failed to fetch backtest result" });
    }
  });

  // Get persistence details for one backtest run
  app.get("/api/backtests/:id/persistence", async (req, res) => {
    try {
      const { id } = req.params;
      const summary = await getBacktestPersistenceSummary(id);
      if (!summary) {
        return res.status(404).json({ error: "Backtest persistence not found" });
      }
      res.json(summary);
    } catch (error) {
      console.error("Error in /api/backtests/:id/persistence:", error);
      res.status(500).json({ error: "Failed to fetch persistence summary" });
    }
  });

  // Run multiple algorithms for compare view
  app.post("/api/backtests/compare", async (req, res) => {
    try {
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

      const results = await runBacktestCompare(algorithms, baseConfig);
      res.json(results);
    } catch (error) {
      console.error("Error in /api/backtests/compare:", error);
      const message =
        error instanceof Error ? error.message : "Failed to run backtest compare";
      res.status(400).json({ error: message });
    }
  });

  return httpServer;
}
