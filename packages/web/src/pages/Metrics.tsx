import { useEffect, useState } from "react";
import type { WorkflowMetrics } from "@flowmesh/shared";
import { api } from "../api.js";

export function MetricsPanel(): JSX.Element {
  const [m, setM] = useState<WorkflowMetrics | null>(null);

  useEffect(() => {
    const load = (): void => {
      void api.metrics().then(setM);
    };
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  if (!m) return <p>Loading…</p>;

  const cards: Array<{ label: string; value: string }> = [
    { label: "Workflows", value: `${m.totalWorkflows} (${m.enabledWorkflows} on)` },
    { label: "Executions", value: String(m.totalExecutions) },
    { label: "Succeeded", value: String(m.succeededExecutions) },
    { label: "Failed", value: String(m.failedExecutions) },
    {
      label: "Failure rate",
      value: `${(m.failureRate * 100).toFixed(1)}%`,
    },
    { label: "Avg duration", value: `${m.averageDurationMs}ms` },
    {
      label: "Throughput / min",
      value: String(m.workerThroughputPerMin),
    },
  ];

  return (
    <section>
      <h2>Metrics</h2>
      <div className="cards">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="muted">{c.label}</div>
            <div className="big">{c.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
