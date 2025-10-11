import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

interface DlqRow {
  id: number;
  executionId: string | null;
  workflowId: string | null;
  nodeId: string | null;
  reason: string;
  createdAt: string;
}

export function DlqPanel(): JSX.Element {
  const [items, setItems] = useState<DlqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    const res = await api.listDlq();
    setItems(res.items);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const handleRetry = async (id: number): Promise<void> => {
    setRetrying(id);
    setMessage(null);
    try {
      const res = await api.retryDlq(id);
      setMessage(`requeued as job ${res.jobId}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setRetrying(null);
    }
  };

  if (loading) return <p>Loading…</p>;

  return (
    <section>
      <h2>Dead letter queue</h2>
      <p className="muted">failed jobs land here. retry pushes them back onto the queue.</p>
      {message && <p className="info-block">{message}</p>}

      <table className="grid">
        <thead>
          <tr>
            <th>ID</th>
            <th>Workflow</th>
            <th>Reason</th>
            <th>When</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5}>Queue is empty.</td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>
                  {row.workflowId ? (
                    <Link to={`/workflows/${row.workflowId}/history`}>
                      {row.workflowId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{row.reason}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    disabled={retrying === row.id || !row.workflowId}
                    onClick={() => void handleRetry(row.id)}
                  >
                    {retrying === row.id ? "Retrying…" : "Retry"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
