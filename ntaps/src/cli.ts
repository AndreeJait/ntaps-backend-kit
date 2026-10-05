import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { initializeConfig, loadConfig } from "./config.ts";
import { applyGeneration, planGeneration } from "./generator.ts";
import { initializeProject, type ProjectType } from "./initializer.ts";
import { kebab, normalizeRoutePath } from "./naming.ts";
import type { Artifact, GenerateRequest, HttpMethod } from "./types.ts";

const artifacts = new Set<Artifact>(["api", "usecase", "datalogic", "feature"]);
const methods = new Set<HttpMethod>(["get", "post", "put", "patch", "delete"]);

const help = `NTAPS — consistent service scaffolding

Usage:
  ntaps init <directory> [--type <runtime>] [--template <path>] [--dry-run]
  ntaps config init [--config ntaps.config.json]
  ntaps generate api --module <module> --router <router> [options]
  ntaps generate usecase --module <module> --name <name> [options]
  ntaps generate datalogic --module <module> --name <name> [options]
  ntaps generate feature --module <module> --name <name> [options]

Options:
  -m, --module <name>   Business module name
  -r, --router <name>   Router/file name; required for api, defaults to --name for feature
  -n, --name <name>     Use-case/data-logic name
      --method <verb>   get, post, put, patch, or delete (default: get)
      --path <path>     Registered API path (default: /<module>/<router>)
      --config <file>   Config path (default: ntaps.config.json)
      --template <dir>  Override the backend template directory for init
      --type <runtime>  http, cron, worker, grpc, or graphql (default: http)
      --dry-run         Validate and list writes without changing files
  -h, --help            Show this help

Examples:
  ntaps init cron-shop
  ntaps init cron-shop --type=cron
  ntaps init .
  ntaps generate api --module orders --router list-orders
  ntaps generate api -m orders -r create-order --method post --path /orders
  ntaps generate feature -m invoices -n list-invoices --dry-run
`;

function required(value: string | undefined, message: string): string {
  if (!value) throw new Error(message);
  return value;
}

export async function runCli(args: string[], root = process.cwd()): Promise<void> {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      module: { type: "string", short: "m" },
      router: { type: "string", short: "r" },
      name: { type: "string", short: "n" },
      method: { type: "string" },
      path: { type: "string" },
      config: { type: "string" },
      template: { type: "string" },
      type: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (parsed.values.help || parsed.positionals.length === 0) {
    console.log(help);
    return;
  }

  const command = parsed.positionals[0];
  const configPath = parsed.values.config ?? "ntaps.config.json";
  if (command === "init") {
    const target = required(parsed.positionals[1], "target directory is required; use a name or .");
    const type = normalizeProjectType(parsed.values.type ?? "http");
    const targetRoot = await initializeProject(resolve(root), {
      target,
      ...(parsed.values.template ? { template: parsed.values.template } : {}),
      type,
      dryRun: parsed.values["dry-run"],
    });
    if (!parsed.values["dry-run"]) {
      console.log(`created ${type} project at ${targetRoot}`);
      console.log(`next: cd ${target === "." ? "." : target} && npm install`);
    }
    return;
  }
  if (command === "config") {
    if (parsed.positionals[1] !== "init") throw new Error("expected: ntaps config init");
    await initializeConfig(resolve(root), configPath);
    console.log(`created ${configPath}`);
    return;
  }
  if (command !== "generate") throw new Error(`unknown command: ${command}\nRun ntaps --help for usage.`);

  const rawArtifact = required(parsed.positionals[1], "artifact is required: api, usecase, datalogic, or feature");
  if (!artifacts.has(rawArtifact as Artifact)) throw new Error(`unknown artifact: ${rawArtifact}`);
  const artifact = rawArtifact as Artifact;
  const moduleName = kebab(required(parsed.values.module, "--module is required"), "module");
  const positionalName = parsed.positionals[2];
  const rawName = artifact === "api"
    ? parsed.values.router ?? parsed.values.name ?? positionalName
    : parsed.values.name ?? positionalName;
  const name = kebab(required(rawName, artifact === "api" ? "--router is required for api" : "--name is required"), "name");
  const router = kebab(parsed.values.router ?? name, "router");
  const rawMethod = (parsed.values.method ?? "get").toLowerCase();
  if (!methods.has(rawMethod as HttpMethod)) throw new Error(`unsupported HTTP method: ${rawMethod}`);
  const route = normalizeRoutePath(parsed.values.path ?? `/${moduleName}/${router}`);
  const request: GenerateRequest = {
    artifact,
    module: moduleName,
    name,
    router,
    method: rawMethod as HttpMethod,
    routePath: route,
    dryRun: parsed.values["dry-run"],
  };
  const config = await loadConfig(root, configPath);
  const plan = await planGeneration(root, config, request);
  await applyGeneration(root, plan);
}

function normalizeProjectType(value: string): ProjectType {
  const aliases: Record<string, ProjectType> = {
    http: "http",
    api: "http",
    cron: "cron",
    worker: "worker",
    queue: "worker",
    grpc: "grpc",
    graphql: "graphql",
    gql: "graphql",
  };
  const type = aliases[value.toLowerCase()];
  if (!type) throw new Error(`unsupported project type: ${value}`);
  return type;
}
