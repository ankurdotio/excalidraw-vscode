import * as vscode from "vscode";
import type { CodeBlockThemeData } from "./codeBlockTypes";
import {
  parseThemeJson,
  themeColors,
  themeTokenRules,
} from "./codeBlockThemeData";

export async function readVSCodeTheme(): Promise<CodeBlockThemeData> {
  const configuration = vscode.workspace.getConfiguration();
  const name = configuration.get<string>("workbench.colorTheme", "");
  const dark =
    vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
    vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
  const theme: CodeBlockThemeData = {
    name,
    type: dark ? "dark" : "light",
    colors: {},
    settings: [],
  };
  let themeUri: vscode.Uri | undefined;
  for (const extension of vscode.extensions.all) {
    const contributions = extension.packageJSON.contributes?.themes as
      | { id?: string; label?: string; path: string }[]
      | undefined;
    const contribution = contributions?.find(
      (item) => item.id === name || item.label === name
    );
    if (contribution) {
      themeUri = vscode.Uri.joinPath(extension.extensionUri, contribution.path);
      break;
    }
  }
  if (!themeUri) {
    throw new Error(`The active color theme "${name}" could not be located.`);
  }

  const visited = new Set<string>();
  const load = async (uri: vscode.Uri): Promise<void> => {
    if (visited.has(uri.toString()) || visited.size >= 20) {
      throw new Error("The color theme has a circular or overly deep include.");
    }
    visited.add(uri.toString());
    const data = parseThemeJson(
      new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))
    );
    if (typeof data.include === "string") {
      await load(vscode.Uri.joinPath(uri, "..", data.include));
    }
    if (typeof data.tokenColors === "string") {
      throw new Error("External TextMate theme files are not supported.");
    }
    Object.assign(theme.colors, themeColors(data.colors));
    theme.settings.push(...themeTokenRules(data.tokenColors));
  };
  await load(themeUri);

  const scoped = (value: Record<string, unknown>) => {
    const override = value[`[${name}]`];
    return {
      ...value,
      ...(override && typeof override === "object" ? override : {}),
    };
  };
  Object.assign(
    theme.colors,
    themeColors(scoped(configuration.get("workbench.colorCustomizations", {})))
  );
  const customTokens = scoped(
    configuration.get<Record<string, unknown>>(
      "editor.tokenColorCustomizations",
      {}
    )
  );
  const scopes: Record<string, string> = {
    comments: "comment",
    strings: "string",
    keywords: "keyword",
    numbers: "constant.numeric",
    types: "entity.name.type",
    functions: "entity.name.function",
    variables: "variable",
  };
  for (const [key, scope] of Object.entries(scopes)) {
    const value = customTokens[key];
    if (typeof value === "string") {
      theme.settings.push({ scope, settings: { foreground: value } });
    } else if (value && typeof value === "object") {
      theme.settings.push({ scope, settings: themeColors(value) });
    }
  }
  theme.settings.push(...themeTokenRules(customTokens.textMateRules));
  return theme;
}
