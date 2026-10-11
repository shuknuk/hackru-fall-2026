import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import tigerCloudCa from "../src/lib/db/tiger-cloud-ca.json" with { type: "json" };

const value = process.env.DATABASE_URL;
if (!value) throw new Error("DATABASE_URL is required");
const url = new URL(value);
if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_URL must be a PostgreSQL URL");
const database = decodeURIComponent(url.pathname.slice(1));
if (!process.argv.includes("--verify") && process.env.MIGRATION_CONFIRM_DB !== database)
  throw new Error(`Set MIGRATION_CONFIRM_DB=${database} to confirm the intended migration target`);
url.searchParams.delete("sslmode");
const pool = new Pool({ connectionString: url.toString(), ssl: { ca: tigerCloudCa.certificate, rejectUnauthorized: true }, max: 1, connectionTimeoutMillis: 5000, query_timeout: 15000 });
const client = await pool.connect();
try {
  const extension = await client.query("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'");
  const version = extension.rows[0]?.extversion;
  if (!version) throw new Error("TimescaleDB is not enabled on the target database");
  const [major, minor] = version.split(".").map(Number);
  if (major < 2 || (major === 2 && minor < 13)) throw new Error(`TimescaleDB ${version} is too old for the by_range migration syntax`);
  if (process.argv.includes("--verify")) {
    const result = await client.query(`SELECT
      EXISTS (SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'workout_metrics') AS hypertable,
      EXISTS (SELECT 1 FROM timescaledb_information.continuous_aggregates WHERE view_name = 'daily_workout_stats') AS continuous_aggregate`);
    console.log(JSON.stringify({ database, timescaleVersion: version, ...result.rows[0] }));
  } else {
    const sql = await readFile(new URL("../migrations/001_clerk_tiger_workouts.sql", import.meta.url), "utf8");
    await client.query("BEGIN");
    try { await client.query(sql); await client.query("COMMIT"); }
    catch (error) { await client.query("ROLLBACK"); throw error; }
    console.log(`Applied Tiger Data migration to ${database} with TimescaleDB ${version}`);
  }
} finally {
  client.release();
  await pool.end();
}
