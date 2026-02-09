import { and, desc, eq, lt } from "drizzle-orm";
import { db, isDatabaseEnabled } from "../db";
import {
  dailySettlements,
  holdings,
  portfolios,
  strategies,
  trades,
  users,
} from "../../shared/schema";
import { type BacktestAlgorithm } from "../../shared/backtest";
import {
  type LiveHoldingView,
  type LivePortfolioSnapshot,
  type LiveSettlementRunResult,
  type LiveTradeView,
  type LiveTradingRunResult,
} from "../../shared/liveTrading";
import { loadHistoricalPrices } from "../backtest/priceProvider";
import { loadSignalSnapshot } from "../backtest/signalProvider";

type LivePositionState = {
  quantity: number;
  avgCost: number;
};

type DbTx = typeof db extends infer T ? NonNullable<T> : never;

const LIVE_DEFAULTS = {
  initialCash: 100000,
  maxPositionPerStock: 0.1,
  maxTotalPositions: 10,
  minCashReserve: 0.1,
  commissionBps: 5,
  slippageBps: 5,
  minCommission: 1,
};

let schedulerTimer: NodeJS.Timeout | null = null;
let schedulerBusy = false;
let schedulerLastSettlementDate: string | null = null;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toMoney(value: number, digits: number): string {
  return value.toFixed(digits);
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return fallback;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function normalizeAlgorithm(value: unknown): BacktestAlgorithm {
  if (typeof value !== "string") {
    throw new Error("algorithm is required");
  }
  const lowered = value.toLowerCase();
  if (lowered === "us" || lowered === "cn" || lowered === "hk") {
    return lowered;
  }
  throw new Error(`Unsupported algorithm: ${value}`);
}

function syntheticUsernameFromUserId(userId: string): string {
  const safe = userId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return `ext_${safe}`.slice(0, 64);
}

function getSlippageMultiplier(side: "BUY" | "SELL"): number {
  const slip = LIVE_DEFAULTS.slippageBps / 10000;
  return side === "BUY" ? 1 + slip : 1 - slip;
}

function calcCommission(notional: number): number {
  if (notional <= 0) return 0;
  return Math.max(
    LIVE_DEFAULTS.minCommission,
    notional * (LIVE_DEFAULTS.commissionBps / 10000),
  );
}

function maxAffordableShares(cash: number, fillPrice: number): number {
  if (cash <= 0 || fillPrice <= 0 || !Number.isFinite(fillPrice)) return 0;

  let low = 0;
  let high = Math.floor(cash / fillPrice);
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const notional = mid * fillPrice;
    const commission = calcCommission(notional);
    if (notional + commission <= cash) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
}

function calcPortfolioTotals(
  cash: number,
  positions: Map<string, LivePositionState>,
  prices: Map<string, number>,
): { holdingsValue: number; totalValue: number } {
  let holdingsValue = 0;
  Array.from(positions.entries()).forEach(([ticker, position]) => {
    const price = prices.get(ticker);
    if (!price || !Number.isFinite(price)) return;
    holdingsValue += position.quantity * price;
  });
  return {
    holdingsValue,
    totalValue: cash + holdingsValue,
  };
}

function buildTargetWeights(
  entries: Array<{ ticker: string; signal: string; predictedReturn: number | null }>,
): Map<string, number> {
  const investable = Math.max(0, 1 - LIVE_DEFAULTS.minCashReserve);
  if (investable <= 0) return new Map();

  const candidates = entries
    .filter((entry) => entry.signal === "BUY")
    .sort(
      (a, b) =>
        (b.predictedReturn ?? Number.NEGATIVE_INFINITY) -
        (a.predictedReturn ?? Number.NEGATIVE_INFINITY),
    )
    .slice(0, LIVE_DEFAULTS.maxTotalPositions);

  if (candidates.length === 0) return new Map();

  const equalWeight = investable / candidates.length;
  const weight = Math.min(equalWeight, LIVE_DEFAULTS.maxPositionPerStock);
  const map = new Map<string, number>();
  candidates.forEach((entry) => map.set(entry.ticker, Math.max(0, weight)));
  return map;
}

async function ensureUserExists(userId: string): Promise<void> {
  if (!db) {
    throw new Error("Live trading requires DATABASE_URL");
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (existing.length > 0) return;

  await db.insert(users).values({
    id: userId,
    username: syntheticUsernameFromUserId(userId),
    password: "!external-user",
  });
}

async function ensureLiveStrategy(algorithm: BacktestAlgorithm): Promise<string> {
  if (!db) {
    throw new Error("Live trading requires DATABASE_URL");
  }

  const name = `Live ${algorithm.toUpperCase()} Strategy`;
  const rows = await db
    .select({ id: strategies.id })
    .from(strategies)
    .where(
      and(
        eq(strategies.name, name),
        eq(strategies.algorithmId, algorithm),
        eq(strategies.isActive, true),
      ),
    )
    .limit(1);
  if (rows.length > 0) {
    return rows[0].id;
  }

  const inserted = await db
    .insert(strategies)
    .values({
      name,
      algorithmId: algorithm,
      description: "Live paper trading strategy",
      parameters: {
        mode: "live-paper",
        defaults: LIVE_DEFAULTS,
      },
      isActive: true,
    })
    .returning({ id: strategies.id });
  return inserted[0].id;
}

async function ensureLivePortfolio(
  userId: string,
  algorithm: BacktestAlgorithm,
): Promise<{
  id: string;
  strategyId: string | null;
  userId: string | null;
  initialCash: unknown;
  currentCash: unknown;
  totalValue: unknown;
  updatedAt: Date | string;
}> {
  if (!db) {
    throw new Error("Live trading requires DATABASE_URL");
  }

  const strategyId = await ensureLiveStrategy(algorithm);

  const rows = await db
    .select({
      id: portfolios.id,
      strategyId: portfolios.strategyId,
      userId: portfolios.userId,
      initialCash: portfolios.initialCash,
      currentCash: portfolios.currentCash,
      totalValue: portfolios.totalValue,
      updatedAt: portfolios.updatedAt,
    })
    .from(portfolios)
    .where(
      and(
        eq(portfolios.type, "live"),
        eq(portfolios.userId, userId),
        eq(portfolios.strategyId, strategyId),
      ),
    )
    .orderBy(desc(portfolios.createdAt))
    .limit(1);
  if (rows.length > 0) {
    return rows[0];
  }

  const inserted = await db
    .insert(portfolios)
    .values({
      strategyId,
      userId,
      name: `${algorithm.toUpperCase()} Live Paper`,
      type: "live",
      initialCash: toMoney(LIVE_DEFAULTS.initialCash, 2),
      currentCash: toMoney(LIVE_DEFAULTS.initialCash, 2),
      totalValue: toMoney(LIVE_DEFAULTS.initialCash, 2),
    })
    .returning({
      id: portfolios.id,
      strategyId: portfolios.strategyId,
      userId: portfolios.userId,
      initialCash: portfolios.initialCash,
      currentCash: portfolios.currentCash,
      totalValue: portfolios.totalValue,
      updatedAt: portfolios.updatedAt,
    });
  return inserted[0];
}

async function loadLatestPrices(tickers: string[]): Promise<Map<string, number>> {
  const uniq = Array.from(
    new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean)),
  );
  if (uniq.length === 0) {
    return new Map();
  }
  const endDate = new Date();
  const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const series = await loadHistoricalPrices(uniq, startDate, endDate);
  const map = new Map<string, number>();
  Array.from(series.entries()).forEach(([ticker, points]) => {
    const last = points[points.length - 1];
    if (last && Number.isFinite(last.close)) {
      map.set(ticker, last.close);
    }
  });
  return map;
}

