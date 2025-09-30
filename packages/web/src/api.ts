import type {
  ExecutionDetail,
  ExecutionSummary,
  WorkflowDefinition,
  WorkflowMetrics,
} from "@flowmesh/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listWorkflows: () =>
    request<{ items: WorkflowDefinition[] }>("/api/workflows"),
  getWorkflow: (id: string) =>
    request<WorkflowDefinition>(`/api/workflows/${id}`),
  createWorkflow: (input: Record<string, unknown>) =>
    request<WorkflowDefinition>("/api/workflows", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateWorkflow: (id: string, input: Record<string, unknown>) =>
    request<WorkflowDefinition>(`/api/workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  deleteWorkflow: (id: string) =>
    request<void>(`/api/workflows/${id}`, { method: "DELETE" }),
  runWorkflow: (id: string, input: Record<string, unknown> = {}) =>
    request<{ accepted: true; jobId: string }>(
      `/api/workflows/${id}/execute`,
      { method: "POST", body: JSON.stringify({ input }) },
    ),
  toggleWorkflow: (id: string, enabled: boolean) =>
    request<WorkflowDefinition>(`/api/workflows/${id}/enabled`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  listExecutions: (workflowId?: string) =>
    request<{ items: ExecutionSummary[] }>(
      `/api/executions${workflowId ? `?workflowId=${encodeURIComponent(workflowId)}` : ""}`,
    ),
  getExecution: (id: string) =>
    request<ExecutionDetail>(`/api/executions/${id}`),
  cancelExecution: (id: string) =>
    request(`/api/executions/${id}/cancel`, { method: "POST" }),
  replayExecution: (id: string) =>
    request<{ accepted: true; jobId: string }>(
      `/api/executions/${id}/replay`,
      { method: "POST", body: JSON.stringify({}) },
    ),
  metrics: () => request<WorkflowMetrics>("/api/metrics"),
};
