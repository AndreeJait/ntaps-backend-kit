import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";

const excludedDirectories = new Set(["node_modules", "dist", "coverage", ".git"]);
const excludedFiles = new Set([".DS_Store", ".env", "package-lock.json"]);

export interface InitOptions {
  target: string;
  template?: string;
  type: ProjectType;
  dryRun: boolean;
}

export type ProjectType = "http" | "cron" | "worker" | "grpc" | "graphql";

const runtimeScripts: Record<ProjectType, { dev: string; start: string }> = {
  http: { dev: "npm run dev:api", start: "npm run start:api" },
  cron: { dev: "npm run dev:cron", start: "npm run start:cron" },
  worker: { dev: "npm run dev:worker", start: "npm run start:worker" },
  grpc: { dev: "npm run dev:grpc", start: "npm run start:grpc" },
  graphql: { dev: "npm run dev:gql", start: "npm run start:gql" },
};

interface InitWrite {
  source: string;
  destination: string;
  relativePath: string;
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export async function resolveTemplateRoot(explicitTemplate?: string): Promise<string> {
  if (explicitTemplate) {
    const explicit = resolve(process.cwd(), explicitTemplate);
    if (!(await directoryExists(explicit))) throw new Error(`template directory does not exist: ${explicit}`);
    return explicit;
  }

  const candidates = [
    resolve(import.meta.dirname, "../../template-be"),
    resolve(import.meta.dirname, "../bundled-template"),
  ];
  for (const candidate of candidates) {
    if (await directoryExists(candidate)) return candidate;
  }
  throw new Error("backend template was not found; reinstall NTAPS or pass --template <path>");
}

async function collectFiles(sourceRoot: string, destinationRoot: string, directory = sourceRoot): Promise<InitWrite[]> {
  const writes: InitWrite[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    if (entry.isFile() && excludedFiles.has(entry.name)) continue;
    const source = resolve(directory, entry.name);
    const sourceRelativePath = relative(sourceRoot, source);
    const relativePath = sourceRelativePath === "gitignore.template" ? ".gitignore" : sourceRelativePath;
    if (entry.isDirectory()) {
      writes.push(...await collectFiles(sourceRoot, destinationRoot, source));
    } else if (entry.isFile()) {
      writes.push({ source, destination: resolve(destinationRoot, relativePath), relativePath });
    }
  }
  return writes;
}

async function assertNoConflicts(writes: InitWrite[]): Promise<void> {
  const conflicts: string[] = [];
  for (const write of writes) {
    try {
      await access(write.destination);
      conflicts.push(write.relativePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  if (conflicts.length > 0) {
    throw new Error(`refusing to overwrite existing files:\n${conflicts.map((path) => `  - ${path}`).join("\n")}`);
  }
}

function projectName(targetRoot: string): string {
  const name = basename(targetRoot).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  if (!name) throw new Error("cannot determine a package name from the target directory");
  return name;
}

function transformPackageJson(source: string, name: string, type: ProjectType): string {
  const manifest = JSON.parse(source) as {
    name?: string;
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  manifest.name = name;
  manifest.scripts = {
    ...manifest.scripts,
    dev: runtimeScripts[type].dev,
    start: runtimeScripts[type].start,
  };
  if (manifest.devDependencies) {
    delete manifest.devDependencies["@andreejait/ntaps"];
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function transformEnvironment(source: string, name: string, type: ProjectType): string {
  return source
    .replace(/^SERVICE_NAME=.*$/m, `SERVICE_NAME=${name}`)
    .replace(/^CRON_ENABLED=.*$/m, `CRON_ENABLED=${type === "cron" ? "true" : "false"}`);
}

function transformNtapsConfig(source: string): string {
  const config = JSON.parse(source) as Record<string, unknown>;
  delete config.$schema;
  return `${JSON.stringify(config, null, 2)}\n`;
}

export async function initializeProject(root: string, options: InitOptions): Promise<string> {
  const targetRoot = resolve(root, options.target);
  const sourceRoot = await resolveTemplateRoot(options.template);
  const writes = await collectFiles(sourceRoot, targetRoot);
  await assertNoConflicts(writes);

  if (options.dryRun) {
    for (const write of writes) console.log(`create ${write.relativePath}`);
    return targetRoot;
  }

  const name = projectName(targetRoot);
  for (const write of writes) {
    await mkdir(dirname(write.destination), { recursive: true });
    if (write.relativePath === "package.json") {
      const manifest = transformPackageJson(await readFile(write.source, "utf8"), name, options.type);
      await writeFile(write.destination, manifest, { encoding: "utf8", flag: "wx" });
    } else if (write.relativePath === ".env.example") {
      const environment = transformEnvironment(await readFile(write.source, "utf8"), name, options.type);
      await writeFile(write.destination, environment, { encoding: "utf8", flag: "wx" });
    } else if (write.relativePath === "ntaps.config.json") {
      const config = transformNtapsConfig(await readFile(write.source, "utf8"));
      await writeFile(write.destination, config, { encoding: "utf8", flag: "wx" });
    } else {
      await writeFile(write.destination, await readFile(write.source), { flag: "wx" });
    }
  }
  return targetRoot;
}
