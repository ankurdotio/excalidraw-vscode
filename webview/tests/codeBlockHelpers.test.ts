import { describe, expect, it } from "vitest";

import {
  codeEditorAnchor,
  getCodeTextBounds,
} from "../src/features/code-blocks/codeLayout";
import { parseHighlightLines } from "../src/features/code-blocks/highlightLines";
import { createLanguageOptions } from "../src/features/code-blocks/codeLanguages";

describe("parseHighlightLines", () => {
  it("expands and deduplicates individual lines and ranges", () => {
    expect(parseHighlightLines("3, 5-7, 6", 9)).toEqual([3, 5, 6, 7]);
  });

  it("rejects malformed, reversed and out-of-document ranges", () => {
    expect(() => parseHighlightLines("3, nope", 9)).toThrow(
      "Invalid highlighted line range"
    );
    expect(() => parseHighlightLines("7-5", 9)).toThrow(RangeError);
    expect(() => parseHighlightLines("1-4", 3)).toThrow(RangeError);
  });

  it("treats an empty input as no highlighted lines", () => {
    expect(parseHighlightLines("  ", 1)).toEqual([]);
  });
});

describe("codeEditorAnchor", () => {
  it("places legacy image editing below the image", () => {
    const image = { x: 100, y: 200, width: 300, height: 80, angle: 0 };
    expect(codeEditorAnchor(image)).toEqual({
      x: 100,
      y: 292,
      width: 300,
      angle: 0,
    });
    expect(codeEditorAnchor({ ...image, height: 180 }).y).toBe(392);
  });

  it("follows the rotated bottom-left corner", () => {
    const anchor = codeEditorAnchor({
      x: 100,
      y: 200,
      width: 300,
      height: 80,
      angle: Math.PI / 2,
    });
    expect(anchor.x).toBeCloseTo(198);
    expect(anchor.y).toBeCloseTo(90);
    expect(anchor.angle).toBe(Math.PI / 2);
  });
});

describe("getCodeTextBounds", () => {
  const options = {
    code: "short\nlonger line",
    language: "javascript",
    theme: "dark-plus",
    fontSize: 16,
    lineNumbers: true,
    title: "",
    windowControls: false,
    highlightLines: "",
    scale: 3,
  };

  it("sizes text elements using source lines and line numbers", () => {
    const bounds = getCodeTextBounds(options);
    expect(bounds.height).toBe(80);
    expect(bounds.width).toBe(380);
  });

  it("bounds long lines and large pastes so their contents can scroll", () => {
    const longLine = "x".repeat(4000);
    expect(getCodeTextBounds({ ...options, code: longLine })).toEqual({
      width: 800,
      height: 80,
    });
    expect(
      getCodeTextBounds({
        ...options,
        code: Array.from({ length: 151 }, () => longLine).join("\n"),
      })
    ).toEqual({ width: 800, height: 520 });
  });
});

describe("createLanguageOptions", () => {
  it("places the common language list first and adds other Shiki grammars", () => {
    const options = createLanguageOptions(["text", "javascript", "zig"]);
    expect(options.slice(0, 2).map((option) => option.id)).toEqual([
      "javascript",
      "text",
    ]);
    expect(options.at(-1)).toEqual({ id: "zig", label: "zig" });
  });
});
