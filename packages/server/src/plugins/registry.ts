import type { FlowMeshPlugin, PluginRunArgs } from "./types.js";
import { ValidationError } from "../utils/errors.js";
import type { NodeExecutor } from "../execution/runner.js";
import { logger } from "../utils/logger.js";

export class PluginRegistry implements NodeExecutor {
  private plugins = new Map<string, FlowMeshPlugin>();

  register(plugin: FlowMeshPlugin): void {
    if (this.plugins.has(plugin.type)) {
      throw new Error(`plugin already registered: ${plugin.type}`);
    }
    this.plugins.set(plugin.type, plugin);
    logger.debug({ type: plugin.type }, "plugin registered");
  }

  list(): FlowMeshPlugin[] {
    return [...this.plugins.values()];
  }

  has(type: string): boolean {
    return this.plugins.has(type);
  }

  async run(args: {
    nodeId: string;
    type: string;
    config: Record<string, unknown>;
    context: import("../execution/context.js").ExecutionContext;
  }): Promise<unknown> {
    const plugin = this.plugins.get(args.type);
    if (!plugin) {
      throw new ValidationError(`unknown node type: ${args.type}`);
    }
    const runArgs: PluginRunArgs = {
      nodeId: args.nodeId,
      config: args.config,
      context: args.context,
    };
    return plugin.run(runArgs);
  }
}

export const registry = new PluginRegistry();
