import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createWorkflow,
  getWorkflow,
  listAllWorkflows,
  removeWorkflow,
  setWorkflowEnabled,
  updateWorkflowDefinition,
} from "../workflows/service.js";

const ListQuerySchema = z.object({
  enabled: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const ToggleSchema = z.object({ enabled: z.boolean() });

export async function registerWorkflowRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/workflows", async (req, reply) => {
    const wf = await createWorkflow(req.body);
    return reply.code(201).send(wf);
  });

  app.get("/api/workflows", async (req) => {
    const q = ListQuerySchema.parse(req.query ?? {});
    const items = await listAllWorkflows(q);
    return { items, count: items.length };
  });

  app.get<{ Params: { id: string } }>(
    "/api/workflows/:id",
    async (req) => {
      return getWorkflow(req.params.id);
    },
  );

  app.put<{ Params: { id: string } }>(
    "/api/workflows/:id",
    async (req) => {
      return updateWorkflowDefinition(req.params.id, req.body);
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/api/workflows/:id/enabled",
    async (req) => {
      const { enabled } = ToggleSchema.parse(req.body);
      return setWorkflowEnabled(req.params.id, enabled);
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/workflows/:id",
    async (req, reply) => {
      await removeWorkflow(req.params.id);
      return reply.code(204).send();
    },
  );
}
