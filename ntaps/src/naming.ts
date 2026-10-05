export function kebab(value: string, label: string): string {
  const result = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  if (!result || !/^[a-z][a-z0-9-]*$/.test(result)) {
    throw new Error(`${label} must start with a letter and contain only letters, numbers, or dashes`);
  }
  return result;
}

export function pascal(value: string): string {
  return value.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");
}

export function camel(value: string): string {
  const valuePascal = pascal(value);
  return `${valuePascal[0]?.toLowerCase() ?? ""}${valuePascal.slice(1)}`;
}

export function normalizeRoutePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) throw new Error("route path must start with /");
  if (trimmed.length > 1 && trimmed.endsWith("/")) return trimmed.slice(0, -1);
  return trimmed;
}
