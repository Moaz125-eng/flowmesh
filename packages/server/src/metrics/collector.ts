import type { WorkflowMetrics } from "@flowmesh/shared";
import { query } from "../db/client.js";

export async function collectMetrics(): Promise<WorkflowMetrics> {
  const totals = await query<{
    total: string;
    enabled: string;
  }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN enabled THEN 1 ELSE 0 END) AS enabled
       FROM workflows`,
  );

  const exec = await query<{
    total: string;
    succeeded: string;
    failed: string;
    avg_ms: string | null;
  }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) AS succeeded,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
            AVG(duration_ms)::float AS avg_ms
       FROM executions`,
  );

  const recent = await query<{ count: string }>(
    `SELECT COUNT(*) AS count
       FROM executions
      WHERE finished_at > NOW() - INTERVAL '1 minute'`,
  );

  const totalExecutions = Number(exec.rows[0]?.total ?? 0);
  const failedExecutions = Number(exec.rows[0]?.failed ?? 0);

  return {
    totalWorkflows: Number(totals.rows[0]?.total ?? 0),
    enabledWorkflows: Number(totals.rows[0]?.enabled ?? 0),
    totalExecutions,
    succeededExecutions: Number(exec.rows[0]?.succeeded ?? 0),
    failedExecutions,
    averageDurationMs: Math.round(Number(exec.rows[0]?.avg_ms ?? 0)),
    failureRate:
      totalExecutions === 0 ? 0 : failedExecutions / totalExecutions,
    workerThroughputPerMin: Number(recent.rows[0]?.count ?? 0),
  };
}

export function renderPrometheus(metrics: WorkflowMetrics): string {
  const lines: string[] = [];
  const add = (name: string, help: string, value: number) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  };
  add("flowmesh_workflows_total", "Total workflows", metrics.totalWorkflows);
  add(
    "flowmesh_workflows_enabled",
    "Enabled workflows",
    metrics.enabledWorkflows,
  );
  add(
    "flowmesh_executions_total",
    "Total executions",
    metrics.totalExecutions,
  );
  add(
    "flowmesh_executions_succeeded",
    "Succeeded executions",
    metrics.succeededExecutions,
  );
  add(
    "flowmesh_executions_failed",
    "Failed executions",
    metrics.failedExecutions,
  );
  add(
    "flowmesh_execution_duration_ms_avg",
    "Average execution duration in ms",
    metrics.averageDurationMs,
  );
  add(
    "flowmesh_execution_failure_rate",
    "Failure rate (0..1)",
    metrics.failureRate,
  );
  add(
    "flowmesh_worker_throughput_per_min",
    "Executions finished in the last minute",
    metrics.workerThroughputPerMin,
  );
  return lines.join("\n") + "\n";
}
