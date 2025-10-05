import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { WorkflowDefinition } from "@flowmesh/shared";
import { api } from "../api.js";

export function WorkflowList(): JSX.Element {
  const [items, setItems] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      const res = await api.listWorkflows();
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const handleRun = async (id: string): Promise<void> => {
    setRunning(id);
    try {
      await api.runWorkflow(id);
    } finally {
      setRunning(null);
    }
  };

  if (loading) return <p>Loading workflows…</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <section>
      <h2>Workflows</h2>
      {items.length === 0 ? (
        <p>No workflows yet.</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Name</th>
              <th>Trigger</th>
              <th>Nodes</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((wf) => (
              <tr key={wf.id}>
                <td>
                  <strong>{wf.name}</strong>
                  <div className="muted">{wf.id}</div>
                </td>
                <td>{wf.trigger.type}</td>
                <td>{wf.nodes.length}</td>
                <td>
                  <span
                    className={`pill ${wf.enabled ? "ok" : "off"}`}
                    onClick={() =>
                      void api.toggleWorkflow(wf.id, !wf.enabled).then(load)
                    }
                  >
                    {wf.enabled ? "on" : "off"}
                  </span>
                </td>
                <td>
                  <Link to={`/workflows/${wf.id}/history`}>
                    <button className="ghost">History</button>
                  </Link>{" "}
                  <button
                    disabled={running === wf.id || !wf.enabled}
                    onClick={() => void handleRun(wf.id)}
                  >
                    Run
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
