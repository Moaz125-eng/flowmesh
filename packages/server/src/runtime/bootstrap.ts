import type { FastifyInstance } from "fastify";
import type { Worker } from "bullmq";
import { registerBuiltinPlugins, registry } from "../plugins/index.js";
import { startWorker, stopWorker } from "../queue/worker.js";
import { closeQueue } from "../queue/queue.js";
import { closeRedis } from "../queue/connection.js";
import { startCronScheduler, stopAllCrons } from "../triggers/cron.js";
import { logger } from "../utils/logger.js";

export interface RuntimeHandles {
  worker: Worker;
  cronTimer: NodeJS.Timeout;
}

export function startRuntime(): RuntimeHandles {
  registerBuiltinPlugins();
  const worker = startWorker(registry);
  const cronTimer = startCronScheduler();
  logger.info(
    { plugins: registry.list().map((p) => p.type) },
    "runtime started",
  );
  return { worker, cronTimer };
}

export async function stopRuntime(handles: RuntimeHandles): Promise<void> {
  clearInterval(handles.cronTimer);
  stopAllCrons();
  await stopWorker();
  await closeQueue();
  await closeRedis();
  logger.info("runtime stopped");
}

export async function shutdownApp(
  app: FastifyInstance,
  handles: RuntimeHandles,
): Promise<void> {
  await app.close();
  await stopRuntime(handles);
}
