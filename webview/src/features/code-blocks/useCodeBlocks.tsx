import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  CodeBlockMetadata,
  CodeBlockOptions,
  CodeBlockPreferences,
  CodeBlockSettings,
} from "../../../../src/codeBlockTypes";
import { vscode } from "../../vscode";
import { InlineCodeEditor } from "./InlineCodeEditor";
import { getCodeBlockMetadata } from "./codeBlockModel";
import { restoreCodeTextElement, saveCodeTextElement } from "./codeElements";
import type { CodeSceneElement } from "./codeElements";
import {
  codeEditorAnchor,
  getCodeTextBounds,
  MAX_CODE_BLOCK_WIDTH,
} from "./codeLayout";

type Props = {
  api?: ExcalidrawImperativeAPI;
  wrapperRef: RefObject<HTMLDivElement>;
  viewOnly: boolean;
  initialSettings: CodeBlockSettings;
  initialPreferences?: CodeBlockPreferences;
};

type HostMessage =
  | { type: "open-code-block" }
  | { type: "code-block-settings-change"; settings: CodeBlockSettings }
  | {
      type: "code-block-preferences-change";
      preferences?: CodeBlockPreferences;
    };

function getOptions(
  settings: CodeBlockSettings,
  preferences: CodeBlockPreferences | undefined,
  metadata?: CodeBlockMetadata
): CodeBlockOptions {
  return {
    code: metadata?.code ?? "",
    language:
      metadata?.language ?? preferences?.language ?? settings.defaultLanguage,
    theme: settings.defaultTheme,
    vscodeTheme: settings.vscodeTheme,
    fontSize: metadata?.fontSize ?? settings.fontSize,
    lineNumbers: metadata?.lineNumbers ?? settings.showLineNumbers,
    title: metadata?.title ?? "",
    windowControls: metadata?.windowControls ?? settings.windowControls,
    highlightLines: metadata?.highlightLines ?? "",
    scale: metadata?.scale ?? 3,
  };
}

function isCodeElement(
  element: ReturnType<ExcalidrawImperativeAPI["getSceneElements"]>[number]
): element is CodeSceneElement {
  return (
    (element.type === "text" || element.type === "image") &&
    getCodeBlockMetadata(element) !== null
  );
}

function containsPoint(
  element: CodeSceneElement,
  point: { x: number; y: number }
) {
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const angle = -(element.angle ?? 0);
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  return (
    Math.abs(dx * Math.cos(angle) - dy * Math.sin(angle)) <=
      element.width / 2 &&
    Math.abs(dx * Math.sin(angle) + dy * Math.cos(angle)) <= element.height / 2
  );
}

