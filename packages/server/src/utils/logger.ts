import pino from "pino";
import { config } from "../config.js";

export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: "flowmesh" },
  transport:
    config.NODE_ENV === "development"
      ? {
          target: "pino/file",
          options: { destination: 1 },
        }
      : undefined,
});

export type Logger = typeof logger;
