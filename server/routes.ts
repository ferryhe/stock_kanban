import type { Express, Request } from "express";
import { type Server } from "http";
import { getStockAnalysis, getMarketOverview, getStockChart, searchStocks, scheduleZhNameUpdate } from "./stockService";

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

  return httpServer;
}
