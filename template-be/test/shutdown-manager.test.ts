import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import { ShutdownManager } from "../src/core/lifecycle/shutdown-manager.js";

describe("ShutdownManager", () => {
  it("closes listeners, work, and connections in order and only once", async () => {
    const calls: string[] = [];
    const manager = new ShutdownManager(pino({ level: "silent" }), 1_000);
    manager.register({
      name: "db",
      phase: "connections",
      close: () => {
        calls.push("db");
      },
    });
    manager.register({
      name: "worker",
      phase: "work",
      close: () => {
        calls.push("worker");
      },
    });
    manager.register({
      name: "http",
      phase: "listeners",
      close: () => {
        calls.push("http");
      },
    });

    await Promise.all([manager.shutdown("test"), manager.shutdown("duplicate")]);

    expect(calls).toEqual(["http", "worker", "db"]);
  });

  it("continues closing resources when one close operation fails", async () => {
    const close = vi.fn();
    const manager = new ShutdownManager(pino({ level: "silent" }), 1_000);
    manager.register({
      name: "broken",
      phase: "listeners",
      close: () => {
        throw new Error("broken");
      },
    });
    manager.register({ name: "database", phase: "connections", close });

    await manager.shutdown("test");

    expect(close).toHaveBeenCalledOnce();
  });
});
