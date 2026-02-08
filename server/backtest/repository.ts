import { and, eq, sql } from "drizzle-orm";
import { db, isDatabaseEnabled } from "../db";
import {
  backtestResults,
  dailySettlements,
  holdings,
  portfolios,
  strategies,
  strategyPerformance,
  trades,
} from "../../shared/schema";
import { type BacktestResult } from "../../shared/backtest";

export interface BacktestPersistenceSummary {
  backtestResultId: string;
  strategyId: string | null;
  portfolioId: string | null;
  portfolioType: string | null;
  backtestStatus: string | null;
  tradeCount: number;
  settlementCount: number;
  holdingCount: number;
  performanceCount: number;
}

type HoldingState = {
  quantity: number;
  avgCost: number;
  lastPrice: number | null;
};

function toIso(createdAt: Date | string): string {
  if (createdAt instanceof Date) {
    return createdAt.toISOString();
  }

  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function mapRowToResult(row: typeof backtestResults.$inferSelect): BacktestResult {
  return {
    id: row.id,
    createdAt: toIso(row.createdAt),
    config: row.config,
    summary: row.summary,
    equityCurve: row.equityCurve,
    trades: row.trades,
    metadata: row.metadata,
  };
}

function num(value: number, fractionDigits: number): string {
  return value.toFixed(fractionDigits);
}

function parseCount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function tradeTimestamp(date: string): Date {
  return new Date(`${date}T16:00:00.000Z`);
}

function computeFinalHoldings(result: BacktestResult): Map<string, HoldingState> {
  const state = new Map<string, HoldingState>();

  const sortedTrades = [...result.trades].sort((a, b) => {
    if (a.date === b.date) return 0;
    return a.date < b.date ? -1 : 1;
  });

  for (const trade of sortedTrades) {
    const key = trade.ticker.toUpperCase();
    const prev = state.get(key) ?? { quantity: 0, avgCost: 0, lastPrice: null };

    if (trade.side === "BUY") {
      const nextQty = prev.quantity + trade.shares;
      const nextAvg =
        nextQty > 0
          ? (prev.quantity * prev.avgCost + trade.shares * trade.price) / nextQty
          : 0;
      state.set(key, {
        quantity: nextQty,
        avgCost: nextAvg,
        lastPrice: trade.price,
      });
    } else {
      const nextQty = Math.max(0, prev.quantity - trade.shares);
      if (nextQty === 0) {
        state.delete(key);
      } else {
        state.set(key, {
          quantity: nextQty,
          avgCost: prev.avgCost,
          lastPrice: trade.price,
        });
      }
    }
  }

  return state;
}

async function ensureStrategy(
  tx: typeof db extends infer T ? NonNullable<T> : never,
  result: BacktestResult,
): Promise<string> {
  const strategyName = `Auto ${result.config.algorithm.toUpperCase()} Strategy`;

  const existing = await tx
    .select({ id: strategies.id })
    .from(strategies)
    .where(
      and(
        eq(strategies.algorithmId, result.config.algorithm),
        eq(strategies.name, strategyName),
        eq(strategies.isActive, true),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const inserted = await tx
    .insert(strategies)
    .values({
      name: strategyName,
      algorithmId: result.config.algorithm,
      description: "Auto-generated strategy for backtest persistence",
      parameters: {
        source: "stock_kanban",
        createdFromBacktestResult: result.id,
        positionParams: result.config.positionParams,
        executionParams: result.config.executionParams,
        options: result.config.options,
      },
      isActive: true,
    })
    .returning({ id: strategies.id });

  return inserted[0].id;
}

async function createPortfolio(
  tx: typeof db extends infer T ? NonNullable<T> : never,
  result: BacktestResult,
  strategyId: string,
): Promise<string> {
  const latestPoint = result.equityCurve[result.equityCurve.length - 1];

  const inserted = await tx
    .insert(portfolios)
    .values({
      strategyId,
      name: `${result.config.algorithm.toUpperCase()} Backtest ${result.id.slice(0, 8)}`,
      type: "backtest",
      initialCash: num(result.config.initialCash, 2),
      currentCash: num(latestPoint.cash, 2),
      totalValue: num(latestPoint.totalValue, 2),
      backtestStartDate: result.config.startDate,
      backtestEndDate: result.config.endDate,
      backtestStatus: "completed",
      sourceBacktestResultId: result.id,
    })
    .returning({ id: portfolios.id });

  return inserted[0].id;
}

async function insertTrades(
  tx: typeof db extends infer T ? NonNullable<T> : never,
  portfolioId: string,
  result: BacktestResult,
): Promise<void> {
  if (result.trades.length === 0) {
    return;
  }

  await tx.insert(trades).values(
    result.trades.map((trade) => ({
      portfolioId,
      ticker: trade.ticker.toUpperCase(),
      tradeType: trade.side,
      quantity: num(trade.shares, 4),
      price: num(trade.price, 4),
      totalAmount: num(trade.notional, 2),
      commission: num(trade.commission, 2),
      slippage: num(trade.slippage, 2),
      signalSource: result.config.algorithm,
      executedAt: tradeTimestamp(trade.date),
      notes: null,
    })),
  );
}

async function insertSettlements(
  tx: typeof db extends infer T ? NonNullable<T> : never,
  portfolioId: string,
  result: BacktestResult,
): Promise<void> {
  if (result.equityCurve.length === 0) {
    return;
  }

  await tx.insert(dailySettlements).values(
    result.equityCurve.map((point) => ({
      portfolioId,
      settlementDate: point.date,
      totalValue: num(point.totalValue, 2),
      cash: num(point.cash, 2),
      holdingsValue: num(point.holdingsValue, 2),
      dailyReturn: num(point.dailyReturn, 6),
      cumulativeReturn: num(point.totalValue / result.config.initialCash - 1, 6),
    })),
  );
}

async function insertPerformance(
  tx: typeof db extends infer T ? NonNullable<T> : never,
  portfolioId: string,
  result: BacktestResult,
): Promise<void> {
  await tx.insert(strategyPerformance).values({
    portfolioId,
    calculationDate: result.config.endDate,
    totalReturn: num(result.summary.totalReturn, 6),
    annualizedReturn: num(result.summary.annualizedReturn, 6),
    volatility: num(result.summary.volatility, 6),
    maxDrawdown: num(result.summary.maxDrawdown, 6),
    sharpeRatio: num(result.summary.sharpeRatio, 6),
    sortinoRatio: null,
    calmarRatio: null,
    winRate: num(result.summary.winRate, 6),
    totalTrades: result.summary.totalTrades,
  });
}

async function insertFinalHoldings(
  tx: typeof db extends infer T ? NonNullable<T> : never,
  portfolioId: string,
  result: BacktestResult,
): Promise<void> {
  const finalHoldings = computeFinalHoldings(result);
  if (finalHoldings.size === 0) {
    return;
  }

  const rows = Array.from(finalHoldings.entries()).map(([ticker, state]) => {
    const currentPrice = state.lastPrice;
    const marketValue = currentPrice === null ? null : state.quantity * currentPrice;
    const unrealizedPnl =
      currentPrice === null ? null : (currentPrice - state.avgCost) * state.quantity;

    return {
      portfolioId,
      ticker,
      quantity: num(state.quantity, 4),
      avgCost: num(state.avgCost, 4),
      currentPrice: currentPrice === null ? null : num(currentPrice, 4),
      marketValue: marketValue === null ? null : num(marketValue, 2),
      unrealizedPnl: unrealizedPnl === null ? null : num(unrealizedPnl, 2),
    };
  });

  await tx.insert(holdings).values(rows);
}

export async function saveBacktestResultToDb(result: BacktestResult): Promise<boolean> {
  if (!isDatabaseEnabled || !db) {
    return false;
  }

  await db.transaction(async (tx) => {
    await tx.insert(backtestResults).values({
      id: result.id,
      algorithm: result.config.algorithm,
      startDate: result.config.startDate,
      endDate: result.config.endDate,
      initialCash: num(result.config.initialCash, 2),
      config: result.config,
      summary: result.summary,
      equityCurve: result.equityCurve,
      trades: result.trades,
      metadata: result.metadata,
      createdAt: new Date(result.createdAt),
    });

    const strategyId = await ensureStrategy(tx, result);
    const portfolioId = await createPortfolio(tx, result, strategyId);

    await insertTrades(tx, portfolioId, result);
    await insertSettlements(tx, portfolioId, result);
    await insertPerformance(tx, portfolioId, result);
    await insertFinalHoldings(tx, portfolioId, result);
  });

  return true;
}

export async function getBacktestResultFromDb(id: string): Promise<BacktestResult | null> {
  if (!isDatabaseEnabled || !db) {
    return null;
  }

  const rows = await db
    .select()
    .from(backtestResults)
    .where(eq(backtestResults.id, id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return mapRowToResult(rows[0]);
}

export async function getBacktestPersistenceSummaryByResultId(
  backtestResultId: string,
): Promise<BacktestPersistenceSummary | null> {
  if (!isDatabaseEnabled || !db) {
    return null;
  }

  const portfolioRows = await db
    .select({
      id: portfolios.id,
      strategyId: portfolios.strategyId,
      type: portfolios.type,
      backtestStatus: portfolios.backtestStatus,
    })
    .from(portfolios)
    .where(eq(portfolios.sourceBacktestResultId, backtestResultId))
    .limit(1);

  if (portfolioRows.length === 0) {
    return {
      backtestResultId,
      strategyId: null,
      portfolioId: null,
      portfolioType: null,
      backtestStatus: null,
      tradeCount: 0,
      settlementCount: 0,
      holdingCount: 0,
      performanceCount: 0,
    };
  }

  const portfolio = portfolioRows[0];

  const [tradeRows, settlementRows, holdingRows, performanceRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(trades)
      .where(eq(trades.portfolioId, portfolio.id)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(dailySettlements)
      .where(eq(dailySettlements.portfolioId, portfolio.id)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(holdings)
      .where(eq(holdings.portfolioId, portfolio.id)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(strategyPerformance)
      .where(eq(strategyPerformance.portfolioId, portfolio.id)),
  ]);

  return {
    backtestResultId,
    strategyId: portfolio.strategyId,
    portfolioId: portfolio.id,
    portfolioType: portfolio.type,
    backtestStatus: portfolio.backtestStatus,
    tradeCount: parseCount(tradeRows[0]?.count),
    settlementCount: parseCount(settlementRows[0]?.count),
    holdingCount: parseCount(holdingRows[0]?.count),
    performanceCount: parseCount(performanceRows[0]?.count),
  };
}
