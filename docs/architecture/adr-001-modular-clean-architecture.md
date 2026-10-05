# ADR-001: Modular clean architecture with separate runtimes

## Status

Accepted for the template; validate against the first production service.

## Context

The same business capabilities must be callable from REST, GraphQL, gRPC, BullMQ workers, and cron jobs. The current team size, traffic, latency targets, and transaction boundaries are not yet known. The service also uses multiple data stores.

## Decision

Use a modular monolith organized by business capability. Inside a module:

1. `domain` contains business concepts and no framework imports.
2. `application` contains use cases and ports owned by the application.
3. `infrastructure` implements ports for MySQL, MongoDB, Redis, Elasticsearch, or external systems.
4. `presentation` adapts HTTP, GraphQL, gRPC, queues, or schedules to use-case inputs.

Each runtime has a separate entry point and process. Dependencies are wired explicitly in a composition root. Infrastructure clients are lazy and must register a close operation with the lifecycle manager.

## Rationale

- A use case can be reused across transports without importing Express or gRPC.
- Separate processes let workers and APIs scale and deploy independently without premature microservices.
- Explicit wiring is searchable, type-safe, and avoids decorator metadata or runtime file scanning.
- Ports are added at real I/O boundaries, not around every class.

## Trade-offs

- More folders than a controller/service/repository application.
- Cross-store transactions remain an application concern; this template does not pretend MySQL and MongoDB share an atomic transaction.
- Generated code is intentionally small and requires domain decisions from a developer.

## Revisit triggers

- A business module needs independent ownership, release cadence, or scaling.
- More than ten engineers frequently collide in the same deployment.
- Measured latency shows process boundaries or abstraction layers are material.
- A module requires reliable cross-boundary events; add an outbox before adding ad-hoc dual writes.
