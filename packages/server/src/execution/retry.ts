import type { RetryPolicy } from "@flowmesh/shared";

export const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 1,
  backoff: "fixed",
  initialDelayMs: 0,
};

export function computeBackoffDelay(
  policy: RetryPolicy,
  attempt: number,
): number {
  if (policy.backoff === "fixed") return policy.initialDelayMs;
  const exponential =
    policy.initialDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  const jitter = exponential * 0.2 * Math.random();
  const total = exponential + jitter;
  if (policy.maxDelayMs !== undefined) {
    return Math.min(total, policy.maxDelayMs);
  }
  return total;
}

export class CancelledError extends Error {
  constructor() {
    super("execution cancelled");
    this.name = "CancelledError";
  }
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`step timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export async function abortableSleep(
  ms: number,
  signal: AbortSignal,
): Promise<void> {
  if (ms <= 0) return;
  if (signal.aborted) throw new CancelledError();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new CancelledError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number | undefined,
  signal: AbortSignal,
): Promise<T> {
  if (!ms || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(ms));
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new CancelledError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise
      .then((v) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        reject(e);
      });
  });
}

export interface RetryAttemptResult<T> {
  value: T;
  attempts: number;
}

export async function runWithRetry<T>(opts: {
  policy?: RetryPolicy;
  signal: AbortSignal;
  timeoutMs?: number;
  fn: (attempt: number) => Promise<T>;
  onAttemptError?: (err: unknown, attempt: number, nextDelayMs: number) => void;
}): Promise<RetryAttemptResult<T>> {
  const policy = opts.policy ?? DEFAULT_RETRY;
  let attempt = 0;
  let lastError: unknown;
  while (attempt < policy.maxAttempts) {
    if (opts.signal.aborted) throw new CancelledError();
    attempt++;
    try {
      const value = await withTimeout(
        opts.fn(attempt),
        opts.timeoutMs,
        opts.signal,
      );
      return { value, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (err instanceof CancelledError) throw err;
      if (attempt >= policy.maxAttempts) break;
      const delay = computeBackoffDelay(policy, attempt);
      opts.onAttemptError?.(err, attempt, delay);
      await abortableSleep(delay, opts.signal);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "unknown error"));
}
