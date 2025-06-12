import { describe, it, expect, beforeEach } from "vitest";
import { PluginRegistry } from "../src/plugins/registry.js";
import { logPlugin } from "../src/plugins/builtins/log.js";
import { conditionPlugin } from "../src/plugins/builtins/condition.js";
import type { ExecutionContext } from "../src/execution/context.js";

function makeCtx(input: Record<string, unknown> = {}): ExecutionContext {
  return {
    executionId: "ex_test",
    workflow: {} as ExecutionContext["workflow"],
    triggeredBy: "manual",
    input,
    outputs: new Map(),
    steps: new Map(),
    startedAt: 0,
    signal: new AbortController().signal,
  };
}

describe("PluginRegistry", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  it("registers and looks up plugins", () => {
    registry.register(logPlugin);
    expect(registry.has("log")).toBe(true);
    expect(registry.list()).toHaveLength(1);
  });

  it("rejects duplicate registrations", () => {
    registry.register(logPlugin);
    expect(() => registry.register(logPlugin)).toThrow(/already/);
  });

  it("throws on unknown plugin types", async () => {
    const ctx = makeCtx();
    await expect(
      registry.run({ nodeId: "a", type: "missing", config: {}, context: ctx }),
    ).rejects.toThrow(/unknown/);
  });

  it("dispatches to the registered plugin", async () => {
    registry.register(conditionPlugin);
    const ctx = makeCtx({ ok: true });
    const result = (await registry.run({
      nodeId: "c",
      type: "condition",
      config: { expression: "payload.ok == true" },
      context: ctx,
    })) as { matched: boolean };
    expect(result.matched).toBe(true);
  });
});

describe("conditionPlugin", () => {
  it("evaluates a passing expression", async () => {
    const ctx = makeCtx({ ok: true });
    const result = (await conditionPlugin.run({
      nodeId: "c",
      config: { expression: "payload.ok == true" },
      context: ctx,
    })) as { matched: boolean };
    expect(result.matched).toBe(true);
  });

  it("evaluates a failing expression", async () => {
    const ctx = makeCtx({ count: 1 });
    const result = (await conditionPlugin.run({
      nodeId: "c",
      config: { expression: "payload.count > 5" },
      context: ctx,
    })) as { matched: boolean };
    expect(result.matched).toBe(false);
  });

  it("requires a non-empty expression", async () => {
    const ctx = makeCtx({});
    await expect(
      conditionPlugin.run({ nodeId: "c", config: {}, context: ctx }),
    ).rejects.toThrow(/expression/);
  });
});

describe("logPlugin", () => {
  it("renders the template and returns metadata", async () => {
    const ctx = makeCtx({ name: "alice" });
    const result = (await logPlugin.run({
      nodeId: "l",
      config: { message: "hello {{ payload.name }}", level: "info" },
      context: ctx,
    })) as { logged: boolean; message: string; level: string };
    expect(result.logged).toBe(true);
    expect(result.message).toBe("hello alice");
    expect(result.level).toBe("info");
  });
});
