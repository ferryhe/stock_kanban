import {
  type BacktestConfig,
  type BacktestDailyPoint,
  type BacktestResult,
  type BacktestSummary,
  type BacktestTrade,
} from "../../shared/backtest";
import { type PriceSeriesMap } from "./priceProvider";
import { type SignalSnapshot } from "./signalProvider";

type PositionState = {
  shares: number;
  avgCost: number;
};

export interface BacktestEngineInput {
  id: string;
  createdAt: string;
  config: BacktestConfig;
  signalSnapshot: SignalSnapshot;
  priceSeries: PriceSeriesMap;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, cur) => acc + cur, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance = values.reduce((acc, cur) => acc + (cur - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getIsoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const days = Math.floor((d.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.floor((days + yearStart.getUTCDay()) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function shouldRebalance(
  dateKey: string,
  prevRebalanceDate: string | null,
  frequency: BacktestConfig["options"]["rebalanceFrequency"],
): boolean {
  if (!prevRebalanceDate) return true;
  if (frequency === "daily") return true;

  if (frequency === "weekly") {
    return getWeekKey(dateKey) !== getWeekKey(prevRebalanceDate);
  }

  const monthNow = dateKey.slice(0, 7);
  const monthPrev = prevRebalanceDate.slice(0, 7);
  return monthNow !== monthPrev;
}

function calculateCommission(notional: number, config: BacktestConfig): number {
  if (notional <= 0) return 0;
  const percentage = notional * (config.executionParams.commissionBps / 10000);
  return Math.max(config.executionParams.minCommission, percentage);
}

function getSlippageMultiplier(side: "BUY" | "SELL", config: BacktestConfig): number {
  const slip = config.executionParams.slippageBps / 10000;
  return side === "BUY" ? 1 + slip : 1 - slip;
}

function buildTargetWeights(config: BacktestConfig, snapshot: SignalSnapshot): Map<string, number> {
  const investable = Math.max(0, 1 - config.positionParams.minCashReserve);
  if (investable <= 0) return new Map();

  const candidates = snapshot.entries
    .filter((entry) => entry.signal === "BUY")
    .sort((a, b) => {
      const ar = a.predictedReturn ?? Number.NEGATIVE_INFINITY;
      const br = b.predictedReturn ?? Number.NEGATIVE_INFINITY;
      return br - ar;
    })
    .slice(0, config.positionParams.maxTotalPositions);

  if (candidates.length === 0) return new Map();

  const equalWeight = investable / candidates.length;
  const maxWeight = Math.max(0, config.positionParams.maxPositionPerStock);
  const finalWeight = Math.max(0, Math.min(equalWeight, maxWeight));

  const weights = new Map<string, number>();
  candidates.forEach((entry) => {
    weights.set(entry.ticker, finalWeight);
  });

  return weights;
}

function calculatePortfolioValue(
  cash: number,
  positions: Map<string, PositionState>,
  prices: Map<string, number>,
): { holdingsValue: number; totalValue: number } {
  let holdingsValue = 0;
  Array.from(positions.entries()).forEach(([ticker, position]) => {
    const price = prices.get(ticker);
    if (price === undefined || !Number.isFinite(price)) return;
    holdingsValue += position.shares * price;
  });

  return {
    holdingsValue,
    totalValue: cash + holdingsValue,
  };
}

function maxAffordableShares(cash: number, fillPrice: number, config: BacktestConfig): number {
  if (cash <= 0 || fillPrice <= 0 || !Number.isFinite(fillPrice)) return 0;

  let low = 0;
  let high = Math.floor(cash / fillPrice);

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const notional = mid * fillPrice;
    const commission = calculateCommission(notional, config);
    if (notional + commission <= cash) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

function collectTradingDates(priceSeries: PriceSeriesMap, startDate: Date, endDate: Date): string[] {
  const start = getIsoDateKey(startDate);
  const end = getIsoDateKey(endDate);
  const dateSet = new Set<string>();

  Array.from(priceSeries.values()).forEach((series) => {
    series.forEach((point) => {
      if (point.date >= start && point.date <= end) {
        dateSet.add(point.date);
      }
    });
  });

  return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
}

function buildDailyPriceLookup(priceSeries: PriceSeriesMap): Map<string, Map<string, number>> {
  const lookup = new Map<string, Map<string, number>>();
  Array.from(priceSeries.entries()).forEach(([ticker, series]) => {
    lookup.set(
      ticker,
      new Map<string, number>(series.map((point) => [point.date, point.close])),
    );
  });
  return lookup;
}

export function runBacktestEngine(input: BacktestEngineInput): BacktestResult {
  const { id, createdAt, config, signalSnapshot, priceSeries } = input;
  const tradingDates = collectTradingDates(
    priceSeries,
    new Date(`${config.startDate}T00:00:00Z`),
    new Date(`${config.endDate}T00:00:00Z`),
  );

  if (tradingDates.length < 2) {
    throw new Error("Not enough trading days available for selected period.");
  }

  const targetWeights = buildTargetWeights(config, signalSnapshot);
  const universe = new Set<string>([
    ...signalSnapshot.entries.map((entry) => entry.ticker),
    ...Array.from(targetWeights.keys()),
  ]);

  const priceLookup = buildDailyPriceLookup(priceSeries);
  const lastKnownPrice = new Map<string, number>();

  const positions = new Map<string, PositionState>();
  const trades: BacktestTrade[] = [];
  const equityCurve: BacktestDailyPoint[] = [];

  let cash = config.initialCash;
  let previousTotalValue = config.initialCash;
  let peakValue = config.initialCash;
  let rebalanceAnchor: string | null = null;

  let closedTrades = 0;
  let winningTrades = 0;

  for (const date of tradingDates) {
    const dayPrices = new Map<string, number>();

    Array.from(universe).forEach((ticker) => {
      const p = priceLookup.get(ticker)?.get(date);
      if (p !== undefined) {
        lastKnownPrice.set(ticker, p);
      }

      const resolved = lastKnownPrice.get(ticker);
      if (resolved !== undefined) {
        dayPrices.set(ticker, resolved);
      }
    });

    if (dayPrices.size === 0) {
      continue;
    }

    const doRebalance = shouldRebalance(
      date,
      rebalanceAnchor,
      config.options.rebalanceFrequency,
    );

    if (doRebalance) {
      const baseValue = calculatePortfolioValue(cash, positions, dayPrices).totalValue;

      const desiredShares = new Map<string, number>();
      const rebalanceUniverse = new Set<string>([
        ...Array.from(positions.keys()),
        ...Array.from(targetWeights.keys()),
      ]);

      Array.from(rebalanceUniverse).forEach((ticker) => {
        const px = dayPrices.get(ticker);
        if (!px || px <= 0) {
          desiredShares.set(ticker, positions.get(ticker)?.shares ?? 0);
          return;
        }

        const targetWeight = targetWeights.get(ticker) ?? 0;
        const targetNotional = baseValue * targetWeight;
        const shares = targetWeight > 0 ? Math.floor(targetNotional / px) : 0;
        desiredShares.set(ticker, Math.max(0, shares));
      });

      // Sell pass first to free up cash before buy pass.
      Array.from(rebalanceUniverse).forEach((ticker) => {
        const currentPosition = positions.get(ticker);
        const currentShares = currentPosition?.shares ?? 0;
        const target = desiredShares.get(ticker) ?? 0;

        if (target >= currentShares) return;

        const price = dayPrices.get(ticker);
        if (!price || price <= 0) return;

        const sellShares = currentShares - target;
        const fillPrice = price * getSlippageMultiplier("SELL", config);
        const notional = sellShares * fillPrice;
        const commission = calculateCommission(notional, config);
        const slippage = sellShares * Math.max(0, price - fillPrice);

        cash += notional - commission;

        const avgCost = currentPosition?.avgCost ?? 0;
        const realizedPnL = (fillPrice - avgCost) * sellShares - commission;
        closedTrades += 1;
        if (realizedPnL > 0) {
          winningTrades += 1;
        }

        if (target > 0) {
          positions.set(ticker, { shares: target, avgCost });
        } else {
          positions.delete(ticker);
        }

        trades.push({
          date,
          ticker,
          side: "SELL",
          shares: sellShares,
          price: fillPrice,
          notional,
          commission,
          slippage,
        });
      });

      // Buy pass.
      Array.from(rebalanceUniverse).forEach((ticker) => {
        const currentPosition = positions.get(ticker);
        const currentShares = currentPosition?.shares ?? 0;
        const target = desiredShares.get(ticker) ?? 0;

        if (target <= currentShares) return;

        const price = dayPrices.get(ticker);
        if (!price || price <= 0) return;

        const requestedShares = target - currentShares;
        const fillPrice = price * getSlippageMultiplier("BUY", config);
        const affordableShares = maxAffordableShares(cash, fillPrice, config);
        const buyShares = Math.min(requestedShares, affordableShares);

        if (buyShares <= 0) return;

        const notional = buyShares * fillPrice;
        const commission = calculateCommission(notional, config);
        const slippage = buyShares * Math.max(0, fillPrice - price);
        cash -= notional + commission;

        const oldShares = currentPosition?.shares ?? 0;
        const oldAvgCost = currentPosition?.avgCost ?? 0;
        const totalShares = oldShares + buyShares;
        const nextAvgCost =
          totalShares > 0
            ? (oldShares * oldAvgCost + buyShares * fillPrice) / totalShares
            : 0;

        positions.set(ticker, { shares: totalShares, avgCost: nextAvgCost });

        trades.push({
          date,
          ticker,
          side: "BUY",
          shares: buyShares,
          price: fillPrice,
          notional,
          commission,
          slippage,
        });
      });

      rebalanceAnchor = date;
    }

    const { holdingsValue, totalValue } = calculatePortfolioValue(cash, positions, dayPrices);
    const dailyReturn = previousTotalValue > 0 ? totalValue / previousTotalValue - 1 : 0;
    peakValue = Math.max(peakValue, totalValue);
    const drawdown = peakValue > 0 ? totalValue / peakValue - 1 : 0;

    equityCurve.push({
      date,
      cash,
      holdingsValue,
      totalValue,
      dailyReturn,
      drawdown,
    });

    previousTotalValue = totalValue;
  }

  if (equityCurve.length < 2) {
    throw new Error("Backtest failed to generate sufficient equity points.");
  }

  const dailyReturns = equityCurve.slice(1).map((point) => point.dailyReturn);
  const dailyMean = mean(dailyReturns);
  const dailyStd = stdDev(dailyReturns);

  const finalValue = equityCurve[equityCurve.length - 1].totalValue;
  const totalReturn = config.initialCash > 0 ? finalValue / config.initialCash - 1 : 0;
  const annualizedReturn =
    equityCurve.length > 1
      ? Math.pow(finalValue / config.initialCash, 252 / (equityCurve.length - 1)) - 1
      : 0;
  const volatility = dailyStd * Math.sqrt(252);
  const sharpeRatio = dailyStd > 0 ? (dailyMean / dailyStd) * Math.sqrt(252) : 0;
  const maxDrawdown = equityCurve.reduce(
    (min, point) => Math.min(min, point.drawdown),
    0,
  );
  const winRate = closedTrades > 0 ? winningTrades / closedTrades : 0;

  const summary: BacktestSummary = {
    algorithm: config.algorithm,
    startDate: config.startDate,
    endDate: config.endDate,
    initialCash: config.initialCash,
    finalValue,
    totalReturn,
    annualizedReturn,
    volatility,
    sharpeRatio,
    maxDrawdown,
    totalTrades: trades.length,
    winRate,
  };

  return {
    id,
    createdAt,
    config,
    summary,
    equityCurve,
    trades,
    metadata: {
      signalSourceFile: signalSnapshot.sourceFile,
      signalGeneratedAtUtc: signalSnapshot.generatedAtUtc,
      signalDataDate: signalSnapshot.dataDate,
      configFile: signalSnapshot.configFile,
    },
  };
}
