import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

const databaseUrl = process.env.DATABASE_URL;

let pool: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

if (databaseUrl && databaseUrl.trim().length > 0) {
  pool = new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS ?? 30_000),
    ssl:
      process.env.PGSSL === "true" || process.env.PGSSL === "1"
        ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED === "true" }
        : undefined,
  });

  dbInstance = drizzle(pool, { schema });
  console.log("[DB] PostgreSQL enabled for persistent backtest storage.");
} else {
  console.log("[DB] DATABASE_URL not set. Running with in-memory backtest storage.");
}

export const db = dbInstance;
export const isDatabaseEnabled = dbInstance !== null;

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

