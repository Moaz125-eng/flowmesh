import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { findWorkflowByWebhookPath } from "../workflows/repository.js";
import { enqueueExecution } from "../queue/queue.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

function verifySignature(
  rawBody: string,
  secret: string,
  header: string | undefined,
): boolean {
  if (!header) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const provided = header.replace(/^sha256=/, "");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

function extractPayload(req: FastifyRequest): Record<string, unknown> {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return { body };
}

export async function registerWebhookRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.route<{ Params: { "*": string } }>({
    url: "/api/webhooks/*",
    method: ["GET", "POST", "PUT", "DELETE"],
    handler: async (req, reply) => {
      const path = (req.params as { "*": string })["*"];
      const workflow = await findWorkflowByWebhookPath(path);
      if (!workflow) throw new NotFoundError("webhook", path);
      if (workflow.trigger.type !== "webhook") {
        throw new ValidationError("workflow trigger is not webhook");
      }
      if (
        workflow.trigger.method &&
        workflow.trigger.method !== req.method
      ) {
        return reply.code(405).send({ error: "method_not_allowed" });
      }
      if (workflow.trigger.signingSecret) {
        const raw = JSON.stringify(req.body ?? {});
        const sig = req.headers["x-flowmesh-signature"];
        const ok = verifySignature(
          raw,
          workflow.trigger.signingSecret,
          typeof sig === "string" ? sig : undefined,
        );
        if (!ok) return reply.code(401).send({ error: "invalid_signature" });
      }
      const payload = extractPayload(req);
      const jobId = await enqueueExecution({
        workflowId: workflow.id,
        triggeredBy: "webhook",
        input: { payload, headers: req.headers, query: req.query },
      });
      return reply.code(202).send({ accepted: true, jobId });
    },
  });
}