async function writeTodaySettlementTx(
  tx: DbTx,
  portfolioId: string,
  initialCash: number,
  totalValue: number,
  cash: number,
  holdingsValue: number,
): Promise<{ dailyReturn: number | null; cumulativeReturn: number | null }> {
  const today = toDateKey(new Date());
  const previous = await tx
    .select({ totalValue: dailySettlements.totalValue })
    .from(dailySettlements)
    .where(
      and(
        eq(dailySettlements.portfolioId, portfolioId),
        lt(dailySettlements.settlementDate, today),
      ),
    )
    .orderBy(desc(dailySettlements.settlementDate))
    .limit(1);

  const prevTotal = previous.length > 0 ? parseNumber(previous[0].totalValue, 0) : null;
  const dailyReturn =
    prevTotal !== null && prevTotal > 0 ? totalValue / prevTotal - 1 : null;
  const cumulativeReturn = initialCash > 0 ? totalValue / initialCash - 1 : null;

  await tx
    .delete(dailySettlements)
    .where(
      and(
        eq(dailySettlements.portfolioId, portfolioId),
        eq(dailySettlements.settlementDate, today),
      ),
    );

  await tx.insert(dailySettlements).values({
    portfolioId,
    settlementDate: today,
    totalValue: toMoney(totalValue, 2),
    cash: toMoney(cash, 2),
    holdingsValue: toMoney(holdingsValue, 2),
    dailyReturn: dailyReturn === null ? null : toMoney(dailyReturn, 6),
    cumulativeReturn: cumulativeReturn === null ? null : toMoney(cumulativeReturn, 6),
  });

  return {
    dailyReturn,
    cumulativeReturn,
  };
}

