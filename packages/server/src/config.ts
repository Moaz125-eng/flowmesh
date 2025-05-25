import { z } from "zod";

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  DATABASE_URL: z
    .string()
    .default("postgres://flowmesh:flowmesh@localhost:5432/flowmesh"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  WEBHOOK_BASE_URL: z.string().default("http://localhost:4000"),
  WEBHOOK_SIGNING_SECRET: z.string().default("change-me-in-production"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${issues}`);
  }
  return parsed.data;
}

export const config = loadConfig();
