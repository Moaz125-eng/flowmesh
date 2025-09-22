import type { TriggerType } from "@flowmesh/shared";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { getWorkflowOrFail } from "../workflows/repository.js";
import { enqueueExecution } from "../queue/queue.js";
import { getExecution } from "./repository.js";

export async function replayExecution(
  executionId: string,
  opts: { triggeredBy?: TriggerType; priority?: number } = {},
): Promise<{ jobId: string; sourceExecutionId: string; workflowId: string }> {
  const source = await getExecution(executionId);
  if (source.status === "running" || source.status === "pending") {
    throw new ValidationError("cannot replay a running or pending execution");
  }

  const workflow = await getWorkflowOrFail(source.workflowId);
  if (!workflow.enabled) {
    throw new ValidationError("workflow is disabled");
  }

  const input = {
    ...source.input,
    replayOf: source.id,
    replayedAt: new Date().toISOString(),
  };

  const jobId = await enqueueExecution({
    workflowId: workflow.id,
    triggeredBy: opts.triggeredBy ?? "manual",
    input,
    priority: opts.priority,
  });

  return {
    jobId,
    sourceExecutionId: source.id,
    workflowId: workflow.id,
  };
}

export async function replayExecutionOrFail(executionId: string) {
  try {
    return await replayExecution(executionId);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw err;
  }
}
