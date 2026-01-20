import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStockAnalysis, getMarketOverview, getStockChart, searchStocks } from "./stockService";

const DEFAULT_WATCHLISTS: Record<string, { label: string; tickers: string[] }> = {
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

      const data = await getStockAnalysis(tickers, label);
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
      const results = await searchStocks(query);
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
      const data = await getStockAnalysis([ticker.toUpperCase()], "Single Stock");
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
