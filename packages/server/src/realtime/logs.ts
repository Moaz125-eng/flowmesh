import type { LogEntry, LogLevel } from "@flowmesh/shared";
import { query } from "../db/client.js";
import { bus } from "./bus.js";

export async function appendLog(entry: {
  executionId: string;
  nodeId?: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}): Promise<LogEntry> {
  const timestamp = new Date().toISOString();
  await query(
    `INSERT INTO execution_logs (execution_id, node_id, level, message, data, timestamp)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      entry.executionId,
      entry.nodeId ?? null,
      entry.level,
      entry.message,
      entry.data ? JSON.stringify(entry.data) : null,
      timestamp,
    ],
  );
  const full: LogEntry = { ...entry, timestamp };
  bus.emitEvent({ type: "log", entry: full });
  return full;
}

export async function listLogs(
  executionId: string,
  limit = 500,
): Promise<LogEntry[]> {
  const result = await query<{
    execution_id: string;
    node_id: string | null;
    level: LogLevel;
    message: string;
    data: Record<string, unknown> | null;
    timestamp: Date;
  }>(
    `SELECT execution_id, node_id, level, message, data, timestamp
       FROM execution_logs
      WHERE execution_id = $1
      ORDER BY id ASC
      LIMIT $2`,
    [executionId, Math.min(limit, 5000)],
  );
  return result.rows.map((r) => ({
    executionId: r.execution_id,
    nodeId: r.node_id ?? undefined,
    level: r.level,
    message: r.message,
    data: r.data ?? undefined,
    timestamp: r.timestamp.toISOString(),
  }));
}
