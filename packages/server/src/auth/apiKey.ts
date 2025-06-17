import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isAuthEnabled, isValidKey } from "./keys.js";
import { logger } from "../utils/logger.js";

const PUBLIC_PATH_PREFIXES = [
  "/health",
  "/metrics",
  "/api/webhooks",
  "/ws/",
];

function isPublic(url: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => url.startsWith(prefix));
}

async function preHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!isAuthEnabled()) return;
  if (isPublic(req.url)) return;
  const header = req.headers["x-api-key"];
  const key = Array.isArray(header) ? header[0] : header;
  if (!isValidKey(key)) {
    logger.warn(
      { url: req.url, ip: req.ip, hasKey: Boolean(key) },
      "auth rejected",
    );
    return reply.code(401).send({
      error: "unauthorized",
      message: "valid x-api-key header required",
    });
  }
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", preHandler);
  if (isAuthEnabled()) {
    logger.info("api-key authentication enabled");
  } else {
    logger.warn("api-key authentication disabled (API_KEYS is empty)");
  }
}
