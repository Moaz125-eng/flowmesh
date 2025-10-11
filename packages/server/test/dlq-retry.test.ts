import { describe, it, expect, vi, beforeEach } from "vitest";
import { retryDlqEntry } from "../src/queue/dlq-retry.js";
import * as dlq from "../src/queue/dlq.js";
import * as wf from "../src/workflows/repository.js";
import * as queue from "../src/queue/queue.js";
import { NotFoundError, ValidationError } from "../src/utils/errors.js";

vi.mock("../src/queue/dlq.js", () => ({
  getDlqEntry: vi.fn(),
  removeDlqEntry: vi.fn(),
}));

vi.mock("../src/workflows/repository.js", () => ({
  getWorkflowOrFail: vi.fn(),
}));

vi.mock("../src/queue/queue.js", () => ({
  enqueueExecution: vi.fn(),
}));

describe("retryDlqEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dlq.getDlqEntry).mockResolvedValue({
      id: 7,
      executionId: "ex_old",
      workflowId: "wf_1",
      nodeId: "n1",
      reason: "workflow_disabled",
      payload: { input: { x: 1 }, triggeredBy: "manual" },
      createdAt: "2025-10-01T10:00:00.000Z",
    });
    vi.mocked(wf.getWorkflowOrFail).mockResolvedValue({
      id: "wf_1",
      name: "demo",
      trigger: { type: "manual" },
      nodes: [{ id: "a", type: "log", config: {} }],
      edges: [],
      enabled: true,
      version: 1,
      createdAt: "2025-05-25T10:30:00.000Z",
      updatedAt: "2025-05-25T10:30:00.000Z",
    });
    vi.mocked(queue.enqueueExecution).mockResolvedValue("job_55");
    vi.mocked(dlq.removeDlqEntry).mockResolvedValue(true);
  });

  it("re-enqueues the workflow and removes the dlq row", async () => {
    const result = await retryDlqEntry(7);
    expect(result.jobId).toBe("job_55");
    expect(queue.enqueueExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "wf_1",
        triggeredBy: "manual",
        input: expect.objectContaining({ dlqRetryOf: 7, x: 1 }),
      }),
    );
    expect(dlq.removeDlqEntry).toHaveBeenCalledWith(7);
  });

  it("throws when entry is missing", async () => {
    vi.mocked(dlq.getDlqEntry).mockResolvedValue(null);
    await expect(retryDlqEntry(99)).rejects.toThrow(NotFoundError);
  });

  it("throws when workflow is disabled", async () => {
    vi.mocked(wf.getWorkflowOrFail).mockResolvedValue({
      id: "wf_1",
      name: "demo",
      trigger: { type: "manual" },
      nodes: [{ id: "a", type: "log", config: {} }],
      edges: [],
      enabled: false,
      version: 1,
      createdAt: "2025-05-25T10:30:00.000Z",
      updatedAt: "2025-05-25T10:30:00.000Z",
    });
    await expect(retryDlqEntry(7)).rejects.toThrow(ValidationError);
  });
});
