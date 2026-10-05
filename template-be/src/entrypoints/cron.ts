import cron from "node-cron";
import { createAppContext } from "../bootstrap/context.js";
import { run } from "../bootstrap/run.js";
import { loadConfig } from "../core/config/env.js";

const context = createAppContext(loadConfig());

await run(context, async () => {
  if (!context.config.cronEnabled) {
    context.logger.warn("cron runtime is disabled; set CRON_ENABLED=true to schedule jobs");
    return;
  }
  const task = cron.schedule(
    "*/5 * * * *",
    async () => {
      context.logger.info("scheduled job started");
      // Call an application use case here. Keep business logic out of this adapter.
    },
    { noOverlap: true },
  );
  context.lifecycle.register({ name: "cron", phase: "work", close: () => task.stop() });
  context.logger.info("cron scheduler started");
});
