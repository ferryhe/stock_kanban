export type BacktestAlgorithm = "us" | "cn" | "hk";

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
