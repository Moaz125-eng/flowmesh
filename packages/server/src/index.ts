import { buildServer } from "./server.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { closePool } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { waitFor } from "./utils/wait.js";
import { startRuntime, shutdownApp } from "./runtime/bootstrap.js";

async function main(): Promise<void> {
  await waitFor(() => runMigrations(), {
    attempts: 30,
    intervalMs: 1000,
    label: "database migrations",
  });

  const runtime = startRuntime();
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
      await shutdownApp(app, runtime);
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
