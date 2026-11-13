import { describe, expect, it } from "vitest";
import {
  isCodeBlockThemeData,
  parseThemeJson,
  themeColors,
  themeTokenRules,
} from "../../src/codeBlockThemeData";

describe("VS Code theme data", () => {
  it("parses JSONC without changing comments or commas inside strings", () => {
    expect(
      parseThemeJson(`{
      // VS Code themes allow comments and trailing commas.
      "include": "./base.json",
      "url": "https://example.test/a/*literal*/,}",
      "colors": { "editor.foreground": "#abcdef", },
      /* inherited rules */
      "tokenColors": [],
    }`)
    ).toEqual({
      include: "./base.json",
      url: "https://example.test/a/*literal*/,}",
      colors: { "editor.foreground": "#abcdef" },
      tokenColors: [],
    });
    expect(() => parseThemeJson("[]")).toThrow("JSON object");
    expect(() => parseThemeJson('{"colors":')).toThrow();
  });

  it("keeps scoped font/color rules and validates snapshots from saved files", () => {
    const snapshot = {
      name: "Custom Theme",
      type: "dark",
      colors: themeColors({ "editor.foreground": "#abcdef", invalid: 42 }),
      settings: themeTokenRules([
        {
          scope: ["keyword", "storage"],
          settings: { foreground: "#ff0000", fontStyle: "bold italic" },
        },
        { scope: 42, settings: { foreground: "#000000" } },
      ]),
    };
    expect(snapshot.settings).toEqual([
      {
        scope: ["keyword", "storage"],
        settings: { foreground: "#ff0000", fontStyle: "bold italic" },
      },
    ]);
    expect(isCodeBlockThemeData(snapshot)).toBe(true);
    expect(
      isCodeBlockThemeData({ ...snapshot, settings: [{ settings: null }] })
    ).toBe(false);
    expect(
      isCodeBlockThemeData({ ...snapshot, colors: { foreground: 42 } })
    ).toBe(false);
  });
});
