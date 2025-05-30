import { buildServer } from "./server.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { closePool } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";

async function main(): Promise<void> {
  await runMigrations();
  const app = await buildServer();

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    logger.info(
      { port: config.PORT, host: config.HOST },
      "flowmesh server started",
    );
  } catch (err) {
    logger.error({ err }, "failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    try {
      await app.close();
      await closePool();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main();
