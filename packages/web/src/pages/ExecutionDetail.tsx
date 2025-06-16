import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type {
  ExecutionDetail,
  LogEntry,
  RealtimeEvent,
} from "@flowmesh/shared";
import { api } from "../api.js";

export function ExecutionDetailPage(): JSX.Element {
  const { id = "" } = useParams<{ id: string }>();
  const [exec, setExec] = useState<ExecutionDetail | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const detail = await api.getExecution(id);
      if (!cancelled) setExec(detail);
    };
    void load();
    const poll = setInterval(load, 1500);
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
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [id]);

  if (!exec) return <p>Loading…</p>;

  return (
    <section>
      <h2>{exec.workflowName}</h2>
      <p className="muted">
        {exec.id} · <span className={`pill status-${exec.status}`}>{exec.status}</span> · triggered by {exec.triggeredBy}
      </p>

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
            <tr key={s.nodeId}>
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
