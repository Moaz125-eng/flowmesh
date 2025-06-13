import type { FastifyInstance } from "fastify";
import { collectMetrics, renderPrometheus } from "./collector.js";
import { listDlq } from "../queue/dlq.js";
import { listLogs } from "../realtime/logs.js";

export async function registerMetricsRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/metrics", async (_req, reply) => {
    const metrics = await collectMetrics();
    reply.header("Content-Type", "text/plain; version=0.0.4");
    return renderPrometheus(metrics);
  });

  app.get("/api/metrics", async () => collectMetrics());

  app.get("/api/dlq", async (req) => {
    const q = req.query as { workflowId?: string; limit?: string };
    const items = await listDlq({
      workflowId: q.workflowId,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { items, count: items.length };
  });

  app.get<{ Params: { id: string } }>(
    "/api/executions/:id/logs",
    async (req) => {
      const items = await listLogs(req.params.id);
      return { items, count: items.length };
    },
  );
}
