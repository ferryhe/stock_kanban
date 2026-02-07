import { eq } from "drizzle-orm";
import { db, isDatabaseEnabled } from "../db";
import { backtestResults } from "../../shared/schema";
import { type BacktestResult } from "../../shared/backtest";

function toIso(createdAt: Date | string): string {
  if (createdAt instanceof Date) {
    return createdAt.toISOString();
  }

  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function mapRowToResult(row: typeof backtestResults.$inferSelect): BacktestResult {
  return {
    id: row.id,
    createdAt: toIso(row.createdAt),
    config: row.config,
    summary: row.summary,
    equityCurve: row.equityCurve,
    trades: row.trades,
    metadata: row.metadata,
  };
}

export async function saveBacktestResultToDb(result: BacktestResult): Promise<boolean> {
  if (!isDatabaseEnabled || !db) {
    return false;
  }

  await db.insert(backtestResults).values({
    id: result.id,
    algorithm: result.config.algorithm,
    startDate: result.config.startDate,
    endDate: result.config.endDate,
    initialCash: String(result.config.initialCash),
    config: result.config,
    summary: result.summary,
    equityCurve: result.equityCurve,
    trades: result.trades,
    metadata: result.metadata,
    createdAt: new Date(result.createdAt),
  });

  return true;
}

export async function getBacktestResultFromDb(id: string): Promise<BacktestResult | null> {
  if (!isDatabaseEnabled || !db) {
    return null;
  }

  const rows = await db
    .select()
    .from(backtestResults)
    .where(eq(backtestResults.id, id))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return mapRowToResult(rows[0]);
}
