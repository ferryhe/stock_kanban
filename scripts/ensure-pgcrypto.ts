import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("[db:prepare] DATABASE_URL not set, skip pgcrypto setup.");
  process.exit(0);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl:
    process.env.PGSSL === "true" || process.env.PGSSL === "1"
      ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED === "true" }
      : undefined,
});

try {
  await client.connect();
  await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
  console.log("[db:prepare] pgcrypto extension is ready.");
} catch (error) {
  console.error("[db:prepare] failed to ensure pgcrypto extension:", error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {
    // ignore close errors
  });
}
