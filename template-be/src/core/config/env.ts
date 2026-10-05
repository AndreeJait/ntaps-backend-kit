import { z } from "zod";

const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.url().optional());

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    SERVICE_NAME: z.string().min(1).default("ntaps-service"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    HOST: z.string().default("0.0.0.0"),
    API_PORT: z.coerce.number().int().positive().default(3000),
    GRAPHQL_PORT: z.coerce.number().int().positive().default(3001),
    GRPC_PORT: z.coerce.number().int().positive().default(50051),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    REDIS_URL: optionalUrl,
    MONGODB_URL: optionalUrl,
    MONGODB_DATABASE: z.string().default("app"),
    MYSQL_URL: optionalUrl,
    ELASTICSEARCH_URL: optionalUrl,
    SESSION_ENABLED: booleanFromString,
    SESSION_SECRET: z.string().default("development-only-secret-change-me"),
    RATE_LIMIT_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    BULL_BOARD_ENABLED: booleanFromString,
    BULL_BOARD_USER: z.string().default("admin"),
    BULL_BOARD_PASSWORD: z.string().default("replace-me"),
    QUEUE_NAME: z.string().default("default"),
    CRON_ENABLED: booleanFromString,
  })
  .superRefine((env, context) => {
    if ((env.SESSION_ENABLED || env.BULL_BOARD_ENABLED) && !env.REDIS_URL) {
      context.addIssue({
        code: "custom",
        message: "REDIS_URL is required when sessions or Bull Board are enabled",
        path: ["REDIS_URL"],
      });
    }
    if (env.SESSION_ENABLED && env.SESSION_SECRET.length < 32) {
      context.addIssue({
        code: "custom",
        message: "SESSION_SECRET must contain at least 32 characters",
        path: ["SESSION_SECRET"],
      });
    }
  });

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const env = envSchema.parse(source);
  return {
    environment: env.NODE_ENV,
    serviceName: env.SERVICE_NAME,
    logLevel: env.LOG_LEVEL,
    host: env.HOST,
    ports: { api: env.API_PORT, graphql: env.GRAPHQL_PORT, grpc: env.GRPC_PORT },
    shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
    corsOrigins: env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: env.TRUST_PROXY,
    redisUrl: env.REDIS_URL,
    mongodb: env.MONGODB_URL ? { url: env.MONGODB_URL, database: env.MONGODB_DATABASE } : undefined,
    mysqlUrl: env.MYSQL_URL,
    elasticsearchUrl: env.ELASTICSEARCH_URL,
    session: { enabled: env.SESSION_ENABLED, secret: env.SESSION_SECRET },
    rateLimitEnabled: env.RATE_LIMIT_ENABLED,
    bullBoard: {
      enabled: env.BULL_BOARD_ENABLED,
      user: env.BULL_BOARD_USER,
      password: env.BULL_BOARD_PASSWORD,
    },
    queueName: env.QUEUE_NAME,
    cronEnabled: env.CRON_ENABLED,
  };
}
