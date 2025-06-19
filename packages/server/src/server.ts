import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { FlowMeshError } from "./utils/errors.js";
import { registerWorkflowRoutes } from "./routes/workflows.js";
import { registerWebhookRoutes } from "./triggers/webhook.js";
import { registerExecutionRoutes } from "./triggers/manual.js";
import { registerRealtimeGateway } from "./realtime/gateway.js";
import { registerMetricsRoutes } from "./metrics/routes.js";
import { registerAuth } from "./auth/apiKey.js";
import { getHealth } from "./utils/health.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(cors, { origin: true });
  await registerAuth(app);

  app.get("/health", async (_req, reply) => {
    const status = await getHealth();
    if (status.status !== "ok") reply.code(503);
    return status;
  });

  await registerRealtimeGateway(app);
  await registerWorkflowRoutes(app);
  await registerExecutionRoutes(app);
  await registerWebhookRoutes(app);
  await registerMetricsRoutes(app);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof FlowMeshError) {
      return reply
        .code(err.statusCode)
        .send({ error: err.code, message: err.message });
    }
    logger.error({ err }, "unhandled error");
    return reply
      .code(500)
      .send({ error: "internal_error", message: "Internal server error" });
  });

  return app;
}
