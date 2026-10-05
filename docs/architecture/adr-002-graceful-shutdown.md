# ADR-002: Phased graceful shutdown

## Status

Accepted.

## Decision

All long-lived resources register with one lifecycle manager. On `SIGTERM` or `SIGINT`, shutdown is idempotent and runs in this order:

1. Mark readiness as stopping and close HTTP/gRPC listeners.
2. Stop cron scheduling and drain BullMQ workers/queues.
3. Close Redis, MySQL, MongoDB, Elasticsearch, and queue Redis connections.

A configurable deadline fails shutdown instead of hanging indefinitely. Each phase uses `Promise.allSettled`, so one broken client does not prevent other clients from closing.

## Consequences

- Kubernetes or another supervisor must set its termination grace period above `SHUTDOWN_TIMEOUT_MS`.
- Queue jobs must be idempotent because BullMQ provides at-least-once processing.
- Long-running jobs should support cancellation or have a job timeout shorter than the deployment grace period.
- New infrastructure adapters are incomplete until they register their close operation.
