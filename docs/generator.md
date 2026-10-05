# NTAPS generator

NTAPS is a configurable scaffolding CLI. It creates the same module layout, names, imports, route registration, and test skeletons every time.

## Global installation

For development from this repository:

```bash
cd ntaps
npm install
npm link
ntaps --help
```

To install a packed/local copy instead of linking it:

```bash
npm install -g ./ntaps
```

The global package contains a snapshot of `template-be`, while `npm link` uses the sibling template directly.

## Create a backend project

Create a new directory:

```bash
ntaps init cron-shop
cd cron-shop
npm install
```

HTTP is the default project type. Select another runtime with `--type`:

```bash
ntaps init web-shop
ntaps init cron-shop --type=cron
ntaps init email-worker --type=worker
ntaps init internal-rpc --type=grpc
ntaps init storefront-graph --type=graphql
```

The selected runtime controls the generic `npm run dev` and `npm start` commands. Cron projects also receive `CRON_ENABLED=true`. Runtime-specific commands remain available, so a project can enable additional entry points later.

Initialize the current directory:

```bash
mkdir cron-shop
cd cron-shop
ntaps init .
npm install
```

Initialization copies source and project dotfiles, assigns the directory name as the npm package and service name, and excludes `node_modules`, builds, `.env`, and the template's lockfile. It validates all destinations before writing and never overwrites existing files. Use `--dry-run` to preview or `--template <path>` to initialize from another compatible template. Accepted aliases include `api` for `http`, `queue` for `worker`, and `gql` for `graphql`.

## Commands

```bash
ntaps generate api --module orders --router list-orders
ntaps generate api -m orders -r create-order --method post --path /orders
ntaps generate usecase --module orders --name create-order
ntaps generate datalogic --module orders --name order
ntaps generate feature --module invoices --name list-invoices
ntaps generate feature -m invoices -n list-invoices --dry-run
```

`feature` generates the API router, use case, use-case test, repository port, and repository adapter together. Generation validates every destination before writing and refuses to overwrite existing files.

Run `ntaps --help` for the complete command reference. Run `ntaps config init` in an existing compatible project to create only the default NTAPS configuration.

## Project configuration

NTAPS reads `ntaps.config.json` from the current directory:

```json
{
  "sourceRoot": "src",
  "modulesDirectory": "modules",
  "registryFile": "src/modules/generated.ts",
  "registryMarkers": {
    "imports": "// generator:imports",
    "routes": "  // generator:routes"
  },
  "templates": {}
}
```

Paths must be relative and remain inside the target project. API generation requires both registry markers so NTAPS can add imports and routes deterministically.

## Company templates

Any generated artifact can use a company-owned template:

```json
{
  "templates": {
    "api": ".ntaps/templates/api.ts.tpl",
    "usecase": ".ntaps/templates/usecase.ts.tpl",
    "usecaseTest": ".ntaps/templates/usecase.test.ts.tpl",
    "repositoryPort": ".ntaps/templates/repository-port.ts.tpl",
    "repositoryAdapter": ".ntaps/templates/repository-adapter.ts.tpl"
  }
}
```

Available placeholders are:

- `{{module}}`, `{{modulePascal}}`
- `{{name}}`, `{{pascalName}}`, `{{camelName}}`
- `{{router}}`, `{{routerPascal}}`
- `{{method}}`, `{{methodUpper}}`, `{{routePath}}`

An API template must continue to export `create{{routerPascal}}Router` unless the registry convention is customized alongside it.

Within this repository, `template-be` installs NTAPS through `file:../ntaps`. NTAPS still owns its own manifest, lockfile, dependencies, tests, and release lifecycle.
