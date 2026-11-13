import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, RefObject } from "react";
import { Sidebar, viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  IconPreferences,
  IconReference,
  IconSettings,
} from "../../../../src/iconTypes";
import { vscode } from "../../vscode";
import { FloatingSelectionToolbar } from "../../lib/FloatingSelectionToolbar";
import { installCustomImageEditing } from "../../lib/customImageEditing";
import {
  insertImageElement,
  replaceImageOfElement,
  replaceImageElements,
  resizeImageElements,
} from "../../lib/imageElements";
import type { SceneImageElement } from "../../lib/imageElements";
import { IconLibrary } from "./IconLibrary";
import { IconSelectionToolbar } from "./IconSelectionToolbar";
import { makeIconAsset } from "./iconData";
import { ICON_SET_BY_ID } from "./iconSets";
import {
  getIconMetadata,
  ICON_DRAG_TYPE,
  parseIconDragPayload,
} from "./iconModel";
import type { IconOptions } from "./iconModel";

type Props = {
  api?: ExcalidrawImperativeAPI;
  wrapperRef: RefObject<HTMLDivElement>;
  viewOnly: boolean;
  initialSettings: IconSettings;
  initialPreferences: IconPreferences;
};

type HostMessage =
  | { type: "toggle-icon-panel" }
  | { type: "icons-settings-change"; iconSettings: IconSettings }
  | { type: "icon-preferences-change"; preferences: IconPreferences };

function reportError(action: string, error: unknown) {
  vscode.postMessage({
    type: "error",
    content: `Unable to ${action}: ${
      error instanceof Error ? error.message : String(error)
    }`,
  });
}

