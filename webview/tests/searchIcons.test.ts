import { describe, expect, it } from "vitest";

import { searchIcons } from "../src/features/icons/searchIcons";
import type { IconSearchEntry } from "../src/features/icons/searchIcons";

const entries: IconSearchEntry[] = [
  {
    set: "ri",
    name: "database-2-line",
    aliases: ["database"],
    categories: ["database"],
  },
  {
    set: "feather",
    name: "database",
    aliases: [],
    categories: [],
  },
  {
    set: "tabler",
    name: "user-circle",
    aliases: ["account"],
    categories: ["users"],
  },
  {
    set: "simple-icons",
    name: "docker",
    aliases: [],
    categories: ["development"],
  },
];

describe("searchIcons", () => {
  it("ranks exact matches before prefixes and contains matches", () => {
    expect(
      searchIcons(entries, "database", ["ri", "feather", "tabler", "simple-icons"]).map(
        (entry) => entry.name
      )
    ).toEqual(["database", "database-2-line"]);
  });

  it("matches aliases and categories while honoring enabled-set filters", () => {
    expect(searchIcons(entries, "users", ["tabler"])).toEqual([entries[2]]);
    expect(searchIcons(entries, "docker", ["ri", "feather"])).toEqual([]);
  });
});