export function useCodeBlocks({
  api,
  wrapperRef,
  viewOnly,
  initialSettings,
  initialPreferences,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const preferencesRef = useRef(initialPreferences);
  const [elements, setElements] = useState<CodeSceneElement[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const baselines = useRef(new Map<string, CodeSceneElement | undefined>());
  const transient = useRef(new Set<string>());
  const container =
    wrapperRef.current?.querySelector<HTMLElement>(".excalidraw");

  const refreshElements = useCallback(() => {
    if (!api) {
      setElements([]);
      return;
    }
    const next = api
      .getSceneElements()
      .filter(isCodeElement)
      .map((element) => ({ ...element }));
    setElements((current) =>
      current.length === next.length &&
      current.every(
        (element, index) =>
          element.id === next[index].id &&
          element.version === next[index].version &&
          element.x === next[index].x &&
          element.y === next[index].y &&
          element.width === next[index].width &&
          element.height === next[index].height &&
          element.angle === next[index].angle
      )
        ? current
        : next
    );
  }, [api]);

  useEffect(() => {
    if (!api) return;
    refreshElements();
    return api.onChange(refreshElements);
  }, [api, refreshElements]);

  const persistPreferences = useCallback((next: CodeBlockPreferences) => {
    preferencesRef.current = next;
    vscode.postMessage({
      type: "code-block-preferences-change",
      preferences: next,
    });
  }, []);

  const restoreCanvasFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      wrapperRef.current?.querySelector<HTMLElement>(".excalidraw")?.focus();
    });
  }, [wrapperRef]);

  const beginEditing = useCallback(
    (element: CodeSceneElement) => {
      if (viewOnly) return;
      if (activeId !== element.id) {
        baselines.current.set(element.id, element);
      }
      setActiveId(element.id);
    },
    [activeId, viewOnly]
  );

  const finishEditing = useCallback(
    (id: string, restoreFocus: boolean) => {
      if (api) {
        const element = api
          .getSceneElements()
          .find((candidate) => candidate.id === id);
        if (element && isCodeElement(element)) {
          baselines.current.set(id, element);
          transient.current.delete(id);
        }
      }
      setActiveId((current) => (current === id ? undefined : current));
      if (restoreFocus) restoreCanvasFocus();
    },
    [api, restoreCanvasFocus]
  );

  const cancelEditing = useCallback(
    (id: string) => {
      if (!api) return;
      const current = api
        .getSceneElements()
        .find((element) => element.id === id);
      const original = baselines.current.get(id);
      if (current && isCodeElement(current)) {
        restoreCodeTextElement(api, current, original);
      }
      baselines.current.delete(id);
      transient.current.delete(id);
      setActiveId((value) => (value === id ? undefined : value));
      restoreCanvasFocus();
    },
    [api, restoreCanvasFocus]
  );

  const save = useCallback(
    async (id: string, nextOptions: CodeBlockOptions) => {
      if (!api || viewOnly) {
        throw new Error("The code editor is not available in view-only mode.");
      }
      const current = api
        .getSceneElements()
        .find((element) => element.id === id);
      const existing = current && isCodeElement(current) ? current : undefined;
      const position =
        existing?.type === "image"
          ? codeEditorAnchor(existing)
          : existing
          ? { x: existing.x, y: existing.y, angle: existing.angle }
          : { x: 0, y: 0, angle: 0 };
      saveCodeTextElement(api, nextOptions, position, existing);
      persistPreferences({
        language: nextOptions.language,
        theme: nextOptions.theme,
        fontSize: nextOptions.fontSize,
        lineNumbers: nextOptions.lineNumbers,
        title: nextOptions.title,
        windowControls: nextOptions.windowControls,
        highlightLines: nextOptions.highlightLines,
      });
    },
    [api, persistPreferences, viewOnly]
  );

  const openNew = useCallback(() => {
    if (!api || viewOnly) return;
    const appState = api.getAppState();
    const center = viewportCoordsToSceneCoords(
      {
        clientX: appState.offsetLeft + appState.width / 2,
        clientY: appState.offsetTop + appState.height / 2,
      },
      appState
    );
    const options = getOptions(settings, preferencesRef.current);
    const position = { x: center.x - 210, y: center.y - 100 };
    const element = saveCodeTextElement(api, options, position);
    transient.current.add(element.id);
    baselines.current.set(element.id, undefined);
    setActiveId(element.id);
  }, [api, settings, viewOnly]);

  useEffect(() => {
    const listener = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === "open-code-block" && !viewOnly) {
        openNew();
      } else if (message.type === "code-block-settings-change") {
        setSettings(message.settings);
      } else if (message.type === "code-block-preferences-change") {
        preferencesRef.current = message.preferences;
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [openNew, viewOnly]);

  useEffect(() => {
    if (!api || !container) return;
    const onDoubleClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".studio-code-inline")
      ) {
        return;
      }
      const point = viewportCoordsToSceneCoords(
        { clientX: event.clientX, clientY: event.clientY },
        api.getAppState()
      );
      const element = api
        .getSceneElements()
        .filter(isCodeElement)
        .reverse()
        .find((candidate) => containsPoint(candidate, point));
      if (!element || viewOnly) return;
      beginEditing(element);
      event.preventDefault();
      event.stopPropagation();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "Enter" ||
        viewOnly ||
        (event.target instanceof Element &&
          event.target.closest(
            ".studio-code-inline, input, textarea, select, button, a, [contenteditable='true']"
          ))
      )
        return;
      const selected = api.getAppState().selectedElementIds ?? {};
      const element = api
        .getSceneElements()
        .find(
          (candidate) => selected[candidate.id] && isCodeElement(candidate)
        );
      if (element && isCodeElement(element)) {
        beginEditing(element);
        event.preventDefault();
        event.stopPropagation();
      }
    };
    container.addEventListener("dblclick", onDoubleClick, true);
    container.addEventListener("keydown", onKeyDown, true);
    return () => {
      container.removeEventListener("dblclick", onDoubleClick, true);
      container.removeEventListener("keydown", onKeyDown, true);
    };
  }, [api, beginEditing, container, viewOnly]);

  const overlays =
    api && container
      ? elements.map((element) => {
          if (element.type === "image" && activeId !== element.id) return null;
          const metadata = getCodeBlockMetadata(element);
          if (!metadata) return null;
          const options = getOptions(
            settings,
            preferencesRef.current,
            metadata
          );
          const bounds =
            element.type === "text"
              ? { x: element.x, y: element.y, width: element.width, angle: 0 }
              : {
                  x: element.x,
                  y: element.y + element.height + 12,
                  width: element.width,
                  angle: element.angle ?? 0,
                };
          const measured = getCodeTextBounds(options);
          const at = {
            ...bounds,
            width: Math.min(
              MAX_CODE_BLOCK_WIDTH,
              Math.max(bounds.width, measured.width)
            ),
            height: measured.height,
          };
          return createPortal(
            <InlineCodeEditor
              key={element.id}
              api={api}
              container={container}
              at={at}
              initialOptions={options}
              settings={settings}
              editing={!viewOnly && activeId === element.id}
              readOnly={viewOnly}
              onStart={() => beginEditing(element)}
              onSave={(next) => save(element.id, next)}
              onFinish={(restoreFocus) =>
                finishEditing(element.id, restoreFocus)
              }
              onCancel={() => cancelEditing(element.id)}
            />,
            container,
            element.id
          );
        })
      : null;

  return {
    trigger: viewOnly ? null : (
      <button
        type="button"
        className="studio-code-trigger"
        title="Insert code block"
        onClick={openNew}
      >
        {"</>"}
        <span>Code</span>
      </button>
    ),
    toolbar: null,
    editor: overlays,
  };
}
