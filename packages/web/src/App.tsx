import { Link, Route, Routes } from "react-router-dom";
import { WorkflowList } from "./pages/WorkflowList.js";
import { ExecutionList } from "./pages/ExecutionList.js";
import { ExecutionDetailPage } from "./pages/ExecutionDetail.js";
import { MetricsPanel } from "./pages/Metrics.js";
import { WorkflowEditor } from "./pages/WorkflowEditor.js";

export function App(): JSX.Element {
  return (
    <div className="app">
      <header className="topbar">
        <h1>FlowMesh</h1>
        <nav>
          <Link to="/">Workflows</Link>
          <Link to="/workflows/new">New</Link>
          <Link to="/executions">Executions</Link>
          <Link to="/metrics">Metrics</Link>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<WorkflowList />} />
          <Route path="/workflows/new" element={<WorkflowEditor />} />
          <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
          <Route path="/executions" element={<ExecutionList />} />
          <Route path="/executions/:id" element={<ExecutionDetailPage />} />
          <Route path="/metrics" element={<MetricsPanel />} />
        </Routes>
      </main>
    </div>
  );
}
