import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getWorkflowOrFail } from "../workflows/repository.js";
import { enqueueExecution } from "../queue/queue.js";
import { cancelExecution } from "../execution/engine.js";
import {
  getExecution,
  listExecutions,
} from "../execution/repository.js";
import { ValidationError } from "../utils/errors.js";
import { replayExecution } from "../execution/replay.js";

const RunBodySchema = z
  .object({
    input: z.record(z.unknown()).optional(),
    priority: z.number().int().min(1).max(10).optional(),
    delayMs: z.number().int().min(0).optional(),
  })
  .default({});

const ListQuerySchema = z.object({
  workflowId: z.string().optional(),
  status: z
    .enum(["pending", "running", "succeeded", "failed", "cancelled"])
    .optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function registerExecutionRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post<{ Params: { id: string } }>(
    "/api/workflows/:id/execute",
    async (req, reply) => {
      const workflow = await getWorkflowOrFail(req.params.id);
      if (!workflow.enabled) {
        throw new ValidationError("workflow is disabled");
      }
      const body = RunBodySchema.parse(req.body ?? {});
      const jobId = await enqueueExecution({
        workflowId: workflow.id,
        triggeredBy: "manual",
        input: body.input ?? {},
        priority: body.priority,
        delayMs: body.delayMs,
      });
      return reply.code(202).send({ accepted: true, jobId });
    },
  );

  app.get("/api/executions", async (req) => {
    const q = ListQuerySchema.parse(req.query ?? {});
    const items = await listExecutions(q);
    return { items, count: items.length };
  });

  app.get<{ Params: { id: string } }>(
    "/api/executions/:id",
    async (req) => {
      return getExecution(req.params.id);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/executions/:id/cancel",
    async (req, reply) => {
      const ok = cancelExecution(req.params.id);
      if (!ok) {
        return reply
          .code(409)
          .send({ error: "not_active", message: "execution is not running" });
      }
      return { cancelled: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/executions/:id/replay",
    async (req, reply) => {
      const body = RunBodySchema.parse(req.body ?? {});
      const result = await replayExecution(req.params.id, {
        triggeredBy: "manual",
        priority: body.priority,
      });
      return reply.code(202).send({ accepted: true, ...result });
    },
  );
}
