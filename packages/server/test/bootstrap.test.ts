import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/plugins/index.js", () => ({
  registerBuiltinPlugins: vi.fn(),
  registry: { list: vi.fn(() => [{ type: "log" }, { type: "http.request" }]) },
}));

vi.mock("../src/queue/worker.js", () => ({
  startWorker: vi.fn(() => ({ id: "worker-1" })),
  stopWorker: vi.fn(),
}));

vi.mock("../src/queue/queue.js", () => ({
  closeQueue: vi.fn(),
}));

vi.mock("../src/queue/connection.js", () => ({
  closeRedis: vi.fn(),
}));

vi.mock("../src/triggers/cron.js", () => ({
  startCronScheduler: vi.fn(() => setInterval(() => {}, 60_000)),
  stopAllCrons: vi.fn(),
}));

import { registerBuiltinPlugins } from "../src/plugins/index.js";
import { startWorker, stopWorker } from "../src/queue/worker.js";
import { closeQueue } from "../src/queue/queue.js";
import { closeRedis } from "../src/queue/connection.js";
import { startCronScheduler, stopAllCrons } from "../src/triggers/cron.js";
import { startRuntime, stopRuntime } from "../src/runtime/bootstrap.js";

describe("runtime bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers plugins and starts worker plus cron scheduler", () => {
    const handles = startRuntime();
    expect(registerBuiltinPlugins).toHaveBeenCalled();
    expect(startWorker).toHaveBeenCalled();
    expect(startCronScheduler).toHaveBeenCalled();
    expect(handles.worker).toEqual({ id: "worker-1" });
    clearInterval(handles.cronTimer);
  });

  it("stops worker, queue, redis, and cron on shutdown", async () => {
    const timer = setInterval(() => {}, 60_000);
    await stopRuntime({ worker: { id: "worker-1" } as never, cronTimer: timer });
    expect(stopAllCrons).toHaveBeenCalled();
    expect(stopWorker).toHaveBeenCalled();
    expect(closeQueue).toHaveBeenCalled();
    expect(closeRedis).toHaveBeenCalled();
  });
});
