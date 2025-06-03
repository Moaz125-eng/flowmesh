import type { NodeId, StepSnapshot } from "@flowmesh/shared";
import { evaluateCondition } from "../workflows/conditions.js";
import { validateDag } from "../workflows/dag.js";
import { logger } from "../utils/logger.js";
import { buildConditionScope, type ExecutionContext } from "./context.js";
import { CancelledError, runWithRetry } from "./retry.js";

export interface NodeExecutor {
  run(opts: {
    nodeId: NodeId;
    type: string;
    config: Record<string, unknown>;
    context: ExecutionContext;
  }): Promise<unknown>;
}

export interface RunnerResult {
  status: "succeeded" | "failed" | "cancelled";
  steps: StepSnapshot[];
  output: unknown;
  error?: { message: string; stack?: string };
}

export async function runWorkflow(
  ctx: ExecutionContext,
  executor: NodeExecutor,
): Promise<RunnerResult> {
  const dag = validateDag(ctx.workflow.nodes, ctx.workflow.edges);
  const completed = new Set<NodeId>();
  const skipped = new Set<NodeId>();
  let lastOutput: unknown = undefined;

  for (const nodeId of dag.order) {
    if (ctx.signal.aborted) {
      return finalize(ctx, "cancelled", lastOutput, {
        message: "execution cancelled",
      });
    }

    const incoming = dag.incoming.get(nodeId) ?? [];
    if (incoming.length > 0) {
      const allSkipped = incoming.every((e) => skipped.has(e.from));
      if (allSkipped) {
        recordSkip(ctx, nodeId);
        skipped.add(nodeId);
        continue;
      }
      const scope = buildConditionScope(ctx);
      const anyEdgeOpen = incoming.some(
        (e) => completed.has(e.from) && evaluateCondition(e.when, scope),
      );
      if (!anyEdgeOpen) {
        recordSkip(ctx, nodeId);
        skipped.add(nodeId);
        continue;
      }
    }

    const node = dag.nodes.get(nodeId)!;
    const startedAt = Date.now();
    const snap: StepSnapshot = {
      nodeId,
      status: "running",
      attempts: 0,
      startedAt: new Date(startedAt).toISOString(),
    };
    ctx.steps.set(nodeId, snap);

    try {
      const result = await runWithRetry({
        policy: node.retry,
        signal: ctx.signal,
        timeoutMs: node.timeoutMs,
        fn: async (attempt) => {
          ctx.steps.set(nodeId, { ...snap, attempts: attempt });
          return executor.run({
            nodeId,
            type: node.type,
            config: node.config,
            context: ctx,
          });
        },
        onAttemptError: (err, attempt, nextDelayMs) => {
          logger.warn(
            { err, nodeId, attempt, nextDelayMs, executionId: ctx.executionId },
            "step attempt failed, retrying",
          );
        },
      });
      const finishedAt = Date.now();
      ctx.outputs.set(nodeId, result.value);
      lastOutput = result.value;
      ctx.steps.set(nodeId, {
        ...snap,
        status: "succeeded",
        attempts: result.attempts,
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        output: result.value,
      });
      completed.add(nodeId);
    } catch (err) {
      const error = toErrorPayload(err);
      const cancelled = err instanceof CancelledError;
      const status = cancelled ? "cancelled" : "failed";
      const finishedAt = Date.now();
      logger.warn(
        { err, nodeId, executionId: ctx.executionId, status },
        "step terminated",
      );
      const prev = ctx.steps.get(nodeId)!;
      ctx.steps.set(nodeId, {
        ...prev,
        status,
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        error,
      });
      return finalize(
        ctx,
        cancelled ? "cancelled" : "failed",
        lastOutput,
        error,
      );
    }
  }

  return finalize(ctx, "succeeded", lastOutput);
}

function recordSkip(ctx: ExecutionContext, nodeId: NodeId): void {
  const now = new Date().toISOString();
  ctx.steps.set(nodeId, {
    nodeId,
    status: "skipped",
    attempts: 0,
    startedAt: now,
    finishedAt: now,
    durationMs: 0,
  });
}

function finalize(
  ctx: ExecutionContext,
  status: "succeeded" | "failed" | "cancelled",
  output: unknown,
  error?: { message: string; stack?: string },
): RunnerResult {
  return {
    status,
    output,
    error,
    steps: [...ctx.steps.values()],
  };
}

export function toErrorPayload(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}
