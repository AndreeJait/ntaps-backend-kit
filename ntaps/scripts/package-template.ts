import { copyFile, cp, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const source = resolve(packageRoot, "../template-be");
const destination = resolve(packageRoot, "bundled-template");
const packageReadme = resolve(packageRoot, "README.md");
const excluded = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  ".DS_Store",
  ".env",
  "package-lock.json",
]);

if (process.argv[2] === "copy") {
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, {
    recursive: true,
    filter: (path) => !excluded.has(path.split("/").at(-1) ?? ""),
  });
  await rename(resolve(destination, ".gitignore"), resolve(destination, "gitignore.template"));
  await copyFile(resolve(packageRoot, "../docs/generator.md"), packageReadme);
} else if (process.argv[2] === "clean") {
  await rm(destination, { recursive: true, force: true });
  await rm(packageReadme, { force: true });
} else {
  throw new Error("expected copy or clean");
}
