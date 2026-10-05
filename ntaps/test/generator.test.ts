import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { defaultConfig } from "../src/config.ts";
import { applyGeneration, planGeneration } from "../src/generator.ts";
import type { GenerateRequest, NtapsConfig } from "../src/types.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function project(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ntaps-test-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "src/modules"), { recursive: true });
  await writeFile(join(root, "src/modules/generated.ts"), `import { Router } from "express";
// generator:imports
export function routes(context: unknown): Router {
  const router = Router();
  const _context = context;
  // generator:routes
  return router;
}
`);
  return root;
}

function request(overrides: Partial<GenerateRequest> = {}): GenerateRequest {
  return {
    artifact: "api",
    module: "orders",
    name: "create-order",
    router: "create-order",
    method: "post",
    routePath: "/orders",
    dryRun: false,
    ...overrides,
  };
}

test("generates a method-aware API and registers it", async () => {
  const root = await project();
  const plan = await planGeneration(root, defaultConfig, request());
  await applyGeneration(root, plan);

  const route = await readFile(join(root, "src/modules/orders/presentation/http/create-order.route.ts"), "utf8");
  const registry = await readFile(join(root, "src/modules/generated.ts"), "utf8");
  assert.match(route, /router\.post\("\/"/);
  assert.match(route, /createCreateOrderRouter/);
  assert.match(registry, /router\.use\("\/orders", createCreateOrderRouter\(_context\)\)/);
});

test("renders a company-owned custom template", async () => {
  const root = await project();
  await mkdir(join(root, "company-templates"));
  await writeFile(join(root, "company-templates/api.tpl"), "export const {{camelName}} = \"{{methodUpper}} {{routePath}}\";\n");
  const config: NtapsConfig = {
    ...defaultConfig,
    registryMarkers: { ...defaultConfig.registryMarkers },
    templates: { api: "company-templates/api.tpl" },
  };
  const plan = await planGeneration(root, config, request());
  await applyGeneration(root, plan);

  const route = await readFile(join(root, "src/modules/orders/presentation/http/create-order.route.ts"), "utf8");
  assert.equal(route, "export const createOrder = \"POST /orders\";\n");
});

test("refuses to overwrite an existing artifact before writing", async () => {
  const root = await project();
  const path = join(root, "src/modules/orders/application/use-cases/create-order.ts");
  await mkdir(join(root, "src/modules/orders/application/use-cases"), { recursive: true });
  await writeFile(path, "existing");

  await assert.rejects(
    planGeneration(root, defaultConfig, request({ artifact: "usecase" })),
    /refusing to overwrite/,
  );
  assert.equal(await readFile(path, "utf8"), "existing");
});
