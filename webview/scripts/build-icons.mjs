import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "../..");
const registryPath = path.join(projectDirectory, "src/iconSets.json");
const outputDirectory = path.join(projectDirectory, "webview/public/icons");
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const searchEntries = [];

await mkdir(outputDirectory, { recursive: true });

for (const [setId, definition] of Object.entries(registry)) {
  const { icons } = await import(definition.packageName);
  const aliasesByParent = new Map();
  for (const [alias, data] of Object.entries(icons.aliases ?? {})) {
    const aliases = aliasesByParent.get(data.parent) ?? [];
    aliases.push(alias);
    aliasesByParent.set(data.parent, aliases);
  }

  const categoriesByIcon = new Map();
  for (const [category, names] of Object.entries(icons.categories ?? {})) {
    for (const name of names) {
      const categories = categoriesByIcon.get(name) ?? [];
      categories.push(category);
      categoriesByIcon.set(name, categories);
    }
  }

  for (const name of Object.keys(icons.icons)) {
    searchEntries.push({
      set: setId,
      name,
      aliases: aliasesByParent.get(name) ?? [],
      categories: categoriesByIcon.get(name) ?? [],
    });
  }

  await writeFile(
    path.join(outputDirectory, `${setId}.json`),
    JSON.stringify(icons)
  );
}

await writeFile(
  path.join(outputDirectory, "index.json"),
  JSON.stringify({ icons: searchEntries })
);
