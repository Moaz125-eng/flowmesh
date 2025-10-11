import { NotFoundError, ValidationError } from "../utils/errors.js";
import { getWorkflowOrFail } from "../workflows/repository.js";
import { enqueueExecution } from "./queue.js";
import { getDlqEntry, removeDlqEntry } from "./dlq.js";

export async function retryDlqEntry(id: number): Promise<{
  jobId: string;
  dlqId: number;
  workflowId: string;
}> {
  const entry = await getDlqEntry(id);
  if (!entry) throw new NotFoundError("dlq entry", String(id));
  if (!entry.workflowId) {
    throw new ValidationError("dlq entry has no workflow id");
  }

  const workflow = await getWorkflowOrFail(entry.workflowId);
  if (!workflow.enabled) {
    throw new ValidationError("workflow is disabled");
  }

  const payload = entry.payload as {
    workflowId?: string;
    triggeredBy?: string;
    input?: Record<string, unknown>;
  };

  const input = {
    ...(payload.input ?? {}),
    dlqRetryOf: entry.id,
    dlqReason: entry.reason,
    retriedAt: new Date().toISOString(),
  };

  const jobId = await enqueueExecution({
    workflowId: workflow.id,
    triggeredBy:
      payload.triggeredBy === "webhook" ||
      payload.triggeredBy === "cron" ||
      payload.triggeredBy === "manual"
        ? payload.triggeredBy
        : "manual",
    input,
    priority: 2,
  });

  await removeDlqEntry(entry.id);

  return { jobId, dlqId: entry.id, workflowId: workflow.id };
}