async function buildSnapshot(
  userId: string,
  algorithm: BacktestAlgorithm,
  portfolioId: string,
): Promise<LivePortfolioSnapshot> {
  if (!db) {
    throw new Error("Live trading requires DATABASE_URL");
  }

  const [portfolioRows, holdingRows, tradeRows, settlementRows] = await Promise.all([
    db
      .select({
        initialCash: portfolios.initialCash,
        currentCash: portfolios.currentCash,
        totalValue: portfolios.totalValue,
        updatedAt: portfolios.updatedAt,
      })
      .from(portfolios)
      .where(eq(portfolios.id, portfolioId))
      .limit(1),
    db
      .select({
        ticker: holdings.ticker,
        quantity: holdings.quantity,
        avgCost: holdings.avgCost,
        currentPrice: holdings.currentPrice,
        marketValue: holdings.marketValue,
        unrealizedPnl: holdings.unrealizedPnl,
      })
      .from(holdings)
      .where(eq(holdings.portfolioId, portfolioId))
      .orderBy(desc(holdings.marketValue)),
    db
      .select({
        id: trades.id,
        ticker: trades.ticker,
        side: trades.tradeType,
        quantity: trades.quantity,
        price: trades.price,
        totalAmount: trades.totalAmount,
        commission: trades.commission,
        executedAt: trades.executedAt,
      })
      .from(trades)
      .where(eq(trades.portfolioId, portfolioId))
      .orderBy(desc(trades.executedAt))
      .limit(20),
    db
      .select({
        dailyReturn: dailySettlements.dailyReturn,
        cumulativeReturn: dailySettlements.cumulativeReturn,
      })
      .from(dailySettlements)
      .where(eq(dailySettlements.portfolioId, portfolioId))
      .orderBy(desc(dailySettlements.settlementDate))
      .limit(1),
  ]);

  const portfolio = portfolioRows[0];
  const holdingsView: LiveHoldingView[] = holdingRows.map((row) => ({
    ticker: row.ticker,
    quantity: parseNumber(row.quantity),
    avgCost: parseNumber(row.avgCost),
    currentPrice: row.currentPrice === null ? null : parseNumber(row.currentPrice),
    marketValue: row.marketValue === null ? null : parseNumber(row.marketValue),
    unrealizedPnl: row.unrealizedPnl === null ? null : parseNumber(row.unrealizedPnl),
  }));
  const recentTrades: LiveTradeView[] = tradeRows.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    side: row.side === "BUY" ? "BUY" : "SELL",
    quantity: parseNumber(row.quantity),
    price: parseNumber(row.price),
    totalAmount: parseNumber(row.totalAmount),
    commission: parseNumber(row.commission),
    executedAt: toIso(row.executedAt),
  }));

  const holdingsValue = holdingsView.reduce(
    (sum, row) => sum + (row.marketValue ?? 0),
    0,
  );

  return {
    portfolioId,
    userId,
    algorithm,
    updatedAt: toIso(portfolio.updatedAt),
    initialCash: parseNumber(portfolio.initialCash),
    cash: parseNumber(portfolio.currentCash),
    holdingsValue,
    totalValue: parseNumber(portfolio.totalValue),
    dailyReturn:
      settlementRows.length > 0
        ? (settlementRows[0].dailyReturn === null
            ? null
            : parseNumber(settlementRows[0].dailyReturn))
        : null,
    cumulativeReturn:
      settlementRows.length > 0
        ? (settlementRows[0].cumulativeReturn === null
            ? null
            : parseNumber(settlementRows[0].cumulativeReturn))
        : null,
    holdings: holdingsView,
    recentTrades,
  };
}

