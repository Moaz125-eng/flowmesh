import type { FastifyInstance } from "fastify";
import { collectMetrics, renderPrometheus } from "./collector.js";
import { listDlq } from "../queue/dlq.js";
import { retryDlqEntry } from "../queue/dlq-retry.js";
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

  app.post<{ Params: { id: string } }>(
    "/api/dlq/:id/retry",
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return reply.code(400).send({ error: "invalid_id" });
      }
      const result = await retryDlqEntry(id);
      return reply.code(202).send({ accepted: true, ...result });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/executions/:id/logs",
    async (req) => {
      const items = await listLogs(req.params.id);
      return { items, count: items.length };
    },
  );
}
