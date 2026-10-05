import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { initializeProject } from "../src/initializer.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(): Promise<{ root: string; template: string }> {
  const root = await mkdtemp(join(tmpdir(), "ntaps-init-test-"));
  temporaryRoots.push(root);
  const template = join(root, "template");
  await mkdir(join(template, "src"), { recursive: true });
  await mkdir(join(template, "node_modules/example"), { recursive: true });
  await writeFile(join(template, "package.json"), JSON.stringify({
    name: "@andreejait/template-be",
    scripts: { generate: "ntaps generate" },
    devDependencies: { "@andreejait/ntaps": "file:../ntaps", typescript: "latest" },
  }));
  await writeFile(join(template, "src/index.ts"), "export {};\n");
  await writeFile(join(template, ".editorconfig"), "indent_size = 2\n");
  await writeFile(join(template, ".env.example"), "SERVICE_NAME=company-service\nCRON_ENABLED=false\n");
  await writeFile(join(template, ".gitignore"), "node_modules/\n");
  await writeFile(join(template, "ntaps.config.json"), JSON.stringify({
    $schema: "../ntaps/ntaps.schema.json",
    sourceRoot: "src",
  }));
  await writeFile(join(template, "package-lock.json"), "{}");
  await writeFile(join(template, "node_modules/example/index.js"), "ignored");
  return { root, template };
}

test("initializes a standalone project from the backend template", async () => {
  const { root, template } = await fixture();
  const target = await initializeProject(root, {
    target: "cron-shop",
    template,
    type: "cron",
    dryRun: false,
  });

  const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8")) as {
    name: string;
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  assert.equal(manifest.name, "cron-shop");
  assert.equal(manifest.devDependencies["@andreejait/ntaps"], undefined);
  assert.equal(manifest.devDependencies.typescript, "latest");
  assert.equal(manifest.scripts.dev, "npm run dev:cron");
  assert.equal(manifest.scripts.start, "npm run start:cron");
  assert.match(await readFile(join(target, ".env.example"), "utf8"), /SERVICE_NAME=cron-shop/);
  assert.match(await readFile(join(target, ".env.example"), "utf8"), /CRON_ENABLED=true/);
  assert.equal(await readFile(join(target, ".editorconfig"), "utf8"), "indent_size = 2\n");
  assert.equal(await readFile(join(target, ".gitignore"), "utf8"), "node_modules/\n");
  const config = JSON.parse(await readFile(join(target, "ntaps.config.json"), "utf8")) as Record<string, unknown>;
  assert.equal(config.$schema, undefined);
  await assert.rejects(access(join(target, "package-lock.json")));
  await assert.rejects(access(join(target, "node_modules")));
});

test("supports initialization into the current directory", async () => {
  const { root, template } = await fixture();
  const target = join(root, "current-project");
  await mkdir(target);

  await initializeProject(target, { target: ".", template, type: "http", dryRun: false });

  const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8")) as { name: string };
  assert.equal(manifest.name, "current-project");
});

test("detects conflicts before creating any files", async () => {
  const { root, template } = await fixture();
  const target = join(root, "existing");
  await mkdir(target);
  await writeFile(join(target, "package.json"), "keep-me");

  await assert.rejects(
    initializeProject(root, { target: "existing", template, type: "http", dryRun: false }),
    /refusing to overwrite/,
  );
  assert.equal(await readFile(join(target, "package.json"), "utf8"), "keep-me");
  await assert.rejects(access(join(target, "src/index.ts")));
});
