import type { FlowMeshPlugin } from "../types.js";
import { renderTemplate } from "../template.js";
import { logger } from "../../utils/logger.js";

export const logPlugin: FlowMeshPlugin = {
  type: "log",
  description: "Log a message to the execution log",
  async run({ config, context, nodeId }) {
    const level =
      typeof config.level === "string" ? config.level : "info";
    const message =
      typeof config.message === "string"
        ? (renderTemplate(config.message, context) as string)
        : "log";
    const data =
      config.data && typeof config.data === "object"
        ? (renderTemplate(config.data, context) as Record<string, unknown>)
        : undefined;
    const log = (logger as unknown as Record<string, (obj: unknown, msg: string) => void>)[level]
      ? (logger as unknown as Record<string, (obj: unknown, msg: string) => void>)[level]
      : logger.info.bind(logger);
    log({ executionId: context.executionId, nodeId, data }, message);
    return { logged: true, message, level };
  },
};
