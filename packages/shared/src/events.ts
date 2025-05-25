import type {
  ExecutionId,
  ExecutionStatus,
  LogEntry,
  NodeId,
  StepStatus,
} from "./types.js";

/**
 * Realtime event envelope sent over the WebSocket gateway.
 *
 * The dashboard subscribes to a per-execution channel and consumes these
 * events to render the live timeline.
 */
export type RealtimeEvent =
  | ExecutionStartedEvent
  | ExecutionFinishedEvent
  | StepStartedEvent
  | StepFinishedEvent
  | LogEvent;

export interface ExecutionStartedEvent {
  type: "execution.started";
  executionId: ExecutionId;
  startedAt: string;
}

export interface ExecutionFinishedEvent {
  type: "execution.finished";
  executionId: ExecutionId;
  status: ExecutionStatus;
  finishedAt: string;
  durationMs: number;
}

export interface StepStartedEvent {
  type: "step.started";
  executionId: ExecutionId;
  nodeId: NodeId;
  startedAt: string;
  attempt: number;
}

export interface StepFinishedEvent {
  type: "step.finished";
  executionId: ExecutionId;
  nodeId: NodeId;
  status: StepStatus;
  finishedAt: string;
  durationMs: number;
  attempts: number;
}

export interface LogEvent {
  type: "log";
  entry: LogEntry;
}
