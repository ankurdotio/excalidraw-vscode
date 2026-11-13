import { viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { SceneImageElement } from "./imageElements";

type SceneElement = ReturnType<
  ExcalidrawImperativeAPI["getSceneElements"]
>[number];

function isCustomImage(element: SceneElement): element is SceneImageElement {
  return (
    element.type === "image" &&
    (element.customData?.kind === "icon" ||
      element.customData?.kind === "code-block")
  );
}

export function isPointInsideImage(
  image: SceneImageElement,
  point: { x: number; y: number }
) {
  const centerX = image.x + image.width / 2;
  const centerY = image.y + image.height / 2;
  const angle = -(image.angle ?? 0);
  const deltaX = point.x - centerX;
  const deltaY = point.y - centerY;
  const rotatedX = deltaX * Math.cos(angle) - deltaY * Math.sin(angle);
  const rotatedY = deltaX * Math.sin(angle) + deltaY * Math.cos(angle);
  return (
    Math.abs(rotatedX) <= image.width / 2 &&
    Math.abs(rotatedY) <= image.height / 2
  );
}

function getSelectedCustomImages(api: ExcalidrawImperativeAPI) {
  const selectedIds = api.getAppState().selectedElementIds ?? {};
  return api
    .getSceneElements()
    .filter(
      (element): element is SceneImageElement =>
        !element.isDeleted &&
        selectedIds[element.id] === true &&
        isCustomImage(element)
    );
}

export function installCustomImageEditing(
  wrapper: HTMLElement,
  api: ExcalidrawImperativeAPI,
  isViewOnly: () => boolean,
  onEdit: (image: SceneImageElement) => boolean
) {
  const openSelected = () => {
    if (isViewOnly()) {
      return false;
    }
    const selected = getSelectedCustomImages(api);
    if (
      selected.length !== 1 ||
      Object.keys(api.getAppState().selectedElementIds).length !== 1
    ) {
      return false;
    }
    return onEdit(selected[0]);
  };

  const onDoubleClick = (event: MouseEvent) => {
    if (isViewOnly()) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest(
        ".studio-icon-library, .studio-selection-toolbar, .studio-code-inline"
      )
    ) {
      return;
    }
    const appState = api.getAppState();
    const point = viewportCoordsToSceneCoords(
      { clientX: event.clientX, clientY: event.clientY },
      appState
    );
    const hit = getSelectedCustomImages(api)
      .reverse()
      .find((image) => isPointInsideImage(image, point));
    if (!hit) {
      return;
    }
    if (onEdit(hit)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.key !== "Enter" ||
      (event.target instanceof HTMLElement &&
        event.target.closest(
          "input, textarea, select, button, a, [contenteditable='true']"
        ))
    ) {
      return;
    }
    if (openSelected()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  wrapper.addEventListener("dblclick", onDoubleClick, true);
  wrapper.addEventListener("keydown", onKeyDown, true);
  return () => {
    wrapper.removeEventListener("dblclick", onDoubleClick, true);
    wrapper.removeEventListener("keydown", onKeyDown, true);
  };
}
