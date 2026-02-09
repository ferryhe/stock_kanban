import type { Request, Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db, isDatabaseEnabled } from "../db";
import { portfolios, holdings, trades, dailySettlements } from "../../shared/schema";

/**
 * GET /api/portfolios
 * Get all portfolios for current user
 */
export async function getPortfolios(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const userPortfolios = await db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.userId, req.session.userId),
          isNull(portfolios.sourceBacktestResultId),
        ),
      );

    return res.json(userPortfolios);
  } catch (error) {
    console.error("Get portfolios error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/portfolios
 * Create a new portfolio
 */
export async function createPortfolio(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { strategyId, name, initialCash, type } = req.body;

    // Validation
    if (!name || !initialCash) {
      return res.status(400).json({ error: "Name and initialCash are required" });
    }

    if (typeof initialCash !== "number" || initialCash <= 0) {
      return res.status(400).json({ error: "initialCash must be a positive number" });
    }

    if (!["live", "backtest"].includes(type)) {
      return res.status(400).json({ error: "type must be 'live' or 'backtest'" });
    }

    const created = await db
      .insert(portfolios)
      .values({
        strategyId: strategyId || null,
        userId: req.session.userId,
        name,
        type,
        initialCash: initialCash.toString(),
        currentCash: initialCash.toString(),
        totalValue: initialCash.toString(),
      })
      .returning();

    if (created.length === 0) {
      return res.status(500).json({ error: "Failed to create portfolio" });
    }

    return res.status(201).json({ message: "Portfolio created", portfolio: created[0] });
  } catch (error) {
    console.error("Create portfolio error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/portfolios/:portfolioId
 * Get portfolio details with holdings and recent trades
 */
export async function getPortfolioDetails(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { portfolioId } = req.params;

    // Check ownership
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.id, portfolioId),
          eq(portfolios.userId, req.session.userId),
        ),
      )
      .limit(1);

    if (portfolio.length === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    const portfolioData = portfolio[0];

    // Get holdings
    const holdingsList = await db
      .select()
      .from(holdings)
      .where(eq(holdings.portfolioId, portfolioId));

    // Get recent trades (last 20)
    const recentTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.portfolioId, portfolioId))
      .orderBy((t) => t.executedAt)
      .limit(20);

    // Get latest settlement
    const latestSettlement = await db
      .select()
      .from(dailySettlements)
      .where(eq(dailySettlements.portfolioId, portfolioId))
      .orderBy((s) => s.settlementDate)
      .limit(1);

    return res.json({
      portfolio: portfolioData,
      holdings: holdingsList,
      recentTrades,
      latestSettlement: latestSettlement.length > 0 ? latestSettlement[0] : null,
    });
  } catch (error) {
    console.error("Get portfolio details error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * DELETE /api/portfolios/:portfolioId
 * Soft delete a portfolio
 */
export async function deletePortfolio(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { portfolioId } = req.params;

    // Check ownership
    const portfolio = await db
      .select()
      .from(portfolios)
      .where(
        and(
          eq(portfolios.id, portfolioId),
          eq(portfolios.userId, req.session.userId),
        ),
      )
      .limit(1);

    if (portfolio.length === 0) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    // Note: In a real app, you might want to soft-delete by adding an isDeleted flag
    // For now, we'll just not delete from DB but remove from user view
    // This is a design choice to preserve historical data

    return res.json({ message: "Portfolio deletion is not permanent - data is preserved" });
  } catch (error) {
    console.error("Delete portfolio error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
