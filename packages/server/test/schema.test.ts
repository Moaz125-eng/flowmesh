import { describe, it, expect } from "vitest";
import { WorkflowInputSchema } from "../src/workflows/schema.js";

const baseNode = { id: "a", type: "log", config: {} };

describe("WorkflowInputSchema", () => {
  it("accepts a minimal valid workflow", () => {
    const result = WorkflowInputSchema.safeParse({
      name: "test",
      trigger: { type: "manual" },
      nodes: [baseNode],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = WorkflowInputSchema.safeParse({
      name: "",
      trigger: { type: "manual" },
      nodes: [baseNode],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one node", () => {
    const result = WorkflowInputSchema.safeParse({
      name: "test",
      trigger: { type: "manual" },
      nodes: [],
    });
    expect(result.success).toBe(false);
  });

  it("validates webhook trigger paths", () => {
    const ok = WorkflowInputSchema.safeParse({
      name: "wh",
      trigger: { type: "webhook", path: "valid/path" },
      nodes: [baseNode],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects invalid webhook path characters", () => {
    const result = WorkflowInputSchema.safeParse({
      name: "wh",
      trigger: { type: "webhook", path: "bad path with spaces" },
      nodes: [baseNode],
    });
    expect(result.success).toBe(false);
  });

  it("accepts cron triggers with an expression", () => {
    const result = WorkflowInputSchema.safeParse({
      name: "cr",
      trigger: { type: "cron", expression: "*/5 * * * *" },
      nodes: [baseNode],
    });
    expect(result.success).toBe(true);
  });

  it("validates retry policies on nodes", () => {
    const result = WorkflowInputSchema.safeParse({
      name: "wf",
      trigger: { type: "manual" },
      nodes: [
        {
          ...baseNode,
          retry: {
            maxAttempts: 3,
            backoff: "exponential",
            initialDelayMs: 100,
            maxDelayMs: 5000,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects retry policy with invalid backoff", () => {
    const result = WorkflowInputSchema.safeParse({
      name: "wf",
      trigger: { type: "manual" },
      nodes: [
        {
          ...baseNode,
          retry: {
            maxAttempts: 3,
            backoff: "linear" as unknown as "exponential",
            initialDelayMs: 100,
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid node id characters", () => {
    const result = WorkflowInputSchema.safeParse({
      name: "wf",
      trigger: { type: "manual" },
      nodes: [{ id: "bad node id!", type: "log", config: {} }],
    });
    expect(result.success).toBe(false);
  });
});
