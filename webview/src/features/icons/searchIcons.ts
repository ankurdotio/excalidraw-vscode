import type { IconSetId } from "../../../../src/iconTypes";

export type IconSearchEntry = {
  set: IconSetId;
  name: string;
  aliases: string[];
  categories: string[];
};

function matchScore(entry: IconSearchEntry, query: string) {
  const name = entry.name.toLowerCase();
  const aliases = entry.aliases.map((alias) => alias.toLowerCase());
  const categories = entry.categories.map((category) => category.toLowerCase());

  if (name === query) {
    return 0;
  }
  if (aliases.includes(query)) {
    return 1;
  }
  if (name.startsWith(query)) {
    return 2;
  }
  if (aliases.some((alias) => alias.startsWith(query))) {
    return 3;
  }
  if (name.includes(query)) {
    return 4;
  }
  if (aliases.some((alias) => alias.includes(query))) {
    return 5;
  }
  if (categories.some((category) => category.includes(query))) {
    return 6;
  }
  return -1;
}

export function searchIcons(
  entries: readonly IconSearchEntry[],
  query: string,
  enabledSets: readonly IconSetId[],
  setFilter: IconSetId | "all" = "all"
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return entries
    .map((entry) => ({
      entry,
      score: matchScore(entry, normalizedQuery),
    }))
    .filter(
      ({ entry, score }) =>
        score >= 0 &&
        enabledSets.includes(entry.set) &&
        (setFilter === "all" || entry.set === setFilter)
    )
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.entry.name.localeCompare(right.entry.name) ||
        left.entry.set.localeCompare(right.entry.set)
    )
    .map(({ entry }) => entry);
}
