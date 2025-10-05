import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ExecutionSummary, WorkflowDefinition } from "@flowmesh/shared";
import { api } from "../api.js";

export function WorkflowHistoryPage(): JSX.Element {
  const { id = "" } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [items, setItems] = useState<ExecutionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const [wf, execs] = await Promise.all([
        api.getWorkflow(id),
        api.listExecutions(id),
      ]);
      if (cancelled) return;
      setWorkflow(wf);
      setItems(execs.items);
      setLoading(false);
    };
    void load();
    const t = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [id]);

  if (loading || !workflow) return <p>Loading…</p>;

  const succeeded = items.filter((e) => e.status === "succeeded").length;
  const failed = items.filter((e) => e.status === "failed").length;
  const avgMs =
    items.length === 0
      ? 0
      : Math.round(
          items.reduce((sum, e) => sum + (e.durationMs ?? 0), 0) / items.length,
        );

  return (
    <section>
      <h2>{workflow.name}</h2>
      <p className="muted">
        {workflow.id} · {workflow.trigger.type} · v{workflow.version}
      </p>

      <div className="cards">
        <div className="card">
          <div className="muted">Runs</div>
          <div className="big">{items.length}</div>
        </div>
        <div className="card">
          <div className="muted">Succeeded</div>
          <div className="big">{succeeded}</div>
        </div>
        <div className="card">
          <div className="muted">Failed</div>
          <div className="big">{failed}</div>
        </div>
        <div className="card">
          <div className="muted">Avg duration</div>
          <div className="big">{avgMs}ms</div>
        </div>
      </div>

      <div className="actions">
        <Link to={`/workflows/${id}/edit`}>
          <button className="ghost">Edit</button>
        </Link>
        <button onClick={() => void api.runWorkflow(id)}>Run now</button>
      </div>

      <h3>Recent executions</h3>
      <table className="grid">
        <thead>
          <tr>
            <th>Status</th>
            <th>Trigger</th>
            <th>Started</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4}>No executions yet.</td>
            </tr>
          ) : (
            items.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link to={`/executions/${e.id}`}>
                    <span className={`pill status-${e.status}`}>{e.status}</span>
                  </Link>
                </td>
                <td>{e.triggeredBy}</td>
                <td>{new Date(e.startedAt).toLocaleString()}</td>
                <td>{e.durationMs ? `${e.durationMs}ms` : "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