async function settleOneLivePortfolio(
  portfolioId: string,
  initialCash: number,
  cash: number,
): Promise<boolean> {
  if (!db) return false;

  const holdingRows = await db
    .select({
      ticker: holdings.ticker,
      quantity: holdings.quantity,
      avgCost: holdings.avgCost,
    })
    .from(holdings)
    .where(eq(holdings.portfolioId, portfolioId));

  const tickers = holdingRows.map((row) => row.ticker);
  const prices = await loadLatestPrices(tickers);
  const positionMap = new Map<string, LivePositionState>();
  holdingRows.forEach((row) => {
    positionMap.set(row.ticker, {
      quantity: parseNumber(row.quantity),
      avgCost: parseNumber(row.avgCost),
    });
  });

  const { holdingsValue, totalValue } = calcPortfolioTotals(cash, positionMap, prices);

  await db.transaction(async (tx) => {
    await tx.update(portfolios).set({
      totalValue: toMoney(totalValue, 2),
      updatedAt: new Date(),
    }).where(eq(portfolios.id, portfolioId));

    await tx.delete(holdings).where(eq(holdings.portfolioId, portfolioId));
    if (holdingRows.length > 0) {
      await tx.insert(holdings).values(
        holdingRows.map((row) => {
          const qty = parseNumber(row.quantity);
          const avgCost = parseNumber(row.avgCost);
          const price = prices.get(row.ticker) ?? null;
          const marketValue = price === null ? null : qty * price;
          const unrealized = price === null ? null : (price - avgCost) * qty;
          return {
            portfolioId,
            ticker: row.ticker,
            quantity: toMoney(qty, 4),
            avgCost: toMoney(avgCost, 4),
            currentPrice: price === null ? null : toMoney(price, 4),
            marketValue: marketValue === null ? null : toMoney(marketValue, 2),
            unrealizedPnl: unrealized === null ? null : toMoney(unrealized, 2),
          };
        }),
      );
    }

    await writeTodaySettlementTx(
      tx,
      portfolioId,
      initialCash,
      totalValue,
      cash,
      holdingsValue,
    );
  });

  return true;
}

export function normalizeLiveTradingAlgorithm(input: unknown): BacktestAlgorithm {
  return normalizeAlgorithm(input);
}

export async function getLivePortfolioSnapshot(
  userId: string,
  algorithmInput: unknown,
): Promise<LivePortfolioSnapshot> {
  if (!isDatabaseEnabled || !db) {
    throw new Error("Live trading requires PostgreSQL (DATABASE_URL).");
  }
  const algorithm = normalizeAlgorithm(algorithmInput);
  await ensureUserExists(userId);
  const portfolio = await ensureLivePortfolio(userId, algorithm);
  return buildSnapshot(userId, algorithm, portfolio.id);
}