export function useIconLibrary({
  api,
  wrapperRef,
  viewOnly,
  initialSettings,
  initialPreferences,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [preferences, setPreferences] = useState(initialPreferences);
  const preferencesRef = useRef(initialPreferences);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<SceneImageElement | null>(null);

  const persistPreferences = useCallback((next: IconPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    vscode.postMessage({ type: "icon-preferences-change", preferences: next });
  }, []);

  const recordRecent = useCallback(
    (entry: IconReference) => {
      const current = preferencesRef.current;
      const reference = { set: entry.set, name: entry.name };
      persistPreferences({
        ...current,
        recent: [
          reference,
          ...current.recent.filter(
            (item) => item.set !== entry.set || item.name !== entry.name
          ),
        ].slice(0, 24),
      });
    },
    [persistPreferences]
  );

  useEffect(() => {
    const listener = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === "icons-settings-change") {
        setSettings(message.iconSettings);
      } else if (message.type === "icon-preferences-change") {
        preferencesRef.current = message.preferences;
        setPreferences(message.preferences);
      } else if (message.type === "toggle-icon-panel" && !viewOnly) {
        setTarget(null);
        api?.toggleSidebar({ name: "icons", tab: "icons" });
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [api, viewOnly]);

  const openEditor = useCallback(
    (image: SceneImageElement) => {
      if (!api || viewOnly || !getIconMetadata(image)) {
        return false;
      }
      setTarget(image);
      api.toggleSidebar({ name: "icons", tab: "icons", force: true });
      return true;
    },
    [api, viewOnly]
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !api || viewOnly) {
      return;
    }
    return installCustomImageEditing(wrapper, api, () => viewOnly, openEditor);
  }, [api, openEditor, viewOnly, wrapperRef]);

  const insert = useCallback(
    async (
      entry: IconReference,
      options: IconOptions,
      center?: { x: number; y: number }
    ) => {
      if (!api || viewOnly) {
        return;
      }
      try {
        if (!settings.enabledSets.includes(entry.set)) {
          throw new Error("This icon set is disabled in extension settings.");
        }
        const asset = await makeIconAsset(entry, options);
        const state = api.getAppState();
        const point =
          center ??
          viewportCoordsToSceneCoords(
            {
              clientX: state.offsetLeft + state.width / 2,
              clientY: state.offsetTop + state.height / 2,
            },
            state
          );
        insertImageElement(api, {
          ...asset,
          mimeType: "image/svg+xml",
          customData: {
            kind: "icon",
            v: 1,
            set: entry.set,
            name: entry.name,
            color: options.color,
            strokeWidth: options.strokeWidth,
          },
          at: { x: point.x - asset.width / 2, y: point.y - asset.height / 2 },
        });
        recordRecent(entry);
      } catch (error) {
        reportError("insert icon", error);
      }
    },
    [api, recordRecent, settings.enabledSets, viewOnly]
  );

  const replace = useCallback(
    async (entry: IconReference, options: IconOptions, keepSize: boolean) => {
      if (!api || !target || viewOnly) {
        return;
      }
      try {
        const current = api
          .getSceneElements()
          .find(
            (element) => element.id === target.id && element.type === "image"
          );
        if (!current) {
          throw new Error("The selected icon no longer exists.");
        }
        const asset = await makeIconAsset(entry, options);
        replaceImageOfElement(api, current.id, {
          ...asset,
          width: keepSize ? current.width : asset.width,
          height: keepSize ? current.height : asset.height,
          mimeType: "image/svg+xml",
          customData: {
            kind: "icon",
            v: 1,
            set: entry.set,
            name: entry.name,
            color: options.color,
            strokeWidth: options.strokeWidth,
          },
        });
        recordRecent(entry);
        api.toggleSidebar({ name: "icons", tab: "icons", force: false });
      } catch (error) {
        reportError("edit icon", error);
      }
    },
    [api, recordRecent, target, viewOnly]
  );

  const updateSelected = useCallback(
    async (
      images: SceneImageElement[],
      update: { color?: string; strokeWidth?: number }
    ) => {
      if (!api || viewOnly) {
        return;
      }
      try {
        const results = await Promise.all(
          images.map(async (image) => {
            const icon = getIconMetadata(image);
            if (
              !icon ||
              (update.strokeWidth !== undefined &&
                ICON_SET_BY_ID[icon.set].style !== "stroke")
            ) {
              return null;
            }
            const color = update.color ?? icon.color;
            const strokeWidth = update.strokeWidth ?? icon.strokeWidth;
            const asset = await makeIconAsset(icon, {
              color,
              strokeWidth,
              size: Math.max(image.width, image.height),
            });
            return {
              elementId: image.id,
              ...asset,
              width: image.width,
              height: image.height,
              mimeType: "image/svg+xml" as const,
              customData: { ...image.customData, color, strokeWidth },
            };
          })
        );
        const replacements = results.filter((result) => result !== null);
        if (replacements.length && !replaceImageElements(api, replacements)) {
          throw new Error("The selected icons no longer exist.");
        }
      } catch (error) {
        reportError("update selected icons", error);
      }
    },
    [api, viewOnly]
  );

  const resizeSelected = useCallback(
    (images: SceneImageElement[], size: number) => {
      if (!api || viewOnly) {
        return;
      }
      resizeImageElements(
        api,
        images.map((image) => {
          const maximum = Math.max(image.width, image.height);
          return {
            elementId: image.id,
            width: (size * image.width) / maximum,
            height: (size * image.height) / maximum,
          };
        })
      );
    },
    [api, viewOnly]
  );

  const acceptsDrop = (event: DragEvent) =>
    !viewOnly &&
    event.dataTransfer.types.includes(ICON_DRAG_TYPE) &&
    !(
      event.target instanceof Element &&
      event.target.closest(".studio-icon-sidebar")
    );

  const onDragOver = (event: DragEvent) => {
    if (acceptsDrop(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    }
  };
  const onDrop = (event: DragEvent) => {
    if (!acceptsDrop(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    try {
      if (!api) {
        throw new Error("The Excalidraw scene is not ready.");
      }
      const payload = parseIconDragPayload(
        event.dataTransfer.getData(ICON_DRAG_TYPE)
      );
      const point = viewportCoordsToSceneCoords(
        {
          clientX: event.clientX,
          clientY: event.clientY,
        },
        api.getAppState()
      );
      void insert(payload.entry, payload.options, point);
    } catch (error) {
      reportError("insert dragged icon", error);
    }
  };

  const metadata = target ? getIconMetadata(target) : null;
  return {
    onDragOver,
    onDrop,
    trigger: viewOnly ? null : (
      <Sidebar.Trigger
        name="icons"
        tab="icons"
        title="Open icon library"
        icon={
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        }
      >
        Icons
      </Sidebar.Trigger>
    ),
    sidebar: viewOnly ? null : (
      <Sidebar
        name="icons"
        className="studio-icon-sidebar"
        onStateChange={(state) => {
          setOpen(state?.name === "icons");
          if (state?.name !== "icons") {
            setTarget(null);
          }
        }}
      >
        <Sidebar.Header>
          <strong>{target ? "Edit icon" : "Icon library"}</strong>
        </Sidebar.Header>
        <div className="studio-icon-sidebar-content">
          <IconLibrary
            open={open}
            selectedIcon={metadata ?? undefined}
            selectedOptions={
              target && metadata
                ? {
                    color: metadata.color,
                    strokeWidth: metadata.strokeWidth,
                    size: Math.max(target.width, target.height),
                  }
                : undefined
            }
            settings={settings}
            preferences={preferences}
            currentColor={
              api?.getAppState().currentItemStrokeColor ?? "#1e1e1e"
            }
            onPreferencesChange={persistPreferences}
            onApply={
              target && metadata
                ? (options) => void replace(metadata, options, false)
                : undefined
            }
            onChoose={(entry, options) => {
              if (target) {
                void replace(entry, options, true);
              } else {
                void insert(entry, options);
              }
            }}
          />
        </div>
      </Sidebar>
    ),
    toolbar:
      api && !viewOnly ? (
        <FloatingSelectionToolbar
          api={api}
          wrapper={wrapperRef.current}
          kind="icon"
        >
          {(images) => (
            <IconSelectionToolbar
              images={images}
              onColorChange={(selected, color) =>
                void updateSelected(selected, { color })
              }
              onSizeChange={resizeSelected}
              onStrokeWidthChange={(selected, strokeWidth) =>
                void updateSelected(selected, { strokeWidth })
              }
              onReplace={openEditor}
            />
          )}
        </FloatingSelectionToolbar>
      ) : null,
  };
}
