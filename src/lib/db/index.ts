import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import tigerCloudCa from "./tiger-cloud-ca.json";

let pool: Pool | null = null;
export function databasePool() {
  if (pool) return pool;
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_URL must be a PostgreSQL URL");
  url.searchParams.delete("sslmode");
  pool = new Pool({
    connectionString: url.toString(),
    ssl: { ca: tigerCloudCa.certificate, rejectUnauthorized: true },
    max: 2,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
    query_timeout: 8_000,
    statement_timeout: 8_000,
    maxLifetimeSeconds: 300,
  });
  attachDatabasePool(pool);
  return pool;
}
