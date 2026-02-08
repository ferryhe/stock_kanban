import { randomUUID } from "crypto";
import {
  type BacktestAlgorithm,
  type BacktestConfig,
  type BacktestExecutionParams,
  type BacktestOptions,
  type BacktestPositionParams,
  type BacktestResult,
  type RebalanceFrequency,
} from "../../shared/backtest";
import { runBacktestEngine } from "./engine";
import { loadHistoricalPrices } from "./priceProvider";
import { getAvailableBacktestAlgorithms, loadSignalSnapshot } from "./signalProvider";
import {
  getBacktestPersistenceSummaryByResultId,
  getBacktestResultFromDb,
  type BacktestPersistenceSummary,
  saveBacktestResultToDb,
} from "./repository";

const MAX_RESULT_CACHE = 100;

const resultStore = new Map<string, BacktestResult>();

const DEFAULT_POSITION_PARAMS: BacktestPositionParams = {
  maxPositionPerStock: 0.1,
  maxTotalPositions: 10,
  minCashReserve: 0.1,
};

const DEFAULT_EXECUTION_PARAMS: BacktestExecutionParams = {
  commissionBps: 5,
  slippageBps: 5,
  minCommission: 1,
};

const DEFAULT_OPTIONS: BacktestOptions = {
  rebalanceFrequency: "weekly",
  benchmark: "SPY",
};

function assertFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

function assertRatio(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1`);
  }
}

function parseDateString(value: string, name: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${name} must be a valid date (YYYY-MM-DD)`);
  }
  return value;
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

function normalizeRebalanceFrequency(value: unknown): RebalanceFrequency {
  if (value === "daily" || value === "weekly" || value === "monthly") {
    return value;
  }
  return DEFAULT_OPTIONS.rebalanceFrequency;
}

export function getBacktestAlgorithms(): BacktestAlgorithm[] {
  return getAvailableBacktestAlgorithms();
}

export function normalizeBacktestConfig(input: unknown): BacktestConfig {
  const body = (input ?? {}) as Partial<BacktestConfig> & {
    algorithm?: unknown;
    options?: Partial<BacktestOptions>;
    positionParams?: Partial<BacktestPositionParams>;
    executionParams?: Partial<BacktestExecutionParams>;
  };

  const algorithm = normalizeAlgorithm(body.algorithm);
  const startDate = parseDateString(
    body.startDate ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    "startDate",
  );
  const endDate = parseDateString(
    body.endDate ?? new Date().toISOString().slice(0, 10),
    "endDate",
  );

  if (startDate > endDate) {
    throw new Error("startDate must be <= endDate");
  }

  const initialCash = Number(body.initialCash ?? 100000);
  assertFinitePositive(initialCash, "initialCash");

  const positionParams: BacktestPositionParams = {
    maxPositionPerStock: Number(
      body.positionParams?.maxPositionPerStock ?? DEFAULT_POSITION_PARAMS.maxPositionPerStock,
    ),
    maxTotalPositions: Math.max(
      1,
      Math.floor(
        Number(body.positionParams?.maxTotalPositions ?? DEFAULT_POSITION_PARAMS.maxTotalPositions),
      ),
    ),
    minCashReserve: Number(
      body.positionParams?.minCashReserve ?? DEFAULT_POSITION_PARAMS.minCashReserve,
    ),
  };
  assertRatio(positionParams.maxPositionPerStock, "positionParams.maxPositionPerStock");
  assertRatio(positionParams.minCashReserve, "positionParams.minCashReserve");

  const executionParams: BacktestExecutionParams = {
    commissionBps: Number(
      body.executionParams?.commissionBps ?? DEFAULT_EXECUTION_PARAMS.commissionBps,
    ),
    slippageBps: Number(body.executionParams?.slippageBps ?? DEFAULT_EXECUTION_PARAMS.slippageBps),
    minCommission: Number(
      body.executionParams?.minCommission ?? DEFAULT_EXECUTION_PARAMS.minCommission,
    ),
  };
  if (!Number.isFinite(executionParams.commissionBps) || executionParams.commissionBps < 0) {
    throw new Error("executionParams.commissionBps must be >= 0");
  }
  if (!Number.isFinite(executionParams.slippageBps) || executionParams.slippageBps < 0) {
    throw new Error("executionParams.slippageBps must be >= 0");
  }
  assertFinitePositive(executionParams.minCommission, "executionParams.minCommission");

  const options: BacktestOptions = {
    benchmark:
      typeof body.options?.benchmark === "string" && body.options.benchmark.trim().length > 0
        ? body.options.benchmark.toUpperCase()
        : DEFAULT_OPTIONS.benchmark,
    rebalanceFrequency: normalizeRebalanceFrequency(body.options?.rebalanceFrequency),
  };

  return {
    algorithm,
    startDate,
    endDate,
    initialCash,
    positionParams,
    executionParams,
    options,
  };
}

