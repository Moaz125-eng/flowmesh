export type ConditionContext = Record<string, unknown>;

const TRUE_LITERALS = new Set(["true", "1", "yes"]);
const FALSE_LITERALS = new Set(["false", "0", "no", ""]);

export function evaluateCondition(
  expression: string | undefined,
  context: ConditionContext,
): boolean {
  if (expression === undefined) return true;
  const trimmed = expression.trim();
  if (trimmed === "") return true;
  if (TRUE_LITERALS.has(trimmed.toLowerCase())) return true;
  if (FALSE_LITERALS.has(trimmed.toLowerCase())) return false;

  const orParts = splitTopLevel(trimmed, "||");
  if (orParts.length > 1) {
    return orParts.some((part) => evaluateCondition(part, context));
  }

  const andParts = splitTopLevel(trimmed, "&&");
  if (andParts.length > 1) {
    return andParts.every((part) => evaluateCondition(part, context));
  }

  if (trimmed.startsWith("!")) {
    return !evaluateCondition(trimmed.slice(1), context);
  }

  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return evaluateCondition(trimmed.slice(1, -1), context);
  }

  for (const op of ["==", "!=", ">=", "<=", ">", "<"] as const) {
    const idx = findTopLevel(trimmed, op);
    if (idx >= 0) {
      const left = resolveValue(trimmed.slice(0, idx).trim(), context);
      const right = resolveValue(trimmed.slice(idx + op.length).trim(), context);
      return compare(left, right, op);
    }
  }

  const value = resolveValue(trimmed, context);
  return toBoolean(value);
}

function compare(
  left: unknown,
  right: unknown,
  op: "==" | "!=" | ">" | "<" | ">=" | "<=",
): boolean {
  switch (op) {
    case "==":
      return left === right || String(left) === String(right);
    case "!=":
      return !(left === right || String(left) === String(right));
    case ">":
      return Number(left) > Number(right);
    case "<":
      return Number(left) < Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<=":
      return Number(left) <= Number(right);
  }
}

function resolveValue(token: string, context: ConditionContext): unknown {
  if (token === "") return undefined;
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    return token.slice(1, -1);
  }
  if (!isNaN(Number(token)) && token.trim() !== "") return Number(token);
  if (token === "true") return true;
  if (token === "false") return false;
  if (token === "null") return null;
  if (token.startsWith("$.")) {
    return getPath(context, token.slice(2));
  }
  return getPath(context, token);
}

function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments = path.split(".").filter(Boolean);
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    const m = seg.match(/^([^\[]+)(?:\[(\d+)\])?$/);
    if (!m) return undefined;
    const key = m[1];
    const index = m[2];
    current = (current as Record<string, unknown>)[key];
    if (index !== undefined && Array.isArray(current)) {
      current = current[Number(index)];
    }
  }
  return current;
}

function toBoolean(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (FALSE_LITERALS.has(lower)) return false;
    return value.length > 0;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function splitTopLevel(input: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString: string | null = null;
  let buffer = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      buffer += ch;
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      buffer += ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && input.startsWith(sep, i)) {
      parts.push(buffer);
      buffer = "";
      i += sep.length - 1;
      continue;
    }
    buffer += ch;
  }
  parts.push(buffer);
  return parts;
}

function findTopLevel(input: string, op: string): number {
  let depth = 0;
  let inString: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && input.startsWith(op, i)) {
      const next = input[i + op.length];
      if ((op === ">" || op === "<") && next === "=") continue;
      if (op === "=" && next === "=") continue;
      return i;
    }
  }
  return -1;
}
