import { EventEmitter } from "node:events";
import type { RealtimeEvent } from "@flowmesh/shared";

class RealtimeBus extends EventEmitter {
  emitEvent(event: RealtimeEvent): void {
    const channel = "executionId" in event ? event.executionId : event.entry.executionId;
    this.emit(channel, event);
    this.emit("*", event);
  }

  subscribe(
    executionId: string,
    handler: (event: RealtimeEvent) => void,
  ): () => void {
    this.on(executionId, handler);
    return () => this.off(executionId, handler);
  }

  subscribeAll(handler: (event: RealtimeEvent) => void): () => void {
    this.on("*", handler);
    return () => this.off("*", handler);
  }
}

export const bus = new RealtimeBus();
