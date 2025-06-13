import type { TriggerType, WorkflowDefinition } from "@flowmesh/shared";
import { newExecutionId } from "../utils/ids.js";
import { logger } from "../utils/logger.js";
import { createContext } from "./context.js";
import {
  finishExecution,
  insertExecution,
  markExecutionRunning,
  updateExecutionSteps,
} from "./repository.js";
import { runWorkflow, type NodeExecutor } from "./runner.js";
import { bus } from "../realtime/bus.js";

const activeAborts = new Map<string, AbortController>();

export interface StartExecutionOpts {
  workflow: WorkflowDefinition;
  triggeredBy: TriggerType;
  input?: Record<string, unknown>;
  executor: NodeExecutor;
}

export async function startExecution(
  opts: StartExecutionOpts,
): Promise<string> {
  const executionId = newExecutionId();
  await insertExecution({
    id: executionId,
    workflowId: opts.workflow.id,
    triggeredBy: opts.triggeredBy,
    input: opts.input ?? {},
  });
  void runDetached(executionId, opts);
  return executionId;
}

async function runDetached(
  executionId: string,
  opts: StartExecutionOpts,
): Promise<void> {
  const controller = new AbortController();
  activeAborts.set(executionId, controller);
  await markExecutionRunning(executionId);

  const ctx = createContext({
    executionId,
    workflow: opts.workflow,
    triggeredBy: opts.triggeredBy,
    input: opts.input ?? {},
    signal: controller.signal,
  });

  bus.emitEvent({
    type: "execution.started",
    executionId,
    startedAt: new Date(ctx.startedAt).toISOString(),
  });

  try {
    const result = await runWorkflow(ctx, opts.executor);
    const durationMs = Date.now() - ctx.startedAt;
    await finishExecution({
      id: executionId,
      status: result.status,
      output: result.output,
      error: result.error,
      steps: result.steps,
      durationMs,
    });
    bus.emitEvent({
      type: "execution.finished",
      executionId,
      status: result.status,
      finishedAt: new Date().toISOString(),
      durationMs,
    });
    logger.info(
      { executionId, status: result.status, workflowId: opts.workflow.id },
      "execution finished",
    );
  } catch (err) {
    logger.error({ err, executionId }, "execution crashed");
    await finishExecution({
      id: executionId,
      status: "failed",
      error: { message: err instanceof Error ? err.message : String(err) },
      steps: [...ctx.steps.values()],
      durationMs: Date.now() - ctx.startedAt,
    });
  } finally {
    activeAborts.delete(executionId);
  }
}

export function cancelExecution(executionId: string): boolean {
  const ctrl = activeAborts.get(executionId);
  if (!ctrl) return false;
  ctrl.abort();
  return true;
}

export async function persistStepProgress(
  executionId: string,
  steps: import("@flowmesh/shared").StepSnapshot[],
): Promise<void> {
  await updateExecutionSteps(executionId, steps);
}
