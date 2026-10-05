import { createClient } from "redis";
import type { ShutdownManager } from "../../core/lifecycle/shutdown-manager.js";
import type { AppLogger } from "../../core/logging/logger.js";

export type AppRedisClient = ReturnType<typeof createClient>;

export async function connectRedis(
  url: string,
  lifecycle: ShutdownManager,
  logger: AppLogger,
): Promise<AppRedisClient> {
  const client = createClient({ url });
  client.on("error", (error) => logger.error({ error }, "redis error"));
  await client.connect();
  lifecycle.register({
    name: "redis",
    phase: "connections",
    close: async () => {
      if (client.isOpen) await client.quit();
    },
  });
  return client;
}
