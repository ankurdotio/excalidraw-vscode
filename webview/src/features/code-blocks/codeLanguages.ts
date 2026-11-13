import { languages } from "@codemirror/language-data";

export const COMMON_LANGUAGES = [
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["jsx", "JSX"],
  ["tsx", "TSX"],
  ["json", "JSON"],
  ["html", "HTML"],
  ["css", "CSS"],
  ["scss", "SCSS"],
  ["python", "Python"],
  ["java", "Java"],
  ["c", "C"],
  ["cpp", "C++"],
  ["csharp", "C#"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["php", "PHP"],
  ["ruby", "Ruby"],
  ["kotlin", "Kotlin"],
  ["swift", "Swift"],
  ["sql", "SQL"],
  ["bash", "Bash"],
  ["powershell", "PowerShell"],
  ["yaml", "YAML"],
  ["toml", "TOML"],
  ["markdown", "Markdown"],
  ["dockerfile", "Dockerfile"],
  ["graphql", "GraphQL"],
  ["diff", "Diff"],
  ["text", "Plain text"],
] as const;

const COMMON_IDS = new Set<string>(COMMON_LANGUAGES.map(([id]) => id));

function displayLanguage(id: string) {
  const description = languages.find(
    (language) =>
      language.name.toLowerCase() === id ||
      language.alias.some((alias) => alias.toLowerCase() === id)
  );
  return description?.name ?? id.replace(/[-_]/g, " ");
}

export function createLanguageOptions(shikiLanguageIds: readonly string[]) {
  const common = COMMON_LANGUAGES.filter(
    ([id]) => shikiLanguageIds.includes(id) || id === "text"
  ).map(([id, label]) => ({ id, label }));
  const additional = shikiLanguageIds
    .filter((id) => !COMMON_IDS.has(id) && /^[a-z0-9][a-z0-9-]*$/.test(id))
    .map((id) => ({ id, label: displayLanguage(id) }))
    .sort((left, right) => left.label.localeCompare(right.label));
  return [...common, ...additional];
}

export function getCodeMirrorLanguage(language: string) {
  if (language === "text") {
    return undefined;
  }
  return languages.find(
    (description) =>
      description.name.toLowerCase() === language ||
      description.alias.some((alias) => alias.toLowerCase() === language)
  );
}
