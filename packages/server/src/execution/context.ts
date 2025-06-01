import type {
  ExecutionId,
  NodeId,
  StepSnapshot,
  TriggerType,
  WorkflowDefinition,
} from "@flowmesh/shared";

export interface ExecutionContext {
  executionId: ExecutionId;
  workflow: WorkflowDefinition;
  triggeredBy: TriggerType;
  input: Record<string, unknown>;
  outputs: Map<NodeId, unknown>;
  steps: Map<NodeId, StepSnapshot>;
  startedAt: number;
  signal: AbortSignal;
}

export function createContext(opts: {
  executionId: ExecutionId;
  workflow: WorkflowDefinition;
  triggeredBy: TriggerType;
  input: Record<string, unknown>;
  signal: AbortSignal;
}): ExecutionContext {
  return {
    executionId: opts.executionId,
    workflow: opts.workflow,
    triggeredBy: opts.triggeredBy,
    input: opts.input,
    outputs: new Map(),
    steps: new Map(),
    startedAt: Date.now(),
    signal: opts.signal,
  };
}

export function buildConditionScope(
  ctx: ExecutionContext,
  currentNodeId?: NodeId,
): Record<string, unknown> {
  const outputs: Record<string, unknown> = {};
  for (const [id, value] of ctx.outputs) outputs[id] = value;
  return {
    payload: ctx.input,
    input: ctx.input,
    outputs,
    current: currentNodeId ? outputs[currentNodeId] : undefined,
  };
}
