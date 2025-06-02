import { describe, it, expect } from "vitest";
import { evaluateCondition } from "../src/workflows/conditions.js";

describe("evaluateCondition", () => {
  it("returns true for empty/undefined expressions", () => {
    expect(evaluateCondition(undefined, {})).toBe(true);
    expect(evaluateCondition("", {})).toBe(true);
    expect(evaluateCondition("   ", {})).toBe(true);
  });

  it("handles literal true/false", () => {
    expect(evaluateCondition("true", {})).toBe(true);
    expect(evaluateCondition("false", {})).toBe(false);
    expect(evaluateCondition("yes", {})).toBe(true);
    expect(evaluateCondition("no", {})).toBe(false);
  });

  it("evaluates equality and inequality", () => {
    expect(evaluateCondition("'foo' == 'foo'", {})).toBe(true);
    expect(evaluateCondition("'foo' == 'bar'", {})).toBe(false);
    expect(evaluateCondition("1 == 1", {})).toBe(true);
    expect(evaluateCondition("1 != 2", {})).toBe(true);
  });

  it("evaluates numeric comparisons", () => {
    expect(evaluateCondition("5 > 3", {})).toBe(true);
    expect(evaluateCondition("5 < 3", {})).toBe(false);
    expect(evaluateCondition("5 >= 5", {})).toBe(true);
    expect(evaluateCondition("5 <= 4", {})).toBe(false);
  });

  it("handles logical AND, OR, NOT", () => {
    expect(evaluateCondition("true && true", {})).toBe(true);
    expect(evaluateCondition("true && false", {})).toBe(false);
    expect(evaluateCondition("false || true", {})).toBe(true);
    expect(evaluateCondition("!false", {})).toBe(true);
    expect(evaluateCondition("!true", {})).toBe(false);
  });

  it("resolves variables from the context", () => {
    const ctx = { payload: { action: "opened", count: 5 } };
    expect(evaluateCondition("$.payload.action == 'opened'", ctx)).toBe(true);
    expect(evaluateCondition("payload.count > 3", ctx)).toBe(true);
    expect(evaluateCondition("payload.count > 10", ctx)).toBe(false);
  });

  it("handles parenthesized sub-expressions", () => {
    expect(evaluateCondition("(true || false) && true", {})).toBe(true);
    expect(
      evaluateCondition("(true && false) || (false || true)", {}),
    ).toBe(true);
  });

  it("treats truthy values without an operator", () => {
    expect(evaluateCondition("payload.flag", { payload: { flag: true } })).toBe(
      true,
    );
    expect(
      evaluateCondition("payload.flag", { payload: { flag: false } }),
    ).toBe(false);
    expect(
      evaluateCondition("payload.value", { payload: { value: "" } }),
    ).toBe(false);
  });
});
