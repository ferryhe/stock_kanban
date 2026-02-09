import { randomUUID } from "crypto";
import {
  type BacktestAlgorithm,
  type BacktestConfig,
  type BacktestHistoryItem,
  type BacktestHistoryQuery,
  type BacktestHistoryResponse,
  type BacktestStatus,
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
  listBacktestHistoryFromDb,
  type BacktestPersistenceSummary,
  saveBacktestResultToDb,
} from "./repository";

const MAX_RESULT_CACHE = 100;
const resultStore = new Map<string, BacktestResult>();
const resultStrategyAccountStore = new Map<string, string>();

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

export interface BacktestRequestContext {
  strategyAccountId?: string;
}

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

function normalizeStatus(value: unknown): BacktestStatus | undefined {
  if (
    value === "pending" ||
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  throw new Error("status must be one of pending|running|completed|failed|cancelled");
}

function normalizePositiveInt(
  value: unknown,
  fieldName: string,
  defaultValue: number,
  max: number,
): number {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return Math.min(max, Math.floor(n));
}

export function normalizeStrategyAccountId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const accountId = value.trim();
  if (accountId.length === 0) {
    return undefined;
  }
  if (accountId.length > 64) {
    throw new Error("strategyAccountId must be <= 64 characters");
  }
  return accountId;
}

