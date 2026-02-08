import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  date,
  timestamp,
  numeric,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  type BacktestConfig,
  type BacktestDailyPoint,
  type BacktestSummary,
  type BacktestTrade,
} from "./backtest";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const backtestResults = pgTable("backtest_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  algorithm: varchar("algorithm", { length: 16 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  initialCash: numeric("initial_cash", { precision: 18, scale: 2 }).notNull(),
  config: jsonb("config").$type<BacktestConfig>().notNull(),
  summary: jsonb("summary").$type<BacktestSummary>().notNull(),
  equityCurve: jsonb("equity_curve").$type<BacktestDailyPoint[]>().notNull(),
  trades: jsonb("trades").$type<BacktestTrade[]>().notNull(),
  metadata: jsonb("metadata")
    .$type<{
      signalSourceFile: string;
      signalGeneratedAtUtc?: string;
      signalDataDate?: string;
      configFile?: string;
    }>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type BacktestResultRow = typeof backtestResults.$inferSelect;

export const strategies = pgTable("strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: varchar("name", { length: 100 }).notNull(),
  algorithmId: varchar("algorithm_id", { length: 50 }).notNull(),
  description: text("description"),
  parameters: jsonb("parameters").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => ({
  algoIdx: index("idx_strategies_algorithm_id").on(table.algorithmId),
}));

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  strategyId: varchar("strategy_id").references(() => strategies.id),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // backtest | live
  initialCash: numeric("initial_cash", { precision: 15, scale: 2 }).notNull(),
  currentCash: numeric("current_cash", { precision: 15, scale: 2 }).notNull(),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }).notNull(),
  backtestStartDate: date("backtest_start_date"),
  backtestEndDate: date("backtest_end_date"),
  backtestStatus: varchar("backtest_status", { length: 20 }),
  sourceBacktestResultId: varchar("source_backtest_result_id").references(() => backtestResults.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_portfolios_user").on(table.userId),
  typeIdx: index("idx_portfolios_type").on(table.type),
  sourceBacktestIdx: index("idx_portfolios_source_backtest").on(table.sourceBacktestResultId),
}));

export const holdings = pgTable("holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  portfolioId: varchar("portfolio_id")
    .notNull()
    .references(() => portfolios.id),
  ticker: varchar("ticker", { length: 20 }).notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  avgCost: numeric("avg_cost", { precision: 15, scale: 4 }).notNull(),
  currentPrice: numeric("current_price", { precision: 15, scale: 4 }),
  marketValue: numeric("market_value", { precision: 15, scale: 2 }),
  unrealizedPnl: numeric("unrealized_pnl", { precision: 15, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  portfolioIdx: index("idx_holdings_portfolio").on(table.portfolioId),
  uniquePortfolioTicker: uniqueIndex("uidx_holdings_portfolio_ticker").on(table.portfolioId, table.ticker),
}));

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  portfolioId: varchar("portfolio_id")
    .notNull()
    .references(() => portfolios.id),
  ticker: varchar("ticker", { length: 20 }).notNull(),
  tradeType: varchar("trade_type", { length: 10 }).notNull(), // BUY | SELL
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  price: numeric("price", { precision: 15, scale: 4 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  commission: numeric("commission", { precision: 10, scale: 2 }).default("0").notNull(),
  slippage: numeric("slippage", { precision: 10, scale: 2 }).default("0").notNull(),
  signalSource: varchar("signal_source", { length: 50 }),
  executedAt: timestamp("executed_at", { withTimezone: true }).defaultNow().notNull(),
  notes: text("notes"),
}, (table) => ({
  portfolioDateIdx: index("idx_trades_portfolio_date").on(table.portfolioId, table.executedAt),
}));

export const dailySettlements = pgTable("daily_settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  portfolioId: varchar("portfolio_id")
    .notNull()
    .references(() => portfolios.id),
  settlementDate: date("settlement_date").notNull(),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }).notNull(),
  cash: numeric("cash", { precision: 15, scale: 2 }).notNull(),
  holdingsValue: numeric("holdings_value", { precision: 15, scale: 2 }).notNull(),
  dailyReturn: numeric("daily_return", { precision: 10, scale: 6 }),
  cumulativeReturn: numeric("cumulative_return", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniquePortfolioDate: uniqueIndex("uidx_settlements_portfolio_date").on(
    table.portfolioId,
    table.settlementDate,
  ),
  portfolioDateIdx: index("idx_settlements_portfolio_date").on(table.portfolioId, table.settlementDate),
}));

export const strategyPerformance = pgTable("strategy_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  portfolioId: varchar("portfolio_id")
    .notNull()
    .references(() => portfolios.id),
  calculationDate: date("calculation_date").notNull(),
  totalReturn: numeric("total_return", { precision: 10, scale: 6 }),
  annualizedReturn: numeric("annualized_return", { precision: 10, scale: 6 }),
  volatility: numeric("volatility", { precision: 10, scale: 6 }),
  maxDrawdown: numeric("max_drawdown", { precision: 10, scale: 6 }),
  sharpeRatio: numeric("sharpe_ratio", { precision: 10, scale: 6 }),
  sortinoRatio: numeric("sortino_ratio", { precision: 10, scale: 6 }),
  calmarRatio: numeric("calmar_ratio", { precision: 10, scale: 6 }),
  winRate: numeric("win_rate", { precision: 10, scale: 6 }),
  totalTrades: integer("total_trades"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniquePortfolioDate: uniqueIndex("uidx_strategy_performance_portfolio_date").on(
    table.portfolioId,
    table.calculationDate,
  ),
}));
