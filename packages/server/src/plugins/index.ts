import { registry } from "./registry.js";
import { logPlugin } from "./builtins/log.js";
import { conditionPlugin } from "./builtins/condition.js";
import { httpPlugin } from "./builtins/http.js";
import {
  discordPlugin,
  githubPlugin,
  slackPlugin,
} from "./builtins/notifications.js";

export { registry } from "./registry.js";
export type { FlowMeshPlugin, PluginRunArgs } from "./types.js";

export function registerBuiltinPlugins(): void {
  if (registry.has("log")) return;
  registry.register(logPlugin);
  registry.register(conditionPlugin);
  registry.register(httpPlugin);
  registry.register(slackPlugin);
  registry.register(discordPlugin);
  registry.register(githubPlugin);
}
