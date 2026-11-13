import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";
import type {
  BinaryFileData,
  DataURL,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

type SceneElement = ReturnType<
  ExcalidrawImperativeAPI["getSceneElements"]
>[number];

export type SceneImageElement = Extract<SceneElement, { type: "image" }>;

export type ImageElementOptions = {
  dataURL: string;
  mimeType: BinaryFileData["mimeType"];
  width: number;
  height: number;
  customData?: Record<string, unknown>;
};

export type ScenePoint = {
  x: number;
  y: number;
};

export type ImageReplacement = ImageElementOptions & {
  elementId: string;
};

function validateDimensions(width: number, height: number) {
  if (
    !Number.isFinite(width) || width <= 0 ||
    !Number.isFinite(height) || height <= 0
  ) {
    throw new Error("Image dimensions must be positive finite numbers.");
  }
}

function addImageFile(
  api: ExcalidrawImperativeAPI,
  dataURL: string,
  mimeType: BinaryFileData["mimeType"]
) {
  const fileId = crypto.randomUUID() as BinaryFileData["id"];
  api.addFiles([
    {
      id: fileId,
      dataURL: dataURL as DataURL,
      mimeType,
      created: Date.now(),
    },
  ]);
  return fileId;
}

export function insertImageElement(
  api: ExcalidrawImperativeAPI,
  options: ImageElementOptions & { at: ScenePoint; select?: boolean }
) {
  validateDimensions(options.width, options.height);
  const fileId = addImageFile(api, options.dataURL, options.mimeType);
  const [element] = convertToExcalidrawElements(
    [
      {
        type: "image",
        x: options.at.x,
        y: options.at.y,
        width: options.width,
        height: options.height,
        fileId,
        status: "saved",
        scale: [1, 1],
        crop: null,
        customData: options.customData,
      },
    ],
    { regenerateIds: true }
  );

  if (!element || element.type !== "image") {
    throw new Error("Failed to create an Excalidraw image element.");
  }

  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), element],
    appState:
      options.select === false
        ? undefined
        : { selectedElementIds: { [element.id]: true } },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return element;
}

export function replaceImageOfElement(
  api: ExcalidrawImperativeAPI,
  elementId: string,
  options: ImageElementOptions
) {
  return replaceImageElements(api, [{ ...options, elementId }]);
}

export function replaceImageElements(
  api: ExcalidrawImperativeAPI,
  replacements: ImageReplacement[]
) {
  if (replacements.length === 0) {
    return false;
  }

  const elements = api.getSceneElements();
  const currentById = new Map(
    elements
      .filter(
      (element): element is SceneImageElement =>
        element.type === "image" &&
        replacements.some(
          (replacement) => replacement.elementId === element.id
        )
      )
      .map((element) => [element.id, element])
  );
  if (currentById.size !== replacements.length) {
    throw new Error("An image to replace is missing or repeated.");
  }
  for (const options of replacements) {
    validateDimensions(options.width, options.height);
  }

  const replacementById = new Map<string, SceneImageElement>();
  for (const options of replacements) {
    const current = currentById.get(options.elementId);
    if (!current) {
      throw new Error("The image to replace no longer exists.");
    }
    const fileId = addImageFile(api, options.dataURL, options.mimeType);
    replacementById.set(
      options.elementId,
      newElementWith(current, {
        fileId,
        status: "saved",
        width: options.width,
        height: options.height,
        customData: options.customData,
      })
    );
  }

  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map((element) =>
      replacementById.get(element.id) ?? element
    ),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return true;
}

export function resizeImageElements(
  api: ExcalidrawImperativeAPI,
  updates: Array<{ elementId: string; width: number; height: number }>
) {
  for (const update of updates) {
    validateDimensions(update.width, update.height);
  }
  const elements = api.getSceneElementsIncludingDeleted();
  const updatesById = new Map(
    updates.map((update) => [update.elementId, update])
  );
  const updatedElements = elements.map((element) => {
    const update = updatesById.get(element.id);
    if (!update || element.type !== "image") {
      return element;
    }
    return newElementWith(element, {
      width: update.width,
      height: update.height,
    });
  });

  if (updatedElements.every((element, index) => element === elements[index])) {
    return false;
  }
  api.updateScene({
    elements: updatedElements,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return true;
}
