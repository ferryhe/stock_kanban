// Note: Currently uses market identifiers (us/cn/hk) as algorithm names
// TODO: Refactor to support actual algorithm identifiers (algorithm-a/b/c) per market
export type BacktestAlgorithm = "us" | "cn" | "hk";
export type BacktestStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type RebalanceFrequency = "daily" | "weekly" | "monthly";

export interface BacktestPositionParams {
  maxPositionPerStock: number;
  maxTotalPositions: number;
  minCashReserve: number;
}

export interface BacktestExecutionParams {
  commissionBps: number;
  slippageBps: number;
  minCommission: number;
}

export interface BacktestOptions {
  benchmark?: string;
  rebalanceFrequency: RebalanceFrequency;
}

export interface BacktestConfig {
  algorithm: BacktestAlgorithm;
  startDate: string;
  endDate: string;
  initialCash: number;
  positionParams: BacktestPositionParams;
  executionParams: BacktestExecutionParams;
  options: BacktestOptions;
}

export interface BacktestTrade {
  date: string;
  ticker: string;
  side: "BUY" | "SELL";
  shares: number;
  price: number;
  notional: number;
  commission: number;
  slippage: number;
}

export interface BacktestDailyPoint {
  date: string;
  cash: number;
  holdingsValue: number;
  totalValue: number;
  dailyReturn: number;
  drawdown: number;
}

export interface BacktestSummary {
  algorithm: BacktestAlgorithm;
  startDate: string;
  endDate: string;
  initialCash: number;
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  winRate: number;
}

export interface BacktestResult {
  id: string;
  createdAt: string;
  config: BacktestConfig;
  summary: BacktestSummary;
  equityCurve: BacktestDailyPoint[];
  trades: BacktestTrade[];
  metadata: {
    signalSourceFile: string;
    signalGeneratedAtUtc?: string;
    signalDataDate?: string;
    configFile?: string;
  };
}

export interface BacktestHistoryQuery {
  algorithm?: BacktestAlgorithm;
  status?: BacktestStatus;
  runDateFrom?: string;
  runDateTo?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface BacktestHistoryItem {
  backtestResultId: string;
  portfolioId: string;
  strategyId: string | null;
  userId: string | null;
  algorithm: BacktestAlgorithm;
  status: string | null;
  runAt: string;
  startDate: string | null;
  endDate: string | null;
  initialCash: number;
  finalValue: number;
  totalReturn: number | null;
  annualizedReturn: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  totalTrades: number | null;
}

export interface BacktestHistoryResponse {
  items: BacktestHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
