import crypto from "node:crypto";
import { config } from "../config.js";

let keysCache: Set<string> | null = null;

function load(): Set<string> {
  if (keysCache) return keysCache;
  const raw = config.API_KEYS ?? "";
  const set = new Set<string>();
  for (const k of raw.split(",")) {
    const trimmed = k.trim();
    if (trimmed) set.add(trimmed);
  }
  keysCache = set;
  return set;
}

export function isValidKey(provided: string | undefined): boolean {
  if (!provided) return false;
  const keys = load();
  if (keys.size === 0) return true;
  for (const k of keys) {
    if (k.length !== provided.length) continue;
    if (crypto.timingSafeEqual(Buffer.from(k), Buffer.from(provided))) {
      return true;
    }
  }
  return false;
}

export function isAuthEnabled(): boolean {
  return load().size > 0;
}

export function resetKeyCache(): void {
  keysCache = null;
}
