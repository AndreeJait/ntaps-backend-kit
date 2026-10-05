import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { NtapsConfig, TemplateName } from "./types.ts";

export const defaultConfig: NtapsConfig = {
  sourceRoot: "src",
  modulesDirectory: "modules",
  registryFile: "src/modules/generated.ts",
  registryMarkers: { imports: "// generator:imports", routes: "  // generator:routes" },
  templates: {},
};

const templateNames = new Set<TemplateName>([
  "api", "usecase", "usecaseTest", "repositoryPort", "repositoryAdapter",
]);

function safeRelativePath(root: string, value: string, label: string): string {
  if (!value.trim() || isAbsolute(value)) throw new Error(`${label} must be a non-empty relative path`);
  const normalized = relative(root, resolve(root, value));
  if (normalized.startsWith("..") || isAbsolute(normalized)) throw new Error(`${label} must stay inside the target project`);
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

export async function loadConfig(root: string, configPath = "ntaps.config.json"): Promise<NtapsConfig> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(resolve(root, configPath), "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultConfig;
    throw new Error(`cannot read ${configPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${configPath} must contain a JSON object`);
  const input = parsed as Record<string, unknown>;
  const markers = input.registryMarkers;
  const templates = input.templates;
  if (markers !== undefined && (!markers || typeof markers !== "object" || Array.isArray(markers))) {
    throw new Error("registryMarkers must be an object");
  }
  if (templates !== undefined && (!templates || typeof templates !== "object" || Array.isArray(templates))) {
    throw new Error("templates must be an object");
  }

  const customTemplates: Partial<Record<TemplateName, string>> = {};
  for (const [name, path] of Object.entries((templates ?? {}) as Record<string, unknown>)) {
    if (!templateNames.has(name as TemplateName)) throw new Error(`unknown template name: ${name}`);
    if (typeof path !== "string") throw new Error(`template ${name} must be a relative path`);
    customTemplates[name as TemplateName] = safeRelativePath(root, path, `template ${name}`);
  }
  const markerInput = (markers ?? {}) as Record<string, unknown>;
  const sourceRoot = typeof input.sourceRoot === "string" ? input.sourceRoot : defaultConfig.sourceRoot;
  const modulesDirectory = typeof input.modulesDirectory === "string" ? input.modulesDirectory : defaultConfig.modulesDirectory;
  const registryFile = typeof input.registryFile === "string" ? input.registryFile : defaultConfig.registryFile;

  return {
    sourceRoot: safeRelativePath(root, sourceRoot, "sourceRoot"),
    modulesDirectory: safeRelativePath(root, modulesDirectory, "modulesDirectory"),
    registryFile: safeRelativePath(root, registryFile, "registryFile"),
    registryMarkers: {
      imports: typeof markerInput.imports === "string" ? markerInput.imports : defaultConfig.registryMarkers.imports,
      routes: typeof markerInput.routes === "string" ? markerInput.routes : defaultConfig.registryMarkers.routes,
    },
    templates: customTemplates,
  };
}

export async function initializeConfig(root: string, configPath = "ntaps.config.json"): Promise<void> {
  await writeFile(resolve(root, configPath), `${JSON.stringify(defaultConfig, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}
