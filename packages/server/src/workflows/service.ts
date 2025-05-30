import type { WorkflowDefinition } from "@flowmesh/shared";
import { newWorkflowId } from "../utils/ids.js";
import { validateWorkflowInput } from "./validate.js";
import {
  deleteWorkflow as deleteWorkflowRow,
  findWorkflow,
  getWorkflowOrFail,
  insertWorkflow,
  listWorkflows as listWorkflowsRow,
  updateWorkflow as updateWorkflowRow,
} from "./repository.js";

export async function createWorkflow(input: unknown): Promise<WorkflowDefinition> {
  const validated = validateWorkflowInput(input);
  const now = new Date().toISOString();
  const definition: WorkflowDefinition = {
    id: newWorkflowId(),
    name: validated.input.name,
    description: validated.input.description,
    trigger: validated.input.trigger,
    nodes: validated.input.nodes,
    edges: validated.input.edges,
    enabled: validated.input.enabled,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  return insertWorkflow(definition);
}

export async function updateWorkflowDefinition(
  id: string,
  input: unknown,
): Promise<WorkflowDefinition> {
  await getWorkflowOrFail(id);
  const validated = validateWorkflowInput(input);
  return updateWorkflowRow(id, {
    name: validated.input.name,
    description: validated.input.description,
    trigger: validated.input.trigger,
    nodes: validated.input.nodes,
    edges: validated.input.edges,
    enabled: validated.input.enabled,
  });
}

export async function setWorkflowEnabled(
  id: string,
  enabled: boolean,
): Promise<WorkflowDefinition> {
  return updateWorkflowRow(id, { enabled });
}

export async function getWorkflow(id: string): Promise<WorkflowDefinition> {
  return getWorkflowOrFail(id);
}

export async function tryGetWorkflow(
  id: string,
): Promise<WorkflowDefinition | null> {
  return findWorkflow(id);
}

export async function listAllWorkflows(opts: {
  enabled?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<WorkflowDefinition[]> {
  return listWorkflowsRow(opts);
}

export async function removeWorkflow(id: string): Promise<void> {
  return deleteWorkflowRow(id);
}
