import { pool } from "../db/client.js";
import { getRedisConnection } from "../queue/connection.js";

export interface CheckResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: CheckResult;
    redis: CheckResult;
  };
}

const startedAt = Date.now();

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const redis = getRedisConnection();
    await redis.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getHealth(): Promise<HealthStatus> {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const allOk = database.ok && redis.ok;
  return {
    status: allOk ? "ok" : "degraded",
    service: "flowmesh",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    checks: { database, redis },
  };
}
