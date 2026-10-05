import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { createBullBoard } from "@bull-board/api";
import { ExpressAdapter } from "@bull-board/express";
import { RedisStore } from "connect-redis";
import cors from "cors";
import express, { type Express } from "express";
import basicAuth from "express-basic-auth";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { RedisStore as RateLimitRedisStore } from "rate-limit-redis";
import type { AppContext } from "../../bootstrap/context.js";
import { GetExample } from "../../modules/example/application/use-cases/get-example.js";
import { InMemoryExampleRepository } from "../../modules/example/infrastructure/persistence/in-memory-example.repository.js";
import { createExampleRouter } from "../../modules/example/presentation/http/example.routes.js";
import { createGeneratedRouter } from "../../modules/generated.js";
import { createQueue } from "../../infrastructure/queue/bullmq.js";
import { createErrorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestContextMiddleware } from "./middleware/request-context.js";
import { createHealthRouter } from "./routes/health.routes.js";

export async function createHttpApp(context: AppContext): Promise<Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", context.config.trustProxy);

  app.use(requestContextMiddleware);
  app.use(pinoHttp({ logger: context.logger }));
  app.use(helmet());
  app.use(
    cors({ origin: context.config.corsOrigins, credentials: context.config.session.enabled }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  const redis =
    context.config.redisUrl && (context.config.session.enabled || context.config.rateLimitEnabled)
      ? await context.connections.redis()
      : undefined;

  if (context.config.rateLimitEnabled) {
    const rateLimitStore = redis
      ? new RateLimitRedisStore({ sendCommand: (...args: string[]) => redis.sendCommand(args) })
      : undefined;
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 100,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        ...(rateLimitStore ? { store: rateLimitStore } : {}),
      }),
    );
  }

  if (context.config.session.enabled) {
    if (!redis) throw new Error("Redis connection was not initialized for sessions");
    app.use(
      session({
        name: "sid",
        secret: context.config.session.secret,
        resave: false,
        saveUninitialized: false,
        proxy: context.config.trustProxy,
        store: new RedisStore({ client: redis, prefix: `${context.config.serviceName}:session:` }),
        cookie: {
          httpOnly: true,
          sameSite: "lax",
          secure: context.config.environment === "production",
          maxAge: 8 * 60 * 60 * 1000,
        },
      }),
    );
  }

  if (context.config.bullBoard.enabled) {
    const queue = createQueue(context);
    const adapter = new ExpressAdapter();
    adapter.setBasePath("/internal/queues");
    createBullBoard({ queues: [new BullMQAdapter(queue)], serverAdapter: adapter });
    app.use(
      "/internal/queues",
      basicAuth({
        challenge: true,
        users: { [context.config.bullBoard.user]: context.config.bullBoard.password },
      }),
      adapter.getRouter(),
    );
  }

  const exampleRepository = new InMemoryExampleRepository();
  app.use("/health", createHealthRouter(context.health));
  app.use("/api/examples", createExampleRouter(new GetExample(exampleRepository)));
  app.use("/api", createGeneratedRouter(context));
  app.use(notFoundHandler);
  app.use(createErrorHandler(context.logger));
  return app;
}
