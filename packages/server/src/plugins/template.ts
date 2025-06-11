import { buildConditionScope } from "../execution/context.js";
import type { ExecutionContext } from "../execution/context.js";

const PATTERN = /\{\{\s*([^}]+)\s*\}\}/g;

export function renderTemplate(
  input: unknown,
  ctx: ExecutionContext,
): unknown {
  const scope = buildConditionScope(ctx);
  return walk(input, scope);
}

function walk(value: unknown, scope: Record<string, unknown>): unknown {
  if (typeof value === "string") return interpolate(value, scope);
  if (Array.isArray(value)) return value.map((v) => walk(v, scope));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v, scope);
    }
    return out;
  }
  return value;
}

function interpolate(input: string, scope: Record<string, unknown>): unknown {
  const matches = [...input.matchAll(PATTERN)];
  if (matches.length === 0) return input;
  if (matches.length === 1 && matches[0][0] === input.trim()) {
    return resolvePath(scope, matches[0][1].trim());
  }
  return input.replace(PATTERN, (_, expr: string) => {
    const v = resolvePath(scope, expr.trim());
    if (v === undefined || v === null) return "";
    return typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

function resolvePath(scope: unknown, path: string): unknown {
  const cleaned = path.startsWith("$.") ? path.slice(2) : path;
  if (!cleaned) return scope;
  let cur: unknown = scope;
  for (const seg of cleaned.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}
