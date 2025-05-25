import type { WorkflowEdge, WorkflowNode } from "@flowmesh/shared";
import { ValidationError } from "../utils/errors.js";

export interface ValidatedDag {
  nodes: ReadonlyMap<string, WorkflowNode>;
  /** Adjacency list: nodeId -> outgoing edges. */
  outgoing: ReadonlyMap<string, WorkflowEdge[]>;
  /** Adjacency list: nodeId -> incoming edges. */
  incoming: ReadonlyMap<string, WorkflowEdge[]>;
  /** Topologically sorted node ids (Kahn's algorithm). */
  order: readonly string[];
  /** Roots (no incoming edges). */
  roots: readonly string[];
}

/**
 * Validate a workflow's nodes/edges and return adjacency maps + a topological
 * order. Throws {@link ValidationError} on cycles, dangling edges or duplicate
 * node ids.
 */
export function validateDag(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): ValidatedDag {
  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of nodes) {
    if (nodeMap.has(node.id)) {
      throw new ValidationError(`duplicate node id: ${node.id}`);
    }
    nodeMap.set(node.id, node);
  }

  const outgoing = new Map<string, WorkflowEdge[]>();
  const incoming = new Map<string, WorkflowEdge[]>();
  for (const id of nodeMap.keys()) {
    outgoing.set(id, []);
    incoming.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.from)) {
      throw new ValidationError(`edge.from references unknown node: ${edge.from}`);
    }
    if (!nodeMap.has(edge.to)) {
      throw new ValidationError(`edge.to references unknown node: ${edge.to}`);
    }
    if (edge.from === edge.to) {
      throw new ValidationError(`self-loop on node: ${edge.from}`);
    }
    outgoing.get(edge.from)!.push(edge);
    incoming.get(edge.to)!.push(edge);
  }

  const order = topologicalSort(nodeMap, incoming, outgoing);
  const roots = [...nodeMap.keys()].filter((id) => incoming.get(id)!.length === 0);
  if (roots.length === 0) {
    throw new ValidationError("workflow has no entry node");
  }

  return { nodes: nodeMap, outgoing, incoming, order, roots };
}

function topologicalSort(
  nodes: Map<string, WorkflowNode>,
  incoming: Map<string, WorkflowEdge[]>,
  outgoing: Map<string, WorkflowEdge[]>,
): string[] {
  const inDegree = new Map<string, number>();
  for (const [id, edges] of incoming) inDegree.set(id, edges.length);

  const queue: string[] = [];
  for (const [id, deg] of inDegree) if (deg === 0) queue.push(id);

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const edge of outgoing.get(id)!) {
      const next = (inDegree.get(edge.to) ?? 0) - 1;
      inDegree.set(edge.to, next);
      if (next === 0) queue.push(edge.to);
    }
  }

  if (order.length !== nodes.size) {
    const remaining = [...inDegree.entries()]
      .filter(([, d]) => d > 0)
      .map(([id]) => id);
    throw new ValidationError(
      `workflow contains a cycle (involves: ${remaining.join(", ")})`,
    );
  }
  return order;
}
