import type { ExecutionContext } from "../execution/context.js";

export interface PluginRunArgs {
  nodeId: string;
  config: Record<string, unknown>;
  context: ExecutionContext;
}

export interface FlowMeshPlugin {
  type: string;
  description?: string;
  run(args: PluginRunArgs): Promise<unknown>;
}
