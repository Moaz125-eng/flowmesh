import { describe, it, expect } from "vitest";
import {
  CancelledError,
  computeBackoffDelay,
  runWithRetry,
} from "../src/execution/retry.js";

describe("computeBackoffDelay", () => {
  it("returns the configured fixed delay", () => {
    const policy = {
      maxAttempts: 3,
      backoff: "fixed" as const,
      initialDelayMs: 100,
    };
    expect(computeBackoffDelay(policy, 1)).toBe(100);
    expect(computeBackoffDelay(policy, 5)).toBe(100);
  });

  it("grows exponentially with attempt count", () => {
    const policy = {
      maxAttempts: 5,
      backoff: "exponential" as const,
      initialDelayMs: 100,
    };
    const a = computeBackoffDelay(policy, 1);
    const c = computeBackoffDelay(policy, 3);
    expect(c).toBeGreaterThan(a);
  });

  it("respects the maxDelayMs cap", () => {
    const policy = {
      maxAttempts: 10,
      backoff: "exponential" as const,
      initialDelayMs: 100,
      maxDelayMs: 250,
    };
    const d = computeBackoffDelay(policy, 8);
    expect(d).toBeLessThanOrEqual(250);
  });
});

describe("runWithRetry", () => {
  it("returns successfully on first attempt", async () => {
    const ctrl = new AbortController();
    const result = await runWithRetry({
      signal: ctrl.signal,
      fn: async () => 42,
    });
    expect(result.value).toBe(42);
    expect(result.attempts).toBe(1);
  });

  it("retries on failure and eventually succeeds", async () => {
    const ctrl = new AbortController();
    let count = 0;
    const result = await runWithRetry({
      policy: { maxAttempts: 3, backoff: "fixed", initialDelayMs: 1 },
      signal: ctrl.signal,
      fn: async () => {
        count++;
        if (count < 3) throw new Error("nope");
        return "ok";
      },
    });
    expect(result.value).toBe("ok");
    expect(result.attempts).toBe(3);
  });

  it("throws after exhausting attempts", async () => {
    const ctrl = new AbortController();
    await expect(
      runWithRetry({
        policy: { maxAttempts: 2, backoff: "fixed", initialDelayMs: 1 },
        signal: ctrl.signal,
        fn: async () => {
          throw new Error("always fails");
        },
      }),
    ).rejects.toThrow(/always fails/);
  });

  it("aborts immediately when the signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      runWithRetry({
        signal: ctrl.signal,
        fn: async () => "never",
      }),
    ).rejects.toThrow(CancelledError);
  });
});
