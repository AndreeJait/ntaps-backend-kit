import { createAppContext } from "../bootstrap/context.js";
import { run } from "../bootstrap/run.js";
import { loadConfig } from "../core/config/env.js";
import { createWorker } from "../infrastructure/queue/bullmq.js";

const context = createAppContext(loadConfig());

await run(context, async () => {
  createWorker(context, async (job) => {
    context.logger.info({ jobId: job.id, jobName: job.name }, "processing job");
    return { processedAt: new Date().toISOString() };
  });
  context.logger.info({ queue: context.config.queueName }, "queue worker listening");
});
