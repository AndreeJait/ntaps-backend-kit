export type Artifact = "api" | "usecase" | "datalogic" | "feature";
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export type TemplateName = "api" | "usecase" | "usecaseTest" | "repositoryPort" | "repositoryAdapter";

export interface NtapsConfig {
  sourceRoot: string;
  modulesDirectory: string;
  registryFile: string;
  registryMarkers: { imports: string; routes: string };
  templates: Partial<Record<TemplateName, string>>;
}

export interface GenerateRequest {
  artifact: Artifact;
  module: string;
  name: string;
  router: string;
  method: HttpMethod;
  routePath: string;
  dryRun: boolean;
}

export interface TemplateContext {
  module: string;
  modulePascal: string;
  name: string;
  pascalName: string;
  camelName: string;
  router: string;
  routerPascal: string;
  method: HttpMethod;
  methodUpper: string;
  routePath: string;
}

export interface PlannedWrite {
  path: string;
  content: string;
  mode: "create" | "update";
}

export interface GenerationPlan {
  request: GenerateRequest;
  writes: PlannedWrite[];
}
