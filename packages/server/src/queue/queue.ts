import { Queue, QueueEvents } from "bullmq";
import type { TriggerType } from "@flowmesh/shared";
import { getRedisConnection } from "./connection.js";
import { logger } from "../utils/logger.js";

export const EXECUTION_QUEUE_NAME = "flowmesh.executions";

export interface ExecutionJobData {
  workflowId: string;
  triggeredBy: TriggerType;
  input: Record<string, unknown>;
  priority?: number;
}

let queueInstance: Queue<ExecutionJobData> | null = null;
let eventsInstance: QueueEvents | null = null;

export function getExecutionQueue(): Queue<ExecutionJobData> {
  if (queueInstance) return queueInstance;
  queueInstance = new Queue<ExecutionJobData>(EXECUTION_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 1000, age: 24 * 3600 },
      removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
    },
  });
  return queueInstance;
}

export function getExecutionQueueEvents(): QueueEvents {
  if (eventsInstance) return eventsInstance;
  eventsInstance = new QueueEvents(EXECUTION_QUEUE_NAME, {
    connection: getRedisConnection(),
  });
  return eventsInstance;
}

export async function enqueueExecution(opts: {
  workflowId: string;
  triggeredBy: TriggerType;
  input?: Record<string, unknown>;
  priority?: number;
  delayMs?: number;
}): Promise<string> {
  const queue = getExecutionQueue();
  const job = await queue.add(
    opts.triggeredBy,
    {
      workflowId: opts.workflowId,
      triggeredBy: opts.triggeredBy,
      input: opts.input ?? {},
      priority: opts.priority,
    },
    {
      priority: opts.priority,
      delay: opts.delayMs,
    },
  );
  logger.debug(
    { jobId: job.id, workflowId: opts.workflowId, delayMs: opts.delayMs },
    "execution enqueued",
  );
  return job.id ?? "";
}

export async function closeQueue(): Promise<void> {
  if (eventsInstance) await eventsInstance.close();
  if (queueInstance) await queueInstance.close();
  queueInstance = null;
  eventsInstance = null;
}
