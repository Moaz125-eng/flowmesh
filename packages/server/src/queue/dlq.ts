import { query } from "../db/client.js";
import { logger } from "../utils/logger.js";

export interface DlqEntry {
  executionId?: string;
  workflowId?: string;
  nodeId?: string;
  reason: string;
  payload: Record<string, unknown>;
}

export async function pushToDlq(entry: DlqEntry): Promise<void> {
  await query(
    `INSERT INTO dlq_entries (execution_id, workflow_id, node_id, reason, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      entry.executionId ?? null,
      entry.workflowId ?? null,
      entry.nodeId ?? null,
      entry.reason,
      JSON.stringify(entry.payload),
    ],
  );
  logger.warn({ reason: entry.reason, workflowId: entry.workflowId }, "dlq push");
}

export async function listDlq(opts: {
  workflowId?: string;
  limit?: number;
} = {}): Promise<
  Array<{
    id: number;
    executionId: string | null;
    workflowId: string | null;
    nodeId: string | null;
    reason: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>
> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const params: unknown[] = [];
  let where = "";
  if (opts.workflowId) {
    params.push(opts.workflowId);
    where = `WHERE workflow_id = $${params.length}`;
  }
  params.push(limit);
  const result = await query<{
    id: number;
    execution_id: string | null;
    workflow_id: string | null;
    node_id: string | null;
    reason: string;
    payload: Record<string, unknown>;
    created_at: Date;
  }>(
    `SELECT * FROM dlq_entries ${where}
     ORDER BY id DESC LIMIT $${params.length}`,
    params,
  );
  return result.rows.map((r) => ({
    id: r.id,
    executionId: r.execution_id,
    workflowId: r.workflow_id,
    nodeId: r.node_id,
    reason: r.reason,
    payload: r.payload,
    createdAt: r.created_at.toISOString(),
  }));
}
