import type { WorkflowDefinition } from "@flowmesh/shared";
import { query } from "../db/client.js";
import { NotFoundError } from "../utils/errors.js";

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  trigger: WorkflowDefinition["trigger"];
  nodes: WorkflowDefinition["nodes"];
  edges: WorkflowDefinition["edges"];
  enabled: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
}

function rowToWorkflow(row: WorkflowRow): WorkflowDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    trigger: row.trigger,
    nodes: row.nodes,
    edges: row.edges,
    enabled: row.enabled,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function insertWorkflow(
  workflow: WorkflowDefinition,
): Promise<WorkflowDefinition> {
  const result = await query<WorkflowRow>(
    `INSERT INTO workflows (id, name, description, trigger, nodes, edges, enabled, version)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      workflow.id,
      workflow.name,
      workflow.description ?? null,
      JSON.stringify(workflow.trigger),
      JSON.stringify(workflow.nodes),
      JSON.stringify(workflow.edges),
      workflow.enabled,
      workflow.version,
    ],
  );
  return rowToWorkflow(result.rows[0]);
}

export async function findWorkflow(
  id: string,
): Promise<WorkflowDefinition | null> {
  const result = await query<WorkflowRow>(
    "SELECT * FROM workflows WHERE id = $1",
    [id],
  );
  if (result.rows.length === 0) return null;
  return rowToWorkflow(result.rows[0]);
}

export async function getWorkflowOrFail(
  id: string,
): Promise<WorkflowDefinition> {
  const wf = await findWorkflow(id);
  if (!wf) throw new NotFoundError("workflow", id);
  return wf;
}

export async function listWorkflows(opts: {
  enabled?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<WorkflowDefinition[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = "";
  if (opts.enabled !== undefined) {
    params.push(opts.enabled);
    where = `WHERE enabled = $${params.length}`;
  }
  params.push(limit);
  params.push(offset);
  const result = await query<WorkflowRow>(
    `SELECT * FROM workflows ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(rowToWorkflow);
}

export async function updateWorkflow(
  id: string,
  patch: Partial<
    Pick<
      WorkflowDefinition,
      "name" | "description" | "trigger" | "nodes" | "edges" | "enabled"
    >
  >,
): Promise<WorkflowDefinition> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };
  if (patch.name !== undefined) push("name", patch.name);
  if (patch.description !== undefined)
    push("description", patch.description ?? null);
  if (patch.trigger !== undefined)
    push("trigger", JSON.stringify(patch.trigger));
  if (patch.nodes !== undefined) push("nodes", JSON.stringify(patch.nodes));
  if (patch.edges !== undefined) push("edges", JSON.stringify(patch.edges));
  if (patch.enabled !== undefined) push("enabled", patch.enabled);
  sets.push(`version = version + 1`);
  sets.push(`updated_at = NOW()`);
  params.push(id);
  const result = await query<WorkflowRow>(
    `UPDATE workflows SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params,
  );
  if (result.rows.length === 0) throw new NotFoundError("workflow", id);
  return rowToWorkflow(result.rows[0]);
}

export async function deleteWorkflow(id: string): Promise<void> {
  const result = await query(
    "DELETE FROM workflows WHERE id = $1",
    [id],
  );
  if ((result.rowCount ?? 0) === 0) throw new NotFoundError("workflow", id);
}

export async function findWorkflowByWebhookPath(
  path: string,
): Promise<WorkflowDefinition | null> {
  const result = await query<WorkflowRow>(
    `SELECT * FROM workflows
     WHERE enabled = TRUE
       AND trigger->>'type' = 'webhook'
       AND trigger->>'path' = $1
     LIMIT 1`,
    [path],
  );
  if (result.rows.length === 0) return null;
  return rowToWorkflow(result.rows[0]);
}

export async function findCronWorkflows(): Promise<WorkflowDefinition[]> {
  const result = await query<WorkflowRow>(
    `SELECT * FROM workflows
     WHERE enabled = TRUE AND trigger->>'type' = 'cron'`,
  );
  return result.rows.map(rowToWorkflow);
}
