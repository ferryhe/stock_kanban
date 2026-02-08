import { type BacktestAlgorithm } from "./backtest";

export interface LiveTradingRunRequest {
  algorithm: BacktestAlgorithm;
}

export interface LiveHoldingView {
  ticker: string;
  quantity: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
}

export interface LiveTradeView {
  id: string;
  ticker: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  totalAmount: number;
  commission: number;
  executedAt: string;
}

export interface LivePortfolioSnapshot {
  portfolioId: string;
  userId: string;
  algorithm: BacktestAlgorithm;
  updatedAt: string;
  initialCash: number;
  cash: number;
  holdingsValue: number;
  totalValue: number;
  dailyReturn: number | null;
  cumulativeReturn: number | null;
  holdings: LiveHoldingView[];
  recentTrades: LiveTradeView[];
}

export interface LiveTradingRunResult {
  executedAt: string;
  tradeCount: number;
  portfolio: LivePortfolioSnapshot;
}

export interface LiveSettlementRunResult {
  runAt: string;
  processedPortfolios: number;
  settledPortfolios: number;
}
