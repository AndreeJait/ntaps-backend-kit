import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { NtapsConfig, TemplateContext, TemplateName } from "./types.ts";

const defaults: Record<TemplateName, string> = {
  api: `import { Router } from "express";
import type { AppContext } from "../../../../bootstrap/context.js";

export function create{{routerPascal}}Router(context: AppContext): Router {
  const router = Router();
  router.{{method}}("/", async (_request, response) => {
    context.logger.debug("{{router}} endpoint called");
    response.json({ data: [] });
  });
  return router;
}
`,
  usecase: `export interface {{pascalName}}Input {
  // Add validated, transport-independent input fields.
}

export interface {{pascalName}}Output {
  // Add fields returned to any transport.
}

export class {{pascalName}} {
  async execute(_input: {{pascalName}}Input): Promise<{{pascalName}}Output> {
    throw new Error("{{pascalName}} is not implemented");
  }
}
`,
  usecaseTest: `import { describe, it } from "vitest";
import { {{pascalName}} } from "./{{name}}.js";

describe("{{pascalName}}", () => {
  it.todo("implements the business rule");
});
`,
  repositoryPort: `export interface {{pascalName}}Repository {
  findById(id: string): Promise<unknown | undefined>;
}
`,
  repositoryAdapter: `import type { {{pascalName}}Repository } from "../../application/ports/{{name}}.repository.js";

export class {{pascalName}}DataLogic implements {{pascalName}}Repository {
  async findById(_id: string): Promise<unknown | undefined> {
    throw new Error("{{pascalName}}DataLogic is not implemented");
  }
}
`,
};

function render(source: string, context: TemplateContext): string {
  const values = context as unknown as Record<string, string>;
  const rendered = source.replace(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`unknown template variable: ${key}`);
    return value;
  });
  const unresolved = rendered.match(/\{\{[^}]+\}\}/)?.[0];
  if (unresolved) throw new Error(`invalid template variable: ${unresolved}`);
  return rendered;
}

export async function renderTemplate(
  root: string,
  config: NtapsConfig,
  name: TemplateName,
  context: TemplateContext,
): Promise<string> {
  const customPath = config.templates[name];
  const source = customPath ? await readFile(resolve(root, customPath), "utf8") : defaults[name];
  return render(source, context);
}