function normalizeOptionalDate(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${name} must be a valid date (YYYY-MM-DD)`);
  }
  return parseDateString(value, name);
}

export function getBacktestAlgorithms(): BacktestAlgorithm[] {
  return getAvailableBacktestAlgorithms();
}

export function normalizeBacktestHistoryQuery(input: unknown): BacktestHistoryQuery {
  const query = (input ?? {}) as Record<string, unknown>;
  const algorithm =
    typeof query.algorithm === "string" && query.algorithm.length > 0
      ? normalizeAlgorithm(query.algorithm)
      : undefined;
  const status = normalizeStatus(query.status);

  const runDateFrom = normalizeOptionalDate(query.runDateFrom, "runDateFrom");
  const runDateTo = normalizeOptionalDate(query.runDateTo, "runDateTo");
  if (runDateFrom && runDateTo && runDateFrom > runDateTo) {
    throw new Error("runDateFrom must be <= runDateTo");
  }

  const page = normalizePositiveInt(query.page, "page", 1, 1_000_000);
  const pageSize = normalizePositiveInt(
    query.pageSize ?? query.limit,
    "pageSize",
    20,
    200,
  );

  return {
    algorithm,
    status,
    runDateFrom,
    runDateTo,
    page,
    pageSize,
    limit: undefined,
  };
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

function putResult(result: BacktestResult, strategyAccountId?: string): void {
  resultStore.set(result.id, result);
  if (strategyAccountId) {
    resultStrategyAccountStore.set(result.id, strategyAccountId);
  }

  if (resultStore.size > MAX_RESULT_CACHE) {
    const firstKey = resultStore.keys().next().value;
    if (firstKey) {
      resultStore.delete(firstKey);
      resultStrategyAccountStore.delete(firstKey);
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

export async function runBacktest(
  config: BacktestConfig,
  context?: BacktestRequestContext,
): Promise<BacktestResult> {
  // NOTE: Current implementation uses a single signal snapshot for the entire backtest period.
  // The design docs describe a historical signal data interface (daily signals over date range),
  // but this Phase 1 MVP uses snapshot-only approach for simplicity.
  // TODO Phase 2: Implement historical signal loading per trading day for more realistic backtests.
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

  putResult(result, context?.strategyAccountId);
  try {
    await saveBacktestResultToDb(result, context?.strategyAccountId);
  } catch (error) {
    console.error("[Backtest] Failed to persist result to PostgreSQL:", error);
  }
  return result;
}

export async function getBacktestResult(
  id: string,
  context?: BacktestRequestContext,
): Promise<BacktestResult | null> {
  const cached = resultStore.get(id);
  if (cached) {
    if (context?.strategyAccountId) {
      const owner = resultStrategyAccountStore.get(id);
      if (owner && owner !== context.strategyAccountId) {
        return null;
      }
      if (!owner) {
        // Owner unknown in cache, verify against DB using caller identity.
        const fromDb = await getBacktestResultFromDb(id, context.strategyAccountId);
        if (!fromDb) {
          return null;
        }
        putResult(fromDb, context.strategyAccountId);
        return fromDb;
      }
    }
    return cached;
  }

  const fromDb = await getBacktestResultFromDb(id, context?.strategyAccountId);
  if (fromDb) {
    putResult(fromDb, context?.strategyAccountId);
  }
  return fromDb;
}

function toHistoryItem(result: BacktestResult, strategyAccountId?: string): BacktestHistoryItem {
  return {
    backtestResultId: result.id,
    portfolioId: result.id,
    strategyId: null,
    userId: strategyAccountId ?? null,
    algorithm: result.summary.algorithm,
    status: "completed",
    runAt: result.createdAt,
    startDate: result.config.startDate,
    endDate: result.config.endDate,
    initialCash: result.config.initialCash,
    finalValue: result.summary.finalValue,
    totalReturn: result.summary.totalReturn,
    annualizedReturn: result.summary.annualizedReturn,
    sharpeRatio: result.summary.sharpeRatio,
    maxDrawdown: result.summary.maxDrawdown,
    totalTrades: result.summary.totalTrades,
  };
}

export async function getBacktestHistory(
  query: BacktestHistoryQuery,
  context?: BacktestRequestContext,
): Promise<BacktestHistoryResponse> {
  const dbItems = await listBacktestHistoryFromDb(query, context?.strategyAccountId);
  if (dbItems) {
    return dbItems;
  }

  const fromMs = query.runDateFrom
    ? new Date(`${query.runDateFrom}T00:00:00.000Z`).getTime()
    : null;
  const toMs = query.runDateTo
    ? new Date(`${query.runDateTo}T23:59:59.999Z`).getTime()
    : null;
  const pageSize = Math.max(1, Math.min(200, query.pageSize ?? query.limit ?? 20));
  const page = Math.max(1, query.page ?? 1);
  const start = (page - 1) * pageSize;
  const status = query.status;

  const allItems = Array.from(resultStore.values())
    .filter((result) => (query.algorithm ? result.config.algorithm === query.algorithm : true))
    .filter((result) => (status ? "completed" === status : true))
    .filter((result) => {
      if (!context?.strategyAccountId) return true;
      const owner = resultStrategyAccountStore.get(result.id);
      // Require exact match: only show results owned by this user
      return owner === context.strategyAccountId;
    })
    .filter((result) => {
      const runMs = new Date(result.createdAt).getTime();
      if (fromMs !== null && runMs < fromMs) return false;
      if (toMs !== null && runMs > toMs) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((result) => toHistoryItem(result, resultStrategyAccountStore.get(result.id)));

  const items = allItems.slice(start, start + pageSize);
  const total = allItems.length;

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getBacktestPersistenceSummary(
  id: string,
  context?: BacktestRequestContext,
): Promise<BacktestPersistenceSummary | null> {
  const dbSummary = await getBacktestPersistenceSummaryByResultId(id, context?.strategyAccountId);
  if (dbSummary) {
    return dbSummary;
  }

  const cached = resultStore.get(id);
  if (!cached) {
    return null;
  }
  if (context?.strategyAccountId) {
    const owner = resultStrategyAccountStore.get(id);
    if (!owner || owner !== context.strategyAccountId) {
      return null;
    }
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
  context?: BacktestRequestContext,
): Promise<BacktestResult[]> {
  const uniqueAlgorithms = Array.from(new Set(algorithms));
  const results: BacktestResult[] = [];

  for (const algorithm of uniqueAlgorithms) {
    const config: BacktestConfig = {
      ...baseConfig,
      algorithm,
    };

    const result = await runBacktest(config, context);
    results.push(result);
  }

  return results;
}
