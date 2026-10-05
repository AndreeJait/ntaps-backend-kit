# NTAPS Backend Kit

[![CI](https://github.com/AndreeJait/ntaps-backend-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreeJait/ntaps-backend-kit/actions/workflows/ci.yml)

NTAPS is a TypeScript backend project generator backed by a production-oriented clean-architecture template. It can initialize HTTP APIs, cron services, queue workers, gRPC services, and GraphQL services, then generate consistent routes, use cases, and data-access adapters.

## Repository

```text
ntaps-backend-kit/
├── ntaps/        Generator CLI and package
├── template-be/  TypeScript backend template
└── docs/         Generator, template, and architecture documentation
```

## Install NTAPS

For local development:

```bash
git clone git@github.com:AndreeJait/ntaps-backend-kit.git
cd ntaps-backend-kit/ntaps
npm install
npm link
```

GitHub Packages requires authentication, including for public npm packages. Create a classic personal access token with `read:packages`, then authenticate and install:

```bash
npm login --scope=@andreejait --auth-type=legacy --registry=https://npm.pkg.github.com
npm install --global @andreejait/ntaps
```

## Create a service

HTTP is the default project type:

```bash
ntaps init web-shop
```

Select another runtime when needed:

```bash
ntaps init cron-shop --type=cron
ntaps init email-worker --type=worker
ntaps init internal-rpc --type=grpc
ntaps init storefront --type=graphql
```

Initialize the current directory with `ntaps init .`. The generated service includes TypeScript, formatting rules, tests, lifecycle management, a Makefile, and independent npm configuration.

## Generate consistent modules

```bash
ntaps generate api --module orders --router list-orders
ntaps generate api -m orders -r create-order --method post --path /orders
ntaps generate usecase --module orders --name create-order
ntaps generate datalogic --module orders --name order
ntaps generate feature --module invoices --name list-invoices
```

Use `--dry-run` to inspect changes. Layout, registry markers, and company-owned templates are configurable through `ntaps.config.json`.

## Development

Each project owns its dependencies and lockfile:

```bash
cd ntaps
npm ci
npm run check

cd ../template-be
npm ci
npm run check
npm run build
```

## Publishing

Publishing is handled by GitHub Actions. Update `ntaps/package.json` to a new version, merge the change, and publish a GitHub Release with the matching tag—for example, package version `0.2.0` must use tag `v0.2.0`. The release workflow validates, packages the backend template, and publishes `@andreejait/ntaps` to GitHub Packages.

## Documentation

- [Generator and configuration](docs/generator.md)
- [Backend template](docs/template-be.md)
- [Architecture decisions](docs/architecture)
- [Library recommendations](docs/library-recommendations.md)
