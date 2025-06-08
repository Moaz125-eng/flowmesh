import { Cron } from "croner";
import type { WorkflowDefinition } from "@flowmesh/shared";
import { findCronWorkflows } from "../workflows/repository.js";
import { enqueueExecution } from "../queue/queue.js";
import { logger } from "../utils/logger.js";

const scheduled = new Map<string, { cron: Cron; version: number }>();

function scheduleWorkflow(workflow: WorkflowDefinition): void {
  if (workflow.trigger.type !== "cron") return;
  const existing = scheduled.get(workflow.id);
  if (existing && existing.version === workflow.version) return;
  if (existing) existing.cron.stop();

  const cron = new Cron(
    workflow.trigger.expression,
    { timezone: workflow.trigger.timezone, protect: true },
    async () => {
      try {
        await enqueueExecution({
          workflowId: workflow.id,
          triggeredBy: "cron",
          input: { triggeredAt: new Date().toISOString() },
        });
        logger.info({ workflowId: workflow.id }, "cron tick enqueued");
      } catch (err) {
        logger.error({ err, workflowId: workflow.id }, "cron enqueue failed");
      }
    },
  );

  scheduled.set(workflow.id, { cron, version: workflow.version });
}

export async function syncCronSchedules(): Promise<void> {
  const workflows = await findCronWorkflows();
  const seen = new Set<string>();
  for (const wf of workflows) {
    seen.add(wf.id);
    scheduleWorkflow(wf);
  }
  for (const [id, entry] of scheduled) {
    if (!seen.has(id)) {
      entry.cron.stop();
      scheduled.delete(id);
    }
  }
}

export function startCronScheduler(intervalMs = 30_000): NodeJS.Timeout {
  void syncCronSchedules();
  return setInterval(() => {
    void syncCronSchedules().catch((err) => {
      logger.error({ err }, "cron sync failed");
    });
  }, intervalMs);
}

export function stopAllCrons(): void {
  for (const entry of scheduled.values()) entry.cron.stop();
  scheduled.clear();
}
