import type { AppLogger } from "../logging/logger.js";

export type ShutdownPhase = "listeners" | "work" | "connections";

export interface ShutdownResource {
  name: string;
  phase: ShutdownPhase;
  close: () => void | Promise<void>;
}

const phaseOrder: ShutdownPhase[] = ["listeners", "work", "connections"];

export class ShutdownManager {
  readonly #resources: ShutdownResource[] = [];
  #shutdownPromise?: Promise<void>;

  constructor(
    private readonly logger: AppLogger,
    private readonly timeoutMs: number,
  ) {}

  register(resource: ShutdownResource): () => void {
    this.#resources.push(resource);
    return () => {
      const index = this.#resources.indexOf(resource);
      if (index >= 0) this.#resources.splice(index, 1);
    };
  }

  installSignalHandlers(): void {
    for (const signal of ["SIGTERM", "SIGINT"] as const) {
      process.once(signal, () => {
        void this.shutdown(signal).catch((error: unknown) => {
          this.logger.fatal({ error, signal }, "graceful shutdown failed");
          process.exitCode = 1;
        });
      });
    }
  }

  shutdown(reason = "manual"): Promise<void> {
    this.#shutdownPromise ??= this.#runShutdown(reason);
    return this.#shutdownPromise;
  }

  async #runShutdown(reason: string): Promise<void> {
    this.logger.info({ reason }, "graceful shutdown started");
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`shutdown exceeded ${this.timeoutMs}ms`)),
        this.timeoutMs,
      );
      timer.unref();
    });

    try {
      await Promise.race([this.#closeInPhases(), deadline]);
      this.logger.info("graceful shutdown complete");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async #closeInPhases(): Promise<void> {
    for (const phase of phaseOrder) {
      const resources = this.#resources.filter((resource) => resource.phase === phase);
      const results = await Promise.allSettled(
        resources.map(async (resource) => {
          this.logger.debug({ resource: resource.name, phase }, "closing resource");
          await resource.close();
        }),
      );
      const failures = results.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ name: resources[index]?.name ?? "unknown", error: result.reason }]
          : [],
      );
      if (failures.length > 0) {
        this.logger.error({ phase, failures }, "one or more resources failed to close");
      }
    }
  }
}
