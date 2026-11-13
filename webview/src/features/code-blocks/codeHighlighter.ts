import { createHighlighterCore } from "shiki/core";
import type { LanguageRegistration, ThemeRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { CodeBlockOptions } from "../../../../src/codeBlockTypes";

const languageModules = import.meta.glob<LanguageRegistration>(
  "../../../node_modules/shiki/dist/langs/*.mjs",
  { import: "default" }
);
const themeModules = import.meta.glob<ThemeRegistration>(
  "../../../node_modules/shiki/dist/themes/*.mjs",
  { import: "default" }
);
const moduleId = (path: string) => path.slice(path.lastIndexOf("/") + 1, -4);
const languageLoaders = new Map(
  Object.entries(languageModules).map(([path, load]) => [moduleId(path), load])
);
const themeLoaders = new Map(
  Object.entries(themeModules).map(([path, load]) => [moduleId(path), load])
);
export const SHIKI_LANGUAGE_IDS = [...languageLoaders.keys()].sort();
const highlighterPromise = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  themes: [],
  langs: [],
});

export async function highlightCode(
  code: string,
  options: Pick<CodeBlockOptions, "language" | "theme" | "vscodeTheme">
) {
  const highlighter = await highlighterPromise;
  const languageLoader = languageLoaders.get(options.language);
  if (options.language !== "text") {
    if (!languageLoader) {
      throw new Error(`Language "${options.language}" is not bundled.`);
    }
    if (!highlighter.getLoadedLanguages().includes(options.language)) {
      await highlighter.loadLanguage(await languageLoader());
    }
  }
  let themeName: string = options.theme;
  if (options.vscodeTheme) {
    const snapshot = JSON.stringify(options.vscodeTheme);
    let hash = 0;
    for (let index = 0; index < snapshot.length; index++) {
      hash = (Math.imul(hash, 31) + snapshot.charCodeAt(index)) | 0;
    }
    themeName = `vscode-${hash >>> 0}`;
    if (!highlighter.getLoadedThemes().includes(themeName)) {
      await highlighter.loadTheme({ ...options.vscodeTheme, name: themeName });
    }
  } else if (!highlighter.getLoadedThemes().includes(themeName)) {
    const loader = themeLoaders.get(themeName);
    if (!loader) {
      throw new Error(`Theme "${themeName}" is not bundled.`);
    }
    await highlighter.loadTheme(await loader());
  }
  return {
    ...highlighter.codeToTokens(code, {
      lang: options.language,
      theme: themeName,
    }),
    theme: highlighter.getTheme(themeName),
  };
}
