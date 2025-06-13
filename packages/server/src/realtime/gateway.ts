import type { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { bus } from "./bus.js";
import { listLogs } from "./logs.js";
import { logger } from "../utils/logger.js";

export async function registerRealtimeGateway(
  app: FastifyInstance,
): Promise<void> {
  await app.register(websocket);

  app.get<{ Params: { id: string } }>(
    "/ws/executions/:id",
    { websocket: true },
    async (socket, req) => {
      const executionId = (req.params as { id: string }).id;
      logger.debug({ executionId }, "ws subscribed");

      try {
        const history = await listLogs(executionId, 200);
        for (const entry of history) {
          socket.send(JSON.stringify({ type: "log", entry }));
        }
      } catch (err) {
        logger.warn({ err, executionId }, "history fetch failed");
      }

      const unsubscribe = bus.subscribe(executionId, (event) => {
        try {
          socket.send(JSON.stringify(event));
        } catch (err) {
          logger.warn({ err, executionId }, "ws send failed");
        }
      });

      socket.on("close", () => {
        unsubscribe();
        logger.debug({ executionId }, "ws closed");
      });
    },
  );
}
