import { Queue, Worker, type Processor } from "bullmq";
import { Redis } from "ioredis";
import type { AppContext } from "../../bootstrap/context.js";

function createConnection(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: true });
}

export function createQueue(context: AppContext): Queue {
  if (!context.config.redisUrl) throw new Error("REDIS_URL is required by the queue runtime");
  const connection = createConnection(context.config.redisUrl);
  const queue = new Queue(context.config.queueName, { connection });
  queue.on("error", (error) => context.logger.error({ error }, "queue error"));
  context.lifecycle.register({
    name: `queue:${queue.name}`,
    phase: "work",
    close: () => queue.close(),
  });
  context.lifecycle.register({
    name: "queue-redis",
    phase: "connections",
    close: async () => {
      await connection.quit();
    },
  });
  return queue;
}

export function createWorker(context: AppContext, processor: Processor): Worker {
  if (!context.config.redisUrl) throw new Error("REDIS_URL is required by the worker runtime");
  const connection = createConnection(context.config.redisUrl);
  const worker = new Worker(context.config.queueName, processor, { connection });
  worker.on("completed", (job) =>
    context.logger.info({ jobId: job.id, queue: job.queueName }, "job completed"),
  );
  worker.on("failed", (job, error) =>
    context.logger.error({ jobId: job?.id, error }, "job failed"),
  );
  worker.on("error", (error) => context.logger.error({ error }, "worker error"));
  context.lifecycle.register({
    name: `worker:${worker.name}`,
    phase: "work",
    close: () => worker.close(),
  });
  context.lifecycle.register({
    name: "worker-redis",
    phase: "connections",
    close: async () => {
      await connection.quit();
    },
  });
  return worker;
}
