import type { CodeBlockOptions } from "../../../../src/codeBlockTypes";

export const MAX_CODE_BLOCK_WIDTH = 800;

export function getCodeTextBounds(options: CodeBlockOptions) {
  const lines = options.code.replace(/\t/g, "  ").split("\n");
  const gutter = options.lineNumbers
    ? String(lines.length).length * options.fontSize * 0.7 + 16
    : 0;
  return {
    width: Math.min(
      MAX_CODE_BLOCK_WIDTH,
      Math.max(
        380,
        Math.max(...lines.map((line) => line.length * options.fontSize * 0.62)) +
          gutter +
          32
      )
    ),
    height: Math.min(
      520,
      Math.max(80, lines.length * options.fontSize * 1.5 + 24)
    ),
  };
}

export function codeEditorAnchor(image: {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}) {
  const { x, y, width, height, angle } = image;
  return {
    x:
      x +
      width / 2 -
      (width / 2) * Math.cos(angle) -
      (height / 2 + 12) * Math.sin(angle),
    y:
      y +
      height / 2 -
      (width / 2) * Math.sin(angle) +
      (height / 2 + 12) * Math.cos(angle),
    width,
    angle,
  };
}
