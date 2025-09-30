import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  ExecutionDetail,
  LogEntry,
  RealtimeEvent,
  StepSnapshot,
} from "@flowmesh/shared";
import { api } from "../api.js";

function mergeStep(
  steps: StepSnapshot[],
  patch: Partial<StepSnapshot> & { nodeId: string },
): StepSnapshot[] {
  const idx = steps.findIndex((s) => s.nodeId === patch.nodeId);
  if (idx < 0) {
    return [
      ...steps,
      {
        nodeId: patch.nodeId,
        status: patch.status ?? "running",
        attempts: patch.attempts ?? 0,
        startedAt: patch.startedAt,
        finishedAt: patch.finishedAt,
        durationMs: patch.durationMs,
        error: patch.error,
        output: patch.output,
      },
    ];
  }
  const next = [...steps];
  next[idx] = { ...next[idx], ...patch };
  return next;
}

export function ExecutionDetailPage(): JSX.Element {
  const { id = "" } = useParams<{ id: string }>();
  const [exec, setExec] = useState<ExecutionDetail | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const detail = await api.getExecution(id);
      if (!cancelled) setExec(detail);
    };
    void load();
    const poll = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [id]);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/executions/${id}`);
    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as RealtimeEvent;
        if (event.type === "log") {
          setLogs((prev) => [...prev, event.entry]);
          return;
        }
        if (event.type === "step.started") {
          setExec((prev) =>
            prev
              ? {
                  ...prev,
                  steps: mergeStep(prev.steps, {
                    nodeId: event.nodeId,
                    status: "running",
                    attempts: event.attempt,
                    startedAt: event.startedAt,
                  }),
                }
              : prev,
          );
          return;
        }
        if (event.type === "step.finished") {
          setExec((prev) =>
            prev
              ? {
                  ...prev,
                  steps: mergeStep(prev.steps, {
                    nodeId: event.nodeId,
                    status: event.status,
                    attempts: event.attempts,
                    finishedAt: event.finishedAt,
                    durationMs: event.durationMs,
                  }),
                }
              : prev,
          );
          return;
        }
        if (event.type === "execution.finished") {
          setExec((prev) =>
            prev
              ? {
                  ...prev,
                  status: event.status,
                  finishedAt: event.finishedAt,
                  durationMs: event.durationMs,
                }
              : prev,
          );
        }
      } catch {
        return;
      }
    };
    return () => ws.close();
  }, [id]);

  const progress = useMemo(() => {
    if (!exec || exec.steps.length === 0) return 0;
    const done = exec.steps.filter(
      (s) =>
        s.status === "succeeded" ||
        s.status === "failed" ||
        s.status === "skipped" ||
        s.status === "cancelled",
    ).length;
    return Math.round((done / exec.steps.length) * 100);
  }, [exec]);

  const handleReplay = async (): Promise<void> => {
    setReplaying(true);
    try {
      await api.replayExecution(id);
    } finally {
      setReplaying(false);
    }
  };

  if (!exec) return <p>Loading…</p>;

  return (
    <section>
      <h2>{exec.workflowName}</h2>
      <p className="muted">
        {exec.id} · <span className={`pill status-${exec.status}`}>{exec.status}</span> · triggered by {exec.triggeredBy}
      </p>

      <div className="progress-wrap">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
        <span className="progress-label">{progress}% complete</span>
      </div>

      <div className="actions">
        <button
          disabled={
            replaying ||
            exec.status === "running" ||
            exec.status === "pending"
          }
          onClick={() => void handleReplay()}
        >
          {replaying ? "Replaying…" : "Replay"}
        </button>
      </div>

      <h3>Steps</h3>
      <table className="grid">
        <thead>
          <tr>
            <th>Node</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {exec.steps.map((s) => (
            <tr key={s.nodeId} className={s.status === "failed" ? "row-failed" : ""}>
              <td>{s.nodeId}</td>
              <td>
                <span className={`pill status-${s.status}`}>{s.status}</span>
              </td>
              <td>{s.attempts}</td>
              <td>{s.durationMs ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Logs</h3>
      <pre className="logs">
        {logs.map((l, i) => (
          <div key={i}>
            [{new Date(l.timestamp).toLocaleTimeString()}] {l.level.toUpperCase()}{" "}
            {l.nodeId ? `(${l.nodeId}) ` : ""}
            {l.message}
          </div>
        ))}
      </pre>

      {exec.error && (
        <>
          <h3>Error</h3>
          <pre className="error-block">{exec.error.message}</pre>
        </>
      )}
    </section>
  );
}
