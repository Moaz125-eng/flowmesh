import type {
  ExecutionDetail,
  ExecutionStatus,
  ExecutionSummary,
  StepSnapshot,
  TriggerType,
} from "@flowmesh/shared";
import { query } from "../db/client.js";
import { NotFoundError } from "../utils/errors.js";

interface ExecutionRow {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  triggered_by: TriggerType;
  input: Record<string, unknown>;
  output: unknown;
  error: { message: string; stack?: string } | null;
  steps: StepSnapshot[];
  started_at: Date;
  finished_at: Date | null;
  duration_ms: number | null;
}

interface SummaryRow extends ExecutionRow {
  workflow_name: string;
}

function rowToDetail(row: SummaryRow): ExecutionDetail {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    workflowName: row.workflow_name,
    status: row.status,
    triggeredBy: row.triggered_by,
    input: row.input,
    output: row.output ?? undefined,
    error: row.error ?? undefined,
    steps: row.steps,
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at?.toISOString(),
    durationMs: row.duration_ms ?? undefined,
  };
}

function rowToSummary(row: SummaryRow): ExecutionSummary {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    workflowName: row.workflow_name,
    status: row.status,
    triggeredBy: row.triggered_by,
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at?.toISOString(),
    durationMs: row.duration_ms ?? undefined,
  };
}

export async function insertExecution(opts: {
  id: string;
  workflowId: string;
  triggeredBy: TriggerType;
  input: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO executions (id, workflow_id, status, triggered_by, input)
     VALUES ($1, $2, 'pending', $3, $4::jsonb)`,
    [opts.id, opts.workflowId, opts.triggeredBy, JSON.stringify(opts.input)],
  );
}

export async function markExecutionRunning(id: string): Promise<void> {
  await query(
    "UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1",
    [id],
  );
}

export async function finishExecution(opts: {
  id: string;
  status: ExecutionStatus;
  output?: unknown;
  error?: { message: string; stack?: string };
  steps: StepSnapshot[];
  durationMs: number;
}): Promise<void> {
  await query(
    `UPDATE executions
       SET status = $2,
           output = $3::jsonb,
           error = $4::jsonb,
           steps = $5::jsonb,
           finished_at = NOW(),
           duration_ms = $6
     WHERE id = $1`,
    [
      opts.id,
      opts.status,
      opts.output === undefined ? null : JSON.stringify(opts.output),
      opts.error ? JSON.stringify(opts.error) : null,
      JSON.stringify(opts.steps),
      opts.durationMs,
    ],
  );
}

export async function updateExecutionSteps(
  id: string,
  steps: StepSnapshot[],
): Promise<void> {
  await query(
    "UPDATE executions SET steps = $2::jsonb WHERE id = $1",
    [id, JSON.stringify(steps)],
  );
}

export async function getExecution(id: string): Promise<ExecutionDetail> {
  const result = await query<SummaryRow>(
    `SELECT e.*, w.name AS workflow_name
       FROM executions e
       JOIN workflows w ON w.id = e.workflow_id
      WHERE e.id = $1`,
    [id],
  );
  if (result.rows.length === 0) throw new NotFoundError("execution", id);
  return rowToDetail(result.rows[0]);
}

export async function listExecutions(opts: {
  workflowId?: string;
  status?: ExecutionStatus;
  limit?: number;
  offset?: number;
} = {}): Promise<ExecutionSummary[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.workflowId) {
    params.push(opts.workflowId);
    where.push(`e.workflow_id = $${params.length}`);
  }
  if (opts.status) {
    params.push(opts.status);
    where.push(`e.status = $${params.length}`);
  }
  params.push(limit);
  params.push(offset);
  const result = await query<SummaryRow>(
    `SELECT e.*, w.name AS workflow_name
       FROM executions e
       JOIN workflows w ON w.id = e.workflow_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY e.started_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(rowToSummary);
}
