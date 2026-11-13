import { CODE_BLOCK_THEMES } from "../../../../src/codeBlockTypes";
import { isCodeBlockThemeData } from "../../../../src/codeBlockThemeData";
import type {
  CodeBlockMetadata,
  CodeBlockOptions,
} from "../../../../src/codeBlockTypes";

export function getCodeBlockMetadata(image: {
  customData?: Record<string, unknown> | null;
}): CodeBlockMetadata | null {
  const data = image.customData;
  if (
    data?.kind !== "code-block" ||
    data.v !== 1 ||
    typeof data.code !== "string" ||
    typeof data.language !== "string" ||
    !CODE_BLOCK_THEMES.includes(
      data.theme as (typeof CODE_BLOCK_THEMES)[number]
    ) ||
    typeof data.fontSize !== "number" ||
    !Number.isFinite(data.fontSize) ||
    data.fontSize < 6 ||
    data.fontSize > 48 ||
    typeof data.lineNumbers !== "boolean" ||
    typeof data.title !== "string" ||
    typeof data.windowControls !== "boolean" ||
    typeof data.highlightLines !== "string" ||
    (data.scale !== 1 && data.scale !== 2 && data.scale !== 3) ||
    (data.vscodeTheme !== undefined && !isCodeBlockThemeData(data.vscodeTheme))
  ) {
    return null;
  }
  return {
    kind: "code-block",
    v: 1,
    code: data.code,
    language: data.language,
    theme: data.theme as CodeBlockMetadata["theme"],
    fontSize: data.fontSize,
    lineNumbers: data.lineNumbers,
    title: data.title,
    windowControls: data.windowControls,
    highlightLines: data.highlightLines,
    scale: data.scale,
    vscodeTheme: isCodeBlockThemeData(data.vscodeTheme)
      ? data.vscodeTheme
      : undefined,
  };
}

export function toCodeBlockMetadata(options: CodeBlockOptions) {
  return {
    kind: "code-block" as const,
    v: 1 as const,
    ...options,
  };
}
