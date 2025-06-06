import { Worker, type Job } from "bullmq";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { getRedisConnection } from "./connection.js";
import { EXECUTION_QUEUE_NAME, type ExecutionJobData } from "./queue.js";
import { pushToDlq } from "./dlq.js";
import { startExecution } from "../execution/engine.js";
import { tryGetWorkflow } from "../workflows/service.js";
import type { NodeExecutor } from "../execution/runner.js";

let workerInstance: Worker<ExecutionJobData> | null = null;

export function startWorker(executor: NodeExecutor): Worker<ExecutionJobData> {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker<ExecutionJobData>(
    EXECUTION_QUEUE_NAME,
    async (job: Job<ExecutionJobData>) => {
      const { workflowId, triggeredBy, input } = job.data;
      const workflow = await tryGetWorkflow(workflowId);
      if (!workflow) {
        await pushToDlq({
          workflowId,
          reason: "workflow_not_found",
          payload: job.data as unknown as Record<string, unknown>,
        });
        throw new Error(`workflow ${workflowId} not found`);
      }
      if (!workflow.enabled) {
        await pushToDlq({
          workflowId,
          reason: "workflow_disabled",
          payload: job.data as unknown as Record<string, unknown>,
        });
        return { skipped: true };
      }
      const executionId = await startExecution({
        workflow,
        triggeredBy,
        input,
        executor,
      });
      return { executionId };
    },
    {
      connection: getRedisConnection(),
      concurrency: config.WORKER_CONCURRENCY,
    },
  );

  workerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id, name: job.name }, "job completed");
  });

  workerInstance.on("failed", async (job, err) => {
    logger.error(
      { jobId: job?.id, err, attemptsMade: job?.attemptsMade },
      "job failed",
    );
    if (job) {
      await pushToDlq({
        workflowId: job.data.workflowId,
        reason: err.message,
        payload: job.data as unknown as Record<string, unknown>,
      });
    }
  });

  return workerInstance;
}

export async function stopWorker(): Promise<void> {
  if (!workerInstance) return;
  await workerInstance.close();
  workerInstance = null;
}
