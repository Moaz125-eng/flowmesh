import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

const SAMPLE = JSON.stringify(
  {
    name: "example",
    description: "an example workflow",
    trigger: { type: "manual" },
    nodes: [
      {
        id: "log1",
        type: "log",
        config: { message: "hello {{ payload.name }}" },
      },
    ],
    edges: [],
    enabled: true,
  },
  null,
  2,
);

export function WorkflowEditor(): JSX.Element {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [text, setText] = useState(SAMPLE);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void api
      .getWorkflow(id)
      .then((wf) => {
        if (cancelled) return;
        setText(
          JSON.stringify(
            {
              name: wf.name,
              description: wf.description,
              trigger: wf.trigger,
              nodes: wf.nodes,
              edges: wf.edges,
              enabled: wf.enabled,
            },
            null,
            2,
          ),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const validate = (): unknown | null => {
    try {
      const obj = JSON.parse(text);
      setError(null);
      setInfo("JSON parsed successfully");
      return obj;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setInfo(null);
      return null;
    }
  };

  const handleSave = async (): Promise<void> => {
    const obj = validate();
    if (!obj) return;
    setSaving(true);
    setInfo(null);
    try {
      const wf = id
        ? await api.updateWorkflow(id, obj as Record<string, unknown>)
        : await api.createWorkflow(obj as Record<string, unknown>);
      setError(null);
      setInfo(id ? "Workflow updated" : "Workflow created");
      if (!id) navigate(`/workflows/${wf.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="editor">
      <h2>{id ? "Edit workflow" : "New workflow"}</h2>
      <p className="muted">
        Paste a workflow definition in JSON. The schema is validated server-side
        before being saved.
      </p>
      <textarea
        className="json-editor"
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        rows={24}
      />
      {error && <pre className="error-block">{error}</pre>}
      {info && !error && <p className="info-block">{info}</p>}
      <div className="actions">
        <button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : id ? "Update" : "Create"}
        </button>
        <button className="ghost" onClick={() => validate()}>
          Validate JSON
        </button>
        <button className="ghost" onClick={() => navigate("/")}>
          Cancel
        </button>
      </div>
    </section>
  );
}
