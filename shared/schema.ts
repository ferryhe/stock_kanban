import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
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
