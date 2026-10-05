import type { Client as ElasticsearchClient } from "@elastic/elasticsearch";
import type { Db } from "mongodb";
import type { Pool } from "mysql2/promise";
import type { AppConfig } from "../core/config/env.js";
import { HealthRegistry } from "../core/health/health-registry.js";
import { ShutdownManager } from "../core/lifecycle/shutdown-manager.js";
import { createLogger, type AppLogger } from "../core/logging/logger.js";
import { connectElasticsearch } from "../infrastructure/elasticsearch/elastic-client.js";
import { connectMongo } from "../infrastructure/mongodb/mongo-client.js";
import { connectMysql } from "../infrastructure/mysql/mysql-client.js";
import { connectRedis } from "../infrastructure/redis/redis-client.js";
import type { AppRedisClient } from "../infrastructure/redis/redis-client.js";

export interface AppContext {
  config: AppConfig;
  logger: AppLogger;
  health: HealthRegistry;
  lifecycle: ShutdownManager;
  connections: {
    redis: () => Promise<AppRedisClient>;
    mongo: () => Promise<Db>;
    mysql: () => Promise<Pool>;
    elasticsearch: () => Promise<ElasticsearchClient>;
  };
}

function lazy<T>(factory: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= factory());
}

export function createAppContext(config: AppConfig): AppContext {
  const logger = createLogger(config.serviceName, config.logLevel);
  const health = new HealthRegistry();
  const lifecycle = new ShutdownManager(logger, config.shutdownTimeoutMs);

  lifecycle.register({ name: "readiness", phase: "listeners", close: () => health.stopping() });

  return {
    config,
    logger,
    health,
    lifecycle,
    connections: {
      redis: lazy(async () => {
        if (!config.redisUrl) throw new Error("REDIS_URL is not configured");
        return connectRedis(config.redisUrl, lifecycle, logger);
      }),
      mongo: lazy(async () => {
        if (!config.mongodb) throw new Error("MONGODB_URL is not configured");
        return connectMongo(config.mongodb.url, config.mongodb.database, lifecycle);
      }),
      mysql: lazy(async () => {
        if (!config.mysqlUrl) throw new Error("MYSQL_URL is not configured");
        return connectMysql(config.mysqlUrl, lifecycle);
      }),
      elasticsearch: lazy(async () => {
        if (!config.elasticsearchUrl) throw new Error("ELASTICSEARCH_URL is not configured");
        return connectElasticsearch(config.elasticsearchUrl, lifecycle);
      }),
    },
  };
}
