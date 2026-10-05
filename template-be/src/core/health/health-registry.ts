export type HealthState = "starting" | "ready" | "stopping";

export class HealthRegistry {
  #state: HealthState = "starting";

  get state(): HealthState {
    return this.#state;
  }

  ready(): void {
    this.#state = "ready";
  }

  stopping(): void {
    this.#state = "stopping";
  }

  isReady(): boolean {
    return this.#state === "ready";
  }
}
