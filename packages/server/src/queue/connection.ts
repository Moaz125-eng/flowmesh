import IORedis, { type Redis } from "ioredis";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

let connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (connection) return connection;
  connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  connection.on("error", (err) => {
    logger.error({ err }, "redis connection error");
  });
  connection.on("connect", () => {
    logger.info("redis connected");
  });
  return connection;
}

export async function closeRedis(): Promise<void> {
  if (!connection) return;
  await connection.quit();
  connection = null;
}
