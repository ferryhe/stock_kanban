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
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  type BacktestConfig,
  type BacktestDailyPoint,
  type BacktestSummary,
  type BacktestTrade,
} from "./backtest";

// User role enum
export const userRoleEnum = pgEnum("user_role", ["user", "analyst", "admin", "superadmin"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  username: text("username").notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  emailVerificationExpiry: timestamp("email_verification_expiry", { withTimezone: true }),
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpiry: timestamp("password_reset_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  displayName: varchar("display_name", { length: 100 }),
  email: varchar("email", { length: 255 }).unique(),
  riskTolerance: varchar("risk_tolerance", { length: 20 }).default("moderate").notNull(), // conservative | moderate | aggressive
  notificationsTradeAlerts: boolean("notifications_trade_alerts").default(true).notNull(),
  notificationsDailyReport: boolean("notifications_daily_report").default(false).notNull(),
  notificationsWeeklyReport: boolean("notifications_weekly_report").default(false).notNull(),
  theme: varchar("theme", { length: 10 }).default("light").notNull(), // light | dark
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_user_profiles_user_id").on(table.userId),
}));

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// API Keys for programmatic access
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // friendly name for the key
  keyHash: text("key_hash").notNull(), // hashed API key (never store plaintext)
  scope: jsonb("scope").$type<{
    portfolios?: string[]; // specific portfolio IDs or "*" for all
    permissions?: string[]; // read, write, admin
  }>().default(sql`'{}'::jsonb`).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_api_keys_user").on(table.userId),
  activeIdx: index("idx_api_keys_active").on(table.isActive),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// Portfolio visibility enum
export const portfolioVisibilityEnum = pgEnum("portfolio_visibility", ["private", "shared", "public"]);

// Portfolio permissions for sharing
export const portfolioPermissionEnum = pgEnum("portfolio_permission", ["view", "trade", "admin"]);

export const portfolioPermissions = pgTable("portfolio_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: portfolioPermissionEnum("permission").notNull(),
  grantedBy: varchar("granted_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniquePortfolioUser: uniqueIndex("uidx_portfolio_permissions_portfolio_user").on(
    table.portfolioId,
    table.userId,
  ),
  portfolioIdx: index("idx_portfolio_permissions_portfolio").on(table.portfolioId),
  userIdx: index("idx_portfolio_permissions_user").on(table.userId),
}));

export type PortfolioPermission = typeof portfolioPermissions.$inferSelect;
export type InsertPortfolioPermission = typeof portfolioPermissions.$inferInsert;

export const backtestResults = pgTable("backtest_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
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
  visibility: portfolioVisibilityEnum("visibility").default("private").notNull(),
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
  visibilityIdx: index("idx_portfolios_visibility").on(table.visibility),
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

// User rankings for leaderboard
export const userRankings = pgTable("user_rankings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  rankingDate: date("ranking_date").notNull(),
  totalReturn: numeric("total_return", { precision: 10, scale: 6 }),
  annualizedReturn: numeric("annualized_return", { precision: 10, scale: 6 }),
  sharpeRatio: numeric("sharpe_ratio", { precision: 10, scale: 6 }),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }),
  rank: integer("rank"),
  percentile: numeric("percentile", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniquePortfolioDate: uniqueIndex("uidx_user_rankings_portfolio_date").on(
    table.portfolioId,
    table.rankingDate,
  ),
  userDateIdx: index("idx_user_rankings_user_date").on(table.userId, table.rankingDate),
  dateRankIdx: index("idx_user_rankings_date_rank").on(table.rankingDate, table.rank),
}));

export type UserRanking = typeof userRankings.$inferSelect;
export type InsertUserRanking = typeof userRankings.$inferInsert;

// Audit log for security and compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // login, logout, create_portfolio, trade, etc.
  resourceType: varchar("resource_type", { length: 50 }), // portfolio, trade, user, etc.
  resourceId: varchar("resource_id", { length: 255 }), // ID of affected resource
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_audit_logs_user").on(table.userId),
  actionIdx: index("idx_audit_logs_action").on(table.action),
  dateIdx: index("idx_audit_logs_date").on(table.createdAt),
  resourceIdx: index("idx_audit_logs_resource").on(table.resourceType, table.resourceId),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Backend/System logs for admin monitoring
export const backendLogs = pgTable("backend_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()::text`),
  level: varchar("level", { length: 20 }).notNull(), // info, warn, error, debug
  category: varchar("category", { length: 50 }).notNull(), // system, database, api, auth, etc.
  message: text("message").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  userId: varchar("user_id").references(() => users.id), // Optional: if log is related to a user
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  levelIdx: index("idx_backend_logs_level").on(table.level),
  categoryIdx: index("idx_backend_logs_category").on(table.category),
  dateIdx: index("idx_backend_logs_date").on(table.createdAt),
}));

export type BackendLog = typeof backendLogs.$inferSelect;
export type InsertBackendLog = typeof backendLogs.$inferInsert;
