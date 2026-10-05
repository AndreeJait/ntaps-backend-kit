# NTAPS backend template

A TypeScript/Express modular-monolith template with separate processes for REST API, GraphQL, gRPC, BullMQ workers, and cron. It runs the API without external services; storage clients are connected only when requested by a module or enabled feature.

## Formatting

The template uses EditorConfig and Prettier with two-space indentation, LF line endings, double quotes, semicolons, and a 100-character print width. WebStorm reads `.editorconfig` and the local Prettier configuration. VS Code workspace settings enable the recommended EditorConfig and Prettier extensions and format on save.

```bash
npm run format
npm run format:check
```

`npm run check` also verifies formatting before type-checking and running tests.

## Quick start

```bash
cd template-be
cp .env.example .env
npm install
npm run dev:api
curl http://localhost:3000/health/ready
curl http://localhost:3000/api/examples/welcome
```

Other runtimes:

```bash
npm run dev:gql
REDIS_URL=redis://localhost:6379 npm run dev:worker
GRPC_PORT=50051 npm run dev:grpc
CRON_ENABLED=true npm run dev:cron
```

Run each runtime as a separate container/deployment in production. Do not start all entry points inside one Node.js process.

## Module shape

```text
src/modules/<capability>/
  domain/                 business concepts
  application/
    use-cases/            transport-independent operations
    ports/                interfaces required by the application
  infrastructure/         MySQL/Mongo/Redis/Elastic/external adapters
  presentation/           REST/GraphQL/gRPC/queue/cron adapters
```

The example module shows the dependency direction. Architecture decisions are in `docs/architecture` at the repository root, and package migration guidance is in `docs/library-recommendations.md`.

## Generators

```bash
npm run generate -- api --module orders --router list-orders
npm run generate -- api -m orders -r create-order --method post --path /orders
npm run generate -- usecase --module orders --name create-order
npm run generate -- datalogic --module orders --name order
npm run generate -- feature --module invoices --name list-invoices
```

`api` creates and registers an Express route. `usecase` creates a use-case contract and test placeholder. `datalogic` creates an application-owned repository port plus its infrastructure adapter. `feature` creates all three. Use `--dry-run` to inspect the plan. Project layout and company templates are controlled by `ntaps.config.json`.

## Graceful shutdown contract

Every listener, worker, scheduler, and connection must register with `ShutdownManager`. On `SIGTERM`/`SIGINT`, the service becomes unready, stops accepting work, drains work, and then closes storage connections. Set the platform termination grace period higher than `SHUTDOWN_TIMEOUT_MS` (30 seconds by default).

For production, also configure:

- a readiness probe at `/health/ready` and liveness probe at `/health/live`;
- a `preStop`/draining policy appropriate for your ingress;
- job timeouts and idempotency keys;
- company SSO and network controls for Bull Board;
- secret injection rather than committed `.env` files.
