#!/usr/bin/env -S node --experimental-strip-types

import { runCli } from "./cli.ts";

try {
  await runCli(process.argv.slice(2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ntaps: ${message}`);
  process.exitCode = 1;
}