export async function runLiveTradingCycle(
  userId: string,
  algorithmInput: unknown,
): Promise<LiveTradingRunResult> {
  if (!isDatabaseEnabled || !db) {
    throw new Error("Live trading requires PostgreSQL (DATABASE_URL).");
  }
  const algorithm = normalizeAlgorithm(algorithmInput);
  await ensureUserExists(userId);
  const portfolio = await ensureLivePortfolio(userId, algorithm);

  const [signalSnapshot, holdingRows] = await Promise.all([
    loadSignalSnapshot(algorithm),
    db
      .select({
        ticker: holdings.ticker,
        quantity: holdings.quantity,
        avgCost: holdings.avgCost,
      })
      .from(holdings)
      .where(eq(holdings.portfolioId, portfolio.id)),
  ]);

  const currentCash = parseNumber(portfolio.currentCash);
  const initialCash = parseNumber(portfolio.initialCash);
  const positions = new Map<string, LivePositionState>();
  holdingRows.forEach((row) => {
    positions.set(row.ticker, {
      quantity: parseNumber(row.quantity),
      avgCost: parseNumber(row.avgCost),
    });
  });

  const targetWeights = buildTargetWeights(signalSnapshot.entries);
  const universe = new Set<string>([
    ...Array.from(positions.keys()),
    ...Array.from(targetWeights.keys()),
  ]);
  const priceMap = await loadLatestPrices(Array.from(universe));

  let cash = currentCash;
  const baseValue = calcPortfolioTotals(cash, positions, priceMap).totalValue;
  const desiredShares = new Map<string, number>();

  Array.from(universe).forEach((ticker) => {
    const price = priceMap.get(ticker);
    const currentQty = positions.get(ticker)?.quantity ?? 0;
    if (!price || price <= 0) {
      desiredShares.set(ticker, currentQty);
      return;
    }
    const weight = targetWeights.get(ticker) ?? 0;
    const targetNotional = baseValue * weight;
    desiredShares.set(ticker, Math.max(0, Math.floor(targetNotional / price)));
  });

  const now = new Date();
  const tradeRows: Array<{
    portfolioId: string;
    ticker: string;
    tradeType: "BUY" | "SELL";
    quantity: string;
    price: string;
    totalAmount: string;
    commission: string;
    slippage: string;
    signalSource: string;
    executedAt: Date;
    notes: string | null;
  }> = [];

  Array.from(universe).forEach((ticker) => {
    const currentQty = positions.get(ticker)?.quantity ?? 0;
    const targetQty = desiredShares.get(ticker) ?? 0;
    if (targetQty >= currentQty) return;
    const price = priceMap.get(ticker);
    if (!price || price <= 0) return;

    const sellQty = currentQty - targetQty;
    const fillPrice = price * getSlippageMultiplier("SELL");
    const notional = sellQty * fillPrice;
    const commission = calcCommission(notional);
    const slippage = sellQty * Math.max(0, price - fillPrice);
    cash += notional - commission;

    if (targetQty <= 0) {
      positions.delete(ticker);
    } else {
      const prev = positions.get(ticker);
      if (prev) {
        positions.set(ticker, { quantity: targetQty, avgCost: prev.avgCost });
      }
    }

    tradeRows.push({
      portfolioId: portfolio.id,
      ticker,
      tradeType: "SELL",
      quantity: toMoney(sellQty, 4),
      price: toMoney(fillPrice, 4),
      totalAmount: toMoney(notional, 2),
      commission: toMoney(commission, 2),
      slippage: toMoney(slippage, 2),
      signalSource: algorithm,
      executedAt: now,
      notes: null,
    });
  });

  Array.from(universe).forEach((ticker) => {
    const currentQty = positions.get(ticker)?.quantity ?? 0;
    const targetQty = desiredShares.get(ticker) ?? 0;
    if (targetQty <= currentQty) return;
    const price = priceMap.get(ticker);
    if (!price || price <= 0) return;

    const requestQty = targetQty - currentQty;
    const fillPrice = price * getSlippageMultiplier("BUY");
    const affordable = maxAffordableShares(cash, fillPrice);
    const buyQty = Math.min(requestQty, affordable);
    if (buyQty <= 0) return;

    const notional = buyQty * fillPrice;
    const commission = calcCommission(notional);
    const slippage = buyQty * Math.max(0, fillPrice - price);
    cash -= notional + commission;

    const prev = positions.get(ticker);
    const prevQty = prev?.quantity ?? 0;
    const prevAvg = prev?.avgCost ?? 0;
    const totalQty = prevQty + buyQty;
    const avgCost =
      totalQty > 0 ? (prevQty * prevAvg + buyQty * fillPrice) / totalQty : 0;
    positions.set(ticker, { quantity: totalQty, avgCost });

    tradeRows.push({
      portfolioId: portfolio.id,
      ticker,
      tradeType: "BUY",
      quantity: toMoney(buyQty, 4),
      price: toMoney(fillPrice, 4),
      totalAmount: toMoney(notional, 2),
      commission: toMoney(commission, 2),
      slippage: toMoney(slippage, 2),
      signalSource: algorithm,
      executedAt: now,
      notes: null,
    });
  });

  const { holdingsValue, totalValue } = calcPortfolioTotals(cash, positions, priceMap);

  await db.transaction(async (tx) => {
    if (tradeRows.length > 0) {
      await tx.insert(trades).values(tradeRows);
    }

    await tx.delete(holdings).where(eq(holdings.portfolioId, portfolio.id));
    if (positions.size > 0) {
      await tx.insert(holdings).values(
        Array.from(positions.entries()).map(([ticker, pos]) => {
          const price = priceMap.get(ticker) ?? null;
          const marketValue = price === null ? null : pos.quantity * price;
          const unrealized =
            price === null ? null : (price - pos.avgCost) * pos.quantity;
          return {
            portfolioId: portfolio.id,
            ticker,
            quantity: toMoney(pos.quantity, 4),
            avgCost: toMoney(pos.avgCost, 4),
            currentPrice: price === null ? null : toMoney(price, 4),
            marketValue: marketValue === null ? null : toMoney(marketValue, 2),
            unrealizedPnl: unrealized === null ? null : toMoney(unrealized, 2),
          };
        }),
      );
    }

    await tx
      .update(portfolios)
      .set({
        currentCash: toMoney(cash, 2),
        totalValue: toMoney(totalValue, 2),
        updatedAt: now,
      })
      .where(eq(portfolios.id, portfolio.id));

    await writeTodaySettlementTx(
      tx,
      portfolio.id,
      initialCash,
      totalValue,
      cash,
      holdingsValue,
    );
  });

  const snapshot = await buildSnapshot(userId, algorithm, portfolio.id);
  return {
    executedAt: now.toISOString(),
    tradeCount: tradeRows.length,
    portfolio: snapshot,
  };
}

