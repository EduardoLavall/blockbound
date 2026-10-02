import type { MeshBuildRequest, MeshBuildResponse } from "./protocol";

interface PendingJob {
  id: number;
  key: string;
  padded: Uint16Array;
  resolve: (result: MeshBuildResponse) => void;
  reject: (error: Error) => void;
}

interface WorkerSlot {
  worker: Worker;
  current: PendingJob | null;
}

export class MeshWorkerPool {
  private readonly slots: WorkerSlot[];
  private readonly queue: PendingJob[] = [];
  private nextId = 1;

  constructor(workerCount = MeshWorkerPool.recommendedWorkerCount()) {
    this.slots = Array.from({ length: Math.max(1, workerCount) }, () => {
      const worker = new Worker(
        new URL("../../workers/mesher.worker.ts", import.meta.url),
        { type: "module" },
      );
      const slot: WorkerSlot = { worker, current: null };

      worker.onmessage = (event: MessageEvent<MeshBuildResponse>) => {
        const job = slot.current;
        slot.current = null;
        if (job) job.resolve(event.data);
        this.dispatch();
      };

      worker.onerror = (event) => {
        const job = slot.current;
        slot.current = null;
        if (job) job.reject(new Error(event.message || "Voxel mesher worker failed."));
        this.dispatch();
      };

      return slot;
    });
  }

  mesh(key: string, padded: Uint16Array): Promise<MeshBuildResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: this.nextId++,
        key,
        padded,
        resolve,
        reject,
      });
      this.dispatch();
    });
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get busyCount(): number {
    return this.slots.filter((slot) => slot.current !== null).length;
  }

  private dispatch(): void {
    for (const slot of this.slots) {
      if (slot.current || this.queue.length === 0) continue;
      const job = this.queue.shift()!;
      slot.current = job;

      const request: MeshBuildRequest = {
        id: job.id,
        key: job.key,
        padded: job.padded,
      };
      slot.worker.postMessage(request, [job.padded.buffer]);
    }
  }

  private static recommendedWorkerCount(): number {
    const hardware = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 2;
    return Math.max(1, Math.min(4, (hardware ?? 2) - 1));
  }
}
