import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { CodeBlockOptions } from "../../../../src/codeBlockTypes";
import { toCodeBlockMetadata } from "./codeBlockModel";
import { getCodeTextBounds } from "./codeLayout";

type SceneElement = ReturnType<
  ExcalidrawImperativeAPI["getSceneElements"]
>[number];

export type CodeTextElement = Extract<SceneElement, { type: "text" }>;
export type CodeSceneElement = Extract<
  SceneElement,
  { type: "text" | "image" }
>;

function toTextElement(
  options: CodeBlockOptions,
  at: { x: number; y: number; angle?: number },
  current?: SceneElement
) {
  const bounds = getCodeTextBounds(options);
  const overrides = {
    x: at.x,
    y: at.y,
    angle: at.angle ?? 0,
    width: bounds.width,
    height: bounds.height,
    text: options.code,
    originalText: options.code,
    fontSize: options.fontSize,
    autoResize: false,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    customData: toCodeBlockMetadata(options),
  };
  if (current?.type === "text") {
    return newElementWith(current, overrides);
  }
  const [element] = convertToExcalidrawElements(
    [
      {
        type: "text",
        id: current?.id as CodeTextElement["id"] | undefined,
        x: at.x,
        y: at.y,
        angle: at.angle ?? 0,
        width: bounds.width,
        height: bounds.height,
        text: options.code,
        originalText: options.code,
        fontSize: options.fontSize,
        fontFamily: 3,
        textAlign: "left",
        verticalAlign: "top",
        autoResize: false,
        strokeColor: "transparent",
        backgroundColor: "transparent",
        customData: toCodeBlockMetadata(options),
        version: current ? current.version + 1 : undefined,
      },
    ],
    { regenerateIds: !current }
  );
  if (!element || element.type !== "text") {
    throw new Error("Failed to create a persistent code text element.");
  }
  return element;
}

export function saveCodeTextElement(
  api: ExcalidrawImperativeAPI,
  options: CodeBlockOptions,
  at: { x: number; y: number; angle?: number },
  current?: SceneElement
) {
  const element = toTextElement(options, at, current);
  const elements = api.getSceneElementsIncludingDeleted();
  api.updateScene({
    elements: current
      ? elements.map((existing) =>
          existing.id === current.id ? element : existing
        )
      : [...elements, element],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return element;
}

export function restoreCodeTextElement(
  api: ExcalidrawImperativeAPI,
  current: SceneElement,
  original: SceneElement | undefined
) {
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map((element) => {
      if (element.id !== current.id) return element;
      if (original?.type === "text" && element.type === "text") {
        return newElementWith(element, {
          text: original.text,
          originalText: original.originalText,
          x: original.x,
          y: original.y,
          width: original.width,
          height: original.height,
          angle: original.angle,
          fontSize: original.fontSize,
          fontFamily: original.fontFamily,
          strokeColor: original.strokeColor,
          backgroundColor: original.backgroundColor,
          customData: original.customData,
        });
      }
      if (original?.type === "image" && element.type === "text") {
        const restored = newElementWith(original, { isDeleted: false });
        return {
          ...restored,
          version: Math.max(restored.version, element.version + 1),
        };
      }
      if (original?.type === "image" && element.type === "image") {
        return newElementWith(element, {
          fileId: original.fileId,
          width: original.width,
          height: original.height,
          customData: original.customData,
          status: original.status,
          isDeleted: false,
        });
      }
      if (element.type === "text")
        return newElementWith(element, { isDeleted: true });
      return element;
    }),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}
