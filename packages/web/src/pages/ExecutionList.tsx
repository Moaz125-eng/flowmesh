import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ExecutionSummary } from "@flowmesh/shared";
import { api } from "../api.js";

export function ExecutionList(): JSX.Element {
  const [items, setItems] = useState<ExecutionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (): Promise<void> => {
    const res = await api.listExecutions();
    setItems(res.items);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <section>
      <h2>Executions</h2>
      <table className="grid">
        <thead>
          <tr>
            <th>Workflow</th>
            <th>Status</th>
            <th>Trigger</th>
            <th>Started</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td>
                <Link to={`/executions/${e.id}`}>{e.workflowName}</Link>
                <div className="muted">{e.id}</div>
              </td>
              <td>
                <span className={`pill status-${e.status}`}>{e.status}</span>
              </td>
              <td>{e.triggeredBy}</td>
              <td>{new Date(e.startedAt).toLocaleString()}</td>
              <td>{e.durationMs ? `${e.durationMs}ms` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
