import type { AppContext } from "./context.js";

export async function run(context: AppContext, start: () => Promise<void>): Promise<void> {
  try {
    await start();
    context.health.ready();
    context.lifecycle.installSignalHandlers();
  } catch (error) {
    context.logger.fatal({ error }, "service failed to start");
    process.exitCode = 1;
    await context.lifecycle.shutdown("startup-failure");
  }
}