function putResult(result: BacktestResult): void {
  resultStore.set(result.id, result);

  if (resultStore.size > MAX_RESULT_CACHE) {
    const firstKey = resultStore.keys().next().value;
    if (firstKey) {
      resultStore.delete(firstKey);
    }
  }
}

function getCoreTickers(resultConfig: BacktestConfig, snapshotEntries: { ticker: string; signal: string }[]): string[] {
  const buys = snapshotEntries
    .filter((entry) => entry.signal === "BUY")
    .slice(0, resultConfig.positionParams.maxTotalPositions)
    .map((entry) => entry.ticker);

  if (buys.length > 0) return buys;
  return snapshotEntries.slice(0, resultConfig.positionParams.maxTotalPositions).map((entry) => entry.ticker);
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const snapshot = await loadSignalSnapshot(config.algorithm);
  const tickers = getCoreTickers(config, snapshot.entries);

  if (tickers.length === 0) {
    throw new Error("No tradable tickers found in signal snapshot.");
  }

  const startDate = new Date(`${config.startDate}T00:00:00Z`);
  const endDate = new Date(`${config.endDate}T23:59:59Z`);

  const prices = await loadHistoricalPrices(tickers, startDate, endDate);
  if (prices.size === 0) {
    throw new Error("Failed to load historical prices for selected algorithm.");
  }

  const result = runBacktestEngine({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    config,
    signalSnapshot: snapshot,
    priceSeries: prices,
  });

  putResult(result);
  try {
    await saveBacktestResultToDb(result);
  } catch (error) {
    console.error("[Backtest] Failed to persist result to PostgreSQL:", error);
  }
  return result;
}

export async function getBacktestResult(id: string): Promise<BacktestResult | null> {
  const cached = resultStore.get(id);
  if (cached) {
    return cached;
  }

  const fromDb = await getBacktestResultFromDb(id);
  if (fromDb) {
    putResult(fromDb);
  }
  return fromDb;
}

export async function getBacktestPersistenceSummary(
  id: string,
): Promise<BacktestPersistenceSummary | null> {
  const dbSummary = await getBacktestPersistenceSummaryByResultId(id);
  if (dbSummary) {
    return dbSummary;
  }

  const cached = resultStore.get(id);
  if (!cached) {
    return null;
  }

  return {
    backtestResultId: id,
    strategyId: null,
    portfolioId: null,
    portfolioType: "backtest",
    backtestStatus: "completed",
    tradeCount: cached.trades.length,
    settlementCount: cached.equityCurve.length,
    holdingCount: 0,
    performanceCount: 1,
  };
}

export async function runBacktestCompare(
  algorithms: BacktestAlgorithm[],
  baseConfig: Omit<BacktestConfig, "algorithm">,
): Promise<BacktestResult[]> {
  const uniqueAlgorithms = Array.from(new Set(algorithms));
  const results: BacktestResult[] = [];

  for (const algorithm of uniqueAlgorithms) {
    const config: BacktestConfig = {
      ...baseConfig,
      algorithm,
    };

    const result = await runBacktest(config);
    results.push(result);
  }

  return results;
}
