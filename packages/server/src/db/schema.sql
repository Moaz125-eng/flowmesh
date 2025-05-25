-- FlowMesh schema. Idempotent: every CREATE uses IF NOT EXISTS so this file
-- can be re-applied on startup.

CREATE TABLE IF NOT EXISTS workflows (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  trigger     JSONB NOT NULL,
  nodes       JSONB NOT NULL,
  edges       JSONB NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON workflows (enabled);

CREATE TABLE IF NOT EXISTS executions (
  id            TEXT PRIMARY KEY,
  workflow_id   TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status        TEXT NOT NULL,
  triggered_by  TEXT NOT NULL,
  input         JSONB NOT NULL DEFAULT '{}'::jsonb,
  output        JSONB,
  error         JSONB,
  steps         JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  duration_ms   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_executions_workflow ON executions (workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status   ON executions (status);
CREATE INDEX IF NOT EXISTS idx_executions_started  ON executions (started_at DESC);

CREATE TABLE IF NOT EXISTS execution_logs (
  id           BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  node_id      TEXT,
  level        TEXT NOT NULL,
  message      TEXT NOT NULL,
  data         JSONB,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_execution ON execution_logs (execution_id, id);

CREATE TABLE IF NOT EXISTS dlq_entries (
  id           BIGSERIAL PRIMARY KEY,
  execution_id TEXT,
  workflow_id  TEXT,
  node_id      TEXT,
  reason       TEXT NOT NULL,
  payload      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlq_workflow ON dlq_entries (workflow_id);
