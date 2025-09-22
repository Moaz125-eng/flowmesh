import { describe, it, expect, vi, beforeEach } from "vitest";
import { replayExecution } from "../src/execution/replay.js";
import * as repo from "../src/execution/repository.js";
import * as wfRepo from "../src/workflows/repository.js";
import * as queue from "../src/queue/queue.js";
import { ValidationError } from "../src/utils/errors.js";

vi.mock("../src/execution/repository.js", () => ({
  getExecution: vi.fn(),
}));

vi.mock("../src/workflows/repository.js", () => ({
  getWorkflowOrFail: vi.fn(),
}));

vi.mock("../src/queue/queue.js", () => ({
  enqueueExecution: vi.fn(),
}));

const sampleExecution = {
  id: "ex_abc",
  workflowId: "wf_123",
  workflowName: "demo",
  status: "succeeded" as const,
  triggeredBy: "manual" as const,
  input: { name: "alice" },
  steps: [],
  startedAt: "2025-06-01T10:00:00.000Z",
};

const sampleWorkflow = {
  id: "wf_123",
  name: "demo",
  trigger: { type: "manual" as const },
  nodes: [{ id: "a", type: "log", config: {} }],
  edges: [],
  enabled: true,
  version: 1,
  createdAt: "2025-05-25T10:30:00.000Z",
  updatedAt: "2025-05-25T10:30:00.000Z",
};

describe("replayExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repo.getExecution).mockResolvedValue(sampleExecution);
    vi.mocked(wfRepo.getWorkflowOrFail).mockResolvedValue(sampleWorkflow);
    vi.mocked(queue.enqueueExecution).mockResolvedValue("job_99");
  });

  it("enqueues a replay with merged input metadata", async () => {
    const result = await replayExecution("ex_abc");
    expect(result.jobId).toBe("job_99");
    expect(result.sourceExecutionId).toBe("ex_abc");
    expect(queue.enqueueExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "wf_123",
        triggeredBy: "manual",
        input: expect.objectContaining({
          name: "alice",
          replayOf: "ex_abc",
        }),
      }),
    );
  });

  it("rejects replay while execution is still running", async () => {
    vi.mocked(repo.getExecution).mockResolvedValue({
      ...sampleExecution,
      status: "running",
    });
    await expect(replayExecution("ex_abc")).rejects.toThrow(ValidationError);
  });

  it("rejects replay when workflow is disabled", async () => {
    vi.mocked(wfRepo.getWorkflowOrFail).mockResolvedValue({
      ...sampleWorkflow,
      enabled: false,
    });
    await expect(replayExecution("ex_abc")).rejects.toThrow(ValidationError);
  });

  it("passes through priority when provided", async () => {
    await replayExecution("ex_abc", { priority: 3 });
    expect(queue.enqueueExecution).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 3 }),
    );
  });
});
