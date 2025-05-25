/**
 * Shared types for FlowMesh workflows, executions and plugins.
 *
 * These are the wire-level structures used between the server, the worker and
 * the dashboard. They intentionally avoid runtime dependencies so they can be
 * imported from anywhere.
 */

export type WorkflowId = string;
export type ExecutionId = string;
export type NodeId = string;

export type TriggerType = "webhook" | "cron" | "manual";

export interface WebhookTriggerConfig {
  type: "webhook";
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  signingSecret?: string;
}

export interface CronTriggerConfig {
  type: "cron";
  expression: string;
  timezone?: string;
}

export interface ManualTriggerConfig {
  type: "manual";
}

export type TriggerConfig =
  | WebhookTriggerConfig
  | CronTriggerConfig
  | ManualTriggerConfig;

export interface RetryPolicy {
  maxAttempts: number;
  backoff: "exponential" | "fixed";
  initialDelayMs: number;
  maxDelayMs?: number;
}

export interface WorkflowNode {
  id: NodeId;
  type: string;
  config: Record<string, unknown>;
  retry?: RetryPolicy;
  timeoutMs?: number;
}

export interface WorkflowEdge {
  from: NodeId;
  to: NodeId;
  /** Optional condition expression; defaults to always-true. */
  when?: string;
}

export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  description?: string;
  trigger: TriggerConfig;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type StepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled";

export interface StepSnapshot {
  nodeId: NodeId;
  status: StepStatus;
  attempts: number;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  error?: { message: string; stack?: string };
  output?: unknown;
}

export interface ExecutionSummary {
  id: ExecutionId;
  workflowId: WorkflowId;
  workflowName: string;
  status: ExecutionStatus;
  triggeredBy: TriggerType;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface ExecutionDetail extends ExecutionSummary {
  input: Record<string, unknown>;
  output?: unknown;
  error?: { message: string; stack?: string };
  steps: StepSnapshot[];
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  executionId: ExecutionId;
  nodeId?: NodeId;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/* --- metrics ------------------------------------------------------------- */

export interface WorkflowMetrics {
  totalWorkflows: number;
  enabledWorkflows: number;
  totalExecutions: number;
  succeededExecutions: number;
  failedExecutions: number;
  averageDurationMs: number;
  failureRate: number;
  workerThroughputPerMin: number;
}
