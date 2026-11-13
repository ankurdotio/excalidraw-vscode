import type { CodeBlockThemeData } from "./codeBlockTypes";

export function parseThemeJson(content: string): Record<string, unknown> {
  const withoutComments = content.replace(
    /("(?:\\.|[^"\\])*")|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g,
    (_match, quoted: string | undefined) => quoted ?? " "
  );
  const value: unknown = JSON.parse(
    withoutComments.replace(
      /("(?:\\.|[^"\\])*")|,(\s*[}\]])/g,
      (match, quoted: string | undefined, closing: string | undefined) =>
        quoted ?? closing ?? match
    )
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A VS Code color theme must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

export function themeColors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

export function themeTokenRules(
  value: unknown
): CodeBlockThemeData["settings"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((rule: unknown) => {
    if (!rule || typeof rule !== "object" || !("settings" in rule)) {
      return [];
    }
    const settings = themeColors(rule.settings);
    const scope = "scope" in rule ? rule.scope : undefined;
    if (
      scope !== undefined &&
      typeof scope !== "string" &&
      !(Array.isArray(scope) && scope.every((item) => typeof item === "string"))
    ) {
      return [];
    }
    return [{ scope, settings }];
  });
}

export function isCodeBlockThemeData(
  value: unknown
): value is CodeBlockThemeData {
  if (!value || typeof value !== "object") {
    return false;
  }
  const theme = value as Partial<CodeBlockThemeData>;
  return (
    typeof theme.name === "string" &&
    (theme.type === "light" || theme.type === "dark") &&
    Boolean(
      theme.colors &&
        typeof theme.colors === "object" &&
        !Array.isArray(theme.colors)
    ) &&
    Object.values(theme.colors ?? {}).every(
      (color) => typeof color === "string"
    ) &&
    Array.isArray(theme.settings) &&
    theme.settings.every(
      (rule) =>
        rule &&
        typeof rule === "object" &&
        rule.settings &&
        typeof rule.settings === "object" &&
        !Array.isArray(rule.settings) &&
        Object.values(rule.settings).every(
          (setting) => typeof setting === "string"
        ) &&
        (rule.scope === undefined ||
          typeof rule.scope === "string" ||
          (Array.isArray(rule.scope) &&
            rule.scope.every((scope) => typeof scope === "string")))
    )
  );
}