export async function runLiveSettlementOnce(): Promise<LiveSettlementRunResult> {
  if (!isDatabaseEnabled || !db) {
    throw new Error("Live settlement requires PostgreSQL (DATABASE_URL).");
  }

  const livePortfolios = await db
    .select({
      id: portfolios.id,
      initialCash: portfolios.initialCash,
      currentCash: portfolios.currentCash,
    })
    .from(portfolios)
    .where(eq(portfolios.type, "live"));

  let settled = 0;
  for (const row of livePortfolios) {
    try {
      const ok = await settleOneLivePortfolio(
        row.id,
        parseNumber(row.initialCash),
        parseNumber(row.currentCash),
      );
      if (ok) settled += 1;
    } catch (error) {
      console.error("[LiveSettlement] Failed for portfolio", row.id, error);
    }
  }

  return {
    runAt: new Date().toISOString(),
    processedPortfolios: livePortfolios.length,
    settledPortfolios: settled,
  };
}

export function startLiveSettlementScheduler(): void {
  if (schedulerTimer) {
    return;
  }
  if (process.env.LIVE_SETTLEMENT_SCHEDULER === "false") {
    return;
  }
  if (!isDatabaseEnabled) {
    return;
  }

  const intervalMs = Math.max(
    60_000,
    Number(process.env.LIVE_SETTLEMENT_INTERVAL_MS ?? 15 * 60 * 1000),
  );

  const runOnceIfNeeded = async () => {
    if (schedulerBusy) return;

    const today = toDateKey(new Date());
    if (schedulerLastSettlementDate === today) {
      return;
    }

    schedulerBusy = true;
    try {
      const result = await runLiveSettlementOnce();
      schedulerLastSettlementDate = today;
      console.log(
        `[LiveSettlement] runAt=${result.runAt} processed=${result.processedPortfolios} settled=${result.settledPortfolios}`,
      );
    } catch (error) {
      console.error("[LiveSettlement] Scheduler run failed:", error);
    } finally {
      schedulerBusy = false;
    }
  };

  void runOnceIfNeeded();
  schedulerTimer = setInterval(() => {
    void runOnceIfNeeded();
  }, intervalMs);
}

export function stopLiveSettlementScheduler(): void {
  if (!schedulerTimer) return;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
}
