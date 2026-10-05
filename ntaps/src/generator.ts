import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { camel, pascal } from "./naming.ts";
import { renderTemplate } from "./templates.ts";
import type { GenerateRequest, GenerationPlan, NtapsConfig, PlannedWrite, TemplateContext } from "./types.ts";

function moduleRoot(config: NtapsConfig, moduleName: string): string {
  return `${config.sourceRoot}/${config.modulesDirectory}/${moduleName}`;
}

function createContext(request: GenerateRequest): TemplateContext {
  return {
    module: request.module,
    modulePascal: pascal(request.module),
    name: request.name,
    pascalName: pascal(request.name),
    camelName: camel(request.name),
    router: request.router,
    routerPascal: pascal(request.router),
    method: request.method,
    methodUpper: request.method.toUpperCase(),
    routePath: request.routePath,
  };
}

async function apiWrites(
  root: string,
  config: NtapsConfig,
  request: GenerateRequest,
  context: TemplateContext,
): Promise<PlannedWrite[]> {
  const routerPath = `${moduleRoot(config, request.module)}/presentation/http/${request.router}.route.ts`;
  let registry: string;
  try {
    registry = await readFile(resolve(root, config.registryFile), "utf8");
  } catch (error) {
    throw new Error(`cannot read route registry ${config.registryFile}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const importLine = `import { create${context.routerPascal}Router } from "./${request.module}/presentation/http/${request.router}.route.js";`;
  const routeLine = `  router.use("${request.routePath}", create${context.routerPascal}Router(_context));`;
  if (!registry.includes(config.registryMarkers.imports)) throw new Error(`registry import marker not found: ${config.registryMarkers.imports}`);
  if (!registry.includes(config.registryMarkers.routes)) throw new Error(`registry route marker not found: ${config.registryMarkers.routes.trim()}`);
  if (registry.includes(importLine) || registry.includes(routeLine)) throw new Error("route is already registered");
  const updatedRegistry = registry
    .replace(config.registryMarkers.imports, `${config.registryMarkers.imports}\n${importLine}`)
    .replace(config.registryMarkers.routes, `${config.registryMarkers.routes}\n${routeLine}`);

  return [
    { path: routerPath, content: await renderTemplate(root, config, "api", context), mode: "create" },
    { path: config.registryFile, content: updatedRegistry, mode: "update" },
  ];
}

async function useCaseWrites(
  root: string,
  config: NtapsConfig,
  request: GenerateRequest,
  context: TemplateContext,
): Promise<PlannedWrite[]> {
  const base = `${moduleRoot(config, request.module)}/application/use-cases/${request.name}`;
  return [
    { path: `${base}.ts`, content: await renderTemplate(root, config, "usecase", context), mode: "create" },
    { path: `${base}.test.ts`, content: await renderTemplate(root, config, "usecaseTest", context), mode: "create" },
  ];
}

async function dataLogicWrites(
  root: string,
  config: NtapsConfig,
  request: GenerateRequest,
  context: TemplateContext,
): Promise<PlannedWrite[]> {
  const base = moduleRoot(config, request.module);
  return [
    {
      path: `${base}/application/ports/${request.name}.repository.ts`,
      content: await renderTemplate(root, config, "repositoryPort", context),
      mode: "create",
    },
    {
      path: `${base}/infrastructure/persistence/${request.name}.repository.ts`,
      content: await renderTemplate(root, config, "repositoryAdapter", context),
      mode: "create",
    },
  ];
}

async function assertCanApply(root: string, writes: PlannedWrite[]): Promise<void> {
  for (const write of writes) {
    if (write.mode === "update") continue;
    try {
      await access(resolve(root, write.path));
      throw new Error(`refusing to overwrite ${write.path}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export async function planGeneration(
  root: string,
  config: NtapsConfig,
  request: GenerateRequest,
): Promise<GenerationPlan> {
  const context = createContext(request);
  const writes: PlannedWrite[] = [];
  if (request.artifact === "api" || request.artifact === "feature") {
    writes.push(...await apiWrites(root, config, request, context));
  }
  if (request.artifact === "usecase" || request.artifact === "feature") {
    writes.push(...await useCaseWrites(root, config, request, context));
  }
  if (request.artifact === "datalogic" || request.artifact === "feature") {
    writes.push(...await dataLogicWrites(root, config, request, context));
  }
  await assertCanApply(root, writes);
  return { request, writes };
}

export async function applyGeneration(root: string, plan: GenerationPlan): Promise<void> {
  if (plan.request.dryRun) {
    for (const write of plan.writes) console.log(`${write.mode.padEnd(6)} ${write.path}`);
    return;
  }
  const creates = plan.writes.filter((write) => write.mode === "create");
  const updates = plan.writes.filter((write) => write.mode === "update");
  for (const write of [...creates, ...updates]) {
    const absolutePath = resolve(root, write.path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, write.content, {
      encoding: "utf8",
      ...(write.mode === "create" ? { flag: "wx" } : {}),
    });
    console.log(`${write.mode === "create" ? "created" : "updated"} ${write.path}`);
  }
}
