import { describe, it, expect } from "vitest";
import { renderTemplate } from "../src/plugins/template.js";
import type { ExecutionContext } from "../src/execution/context.js";

function makeCtx(input: Record<string, unknown>): ExecutionContext {
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

describe("renderTemplate", () => {
  it("returns scalars unchanged", () => {
    const ctx = makeCtx({});
    expect(renderTemplate(123, ctx)).toBe(123);
    expect(renderTemplate(true, ctx)).toBe(true);
    expect(renderTemplate(null, ctx)).toBe(null);
  });

  it("interpolates variables inside strings", () => {
    const ctx = makeCtx({ name: "world" });
    expect(renderTemplate("hello {{ payload.name }}", ctx)).toBe("hello world");
  });

  it("returns the raw value when the whole string is a single expression", () => {
    const ctx = makeCtx({ count: 5 });
    expect(renderTemplate("{{ payload.count }}", ctx)).toBe(5);
  });

  it("walks objects and arrays recursively", () => {
    const ctx = makeCtx({ user: { id: 7 } });
    const out = renderTemplate(
      { id: "{{ payload.user.id }}", tags: ["{{ payload.user.id }}"] },
      ctx,
    );
    expect(out).toEqual({ id: 7, tags: [7] });
  });

  it("substitutes empty string for missing values", () => {
    const ctx = makeCtx({});
    expect(renderTemplate("x={{ payload.missing }}", ctx)).toBe("x=");
  });

  it("supports the $. prefix for absolute paths", () => {
    const ctx = makeCtx({ a: { b: "deep" } });
    expect(renderTemplate("{{ $.payload.a.b }}", ctx)).toBe("deep");
  });
});
