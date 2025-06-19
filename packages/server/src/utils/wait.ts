import { logger } from "./logger.js";

export interface WaitOptions {
  attempts?: number;
  intervalMs?: number;
  label: string;
}

export async function waitFor<T>(
  fn: () => Promise<T>,
  opts: WaitOptions,
): Promise<T> {
  const attempts = opts.attempts ?? 20;
  const intervalMs = opts.intervalMs ?? 1000;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        logger.warn(
          {
            label: opts.label,
            attempt,
            attempts,
            err: err instanceof Error ? err.message : String(err),
          },
          "wait retrying",
        );
        await sleep(intervalMs);
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`waitFor(${opts.label}) failed after ${attempts} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
