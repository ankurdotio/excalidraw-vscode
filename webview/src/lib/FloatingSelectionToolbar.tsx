import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  getCommonBounds,
  sceneCoordsToViewportCoords,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { SceneImageElement } from "./imageElements";

type Props = {
  api: ExcalidrawImperativeAPI;
  wrapper: HTMLElement | null;
  kind: "icon" | "code-block";
  children: (images: SceneImageElement[]) => ReactNode;
};

type ToolbarState = {
  images: SceneImageElement[];
  left: number;
  top: number;
};

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

export function FloatingSelectionToolbar({
  api,
  children,
  wrapper,
  kind,
}: Props) {
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const pointerDown = useRef(false);
  const container = wrapper?.querySelector<HTMLElement>(".excalidraw") ?? null;

  const updateToolbar = useCallback(() => {
    if (!container || pointerDown.current) {
      setToolbar(null);
      return;
    }

    const appState = api.getAppState();
    const selectedIds = appState.selectedElementIds ?? {};
    const images = api
      .getSceneElements()
      .filter(
        (element): element is SceneImageElement =>
          !element.isDeleted &&
          selectedIds[element.id] === true &&
          isCustomImage(element) &&
          element.customData?.kind === kind
      );
    if (images.length === 0) {
      setToolbar(null);
      return;
    }

    const [sceneX, sceneY] = getCommonBounds(images);
    const viewport = sceneCoordsToViewportCoords({ sceneX, sceneY }, appState);
    const bounds = container.getBoundingClientRect();
    const left = Math.max(
      4,
      Math.min(viewport.x - bounds.left, bounds.width - 360)
    );
    const top = Math.max(4, viewport.y - bounds.top - 48);

    setToolbar({ images, left, top });
  }, [api, container, kind]);

  useEffect(() => {
    updateToolbar();
    const unsubscribeChange = api.onChange(updateToolbar);
    const unsubscribeScroll = api.onScrollChange(updateToolbar);
    const unsubscribePointerDown = api.onPointerDown(() => {
      pointerDown.current = true;
      setToolbar(null);
    });
    const unsubscribePointerUp = api.onPointerUp(() => {
      pointerDown.current = false;
      updateToolbar();
    });
    window.addEventListener("resize", updateToolbar);
    const observer = new ResizeObserver(updateToolbar);
    if (wrapper) {
      observer.observe(wrapper);
    }
    return () => {
      unsubscribeChange();
      unsubscribeScroll();
      unsubscribePointerDown();
      unsubscribePointerUp();
      window.removeEventListener("resize", updateToolbar);
      observer.disconnect();
    };
  }, [api, updateToolbar, wrapper]);

  if (!toolbar || !container) {
    return null;
  }

  return createPortal(
    <div
      className="studio-selection-toolbar"
      style={{ left: toolbar.left, top: toolbar.top }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {children(toolbar.images)}
    </div>,
    container
  );
}
