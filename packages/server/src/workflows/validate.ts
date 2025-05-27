import type { WorkflowDefinition } from "@flowmesh/shared";
import { ValidationError } from "../utils/errors.js";
import { WorkflowInputSchema, type WorkflowInput } from "./schema.js";
import { validateDag, type ValidatedDag } from "./dag.js";

export interface ValidatedWorkflow {
  input: WorkflowInput;
  dag: ValidatedDag;
}

export function validateWorkflowInput(input: unknown): ValidatedWorkflow {
  const parsed = WorkflowInputSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("; ");
    throw new ValidationError(`workflow validation failed: ${issues}`);
  }
  const dag = validateDag(parsed.data.nodes, parsed.data.edges);
  return { input: parsed.data, dag };
}

export function nextNodes(
  dag: ValidatedDag,
  nodeId: string,
): { nodeId: string; whenExpr: string | undefined }[] {
  const out = dag.outgoing.get(nodeId);
  if (!out) return [];
  return out.map((e) => ({ nodeId: e.to, whenExpr: e.when }));
}

export function dependenciesSatisfied(
  dag: ValidatedDag,
  nodeId: string,
  completed: ReadonlySet<string>,
): boolean {
  const incoming = dag.incoming.get(nodeId);
  if (!incoming) return true;
  return incoming.every((edge) => completed.has(edge.from));
}

export function isReachableRoot(
  dag: ValidatedDag,
  nodeId: string,
): boolean {
  return dag.roots.includes(nodeId);
}

export function summarizeWorkflow(
  workflow: Pick<WorkflowDefinition, "nodes" | "edges">,
): { nodeCount: number; edgeCount: number; rootCount: number } {
  const dag = validateDag(workflow.nodes, workflow.edges);
  return {
    nodeCount: workflow.nodes.length,
    edgeCount: workflow.edges.length,
    rootCount: dag.roots.length,
  };
}
