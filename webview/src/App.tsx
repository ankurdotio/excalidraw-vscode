import { useCallback, useEffect, useState, useRef } from "react";
import {
  CaptureUpdateAction,
  Excalidraw,
  loadLibraryFromBlob,
  newElementWith,
  serializeLibraryAsJSON,
  THEME,
} from "@excalidraw/excalidraw";

import "@excalidraw/excalidraw/index.css";

import "./styles.css";
import {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  LibraryItems,
} from "@excalidraw/excalidraw/types";
import { vscode } from "./vscode.ts";
import type {
  EmbedCheckResult,
  EmbedMode,
  EmbedSettings,
} from "../../src/embedTypes";
import type { IconPreferences, IconSettings } from "../../src/iconTypes";
import type {
  CodeBlockPreferences,
  CodeBlockSettings,
} from "../../src/codeBlockTypes";
import { EmbedRenderer } from "./features/embeds/EmbedRenderer";
import {
  isExcalidrawEmbedUrl,
  validateEmbeddable,
} from "./features/embeds/url";
import { useIconLibrary } from "./features/icons/useIconLibrary";
import { useCodeBlocks } from "./features/code-blocks/useCodeBlocks";

function detectTheme() {
  switch (document.body.className) {
    case "vscode-dark":
      return THEME.DARK;
    case "vscode-light":
      return THEME.LIGHT;
    default:
      return THEME.LIGHT;
  }
}

function useTheme(initialThemeConfig: string) {
  const [themeConfig, setThemeConfig] = useState(initialThemeConfig);
  const getExcalidrawTheme = () => {
    switch (themeConfig) {
      case "light":
        return THEME.LIGHT;
      case "dark":
        return THEME.DARK;
      case "auto":
        return detectTheme();
    }
  };
  const [theme, setTheme] = useState(getExcalidrawTheme());
  const updateTheme = () => {
    setTheme(getExcalidrawTheme());
  };

  useEffect(updateTheme, [themeConfig]);

  useEffect(() => {
    if (themeConfig !== "auto") return;
    const observer = new MutationObserver(() => {
      updateTheme();
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      observer.disconnect();
    };
  }, [themeConfig]);

  return { theme, setThemeConfig };
}

export default function App(props: {
  initialData?: ExcalidrawInitialDataState;
  name: string;
  theme: string;
  langCode: string;
  viewModeEnabled: boolean;
  libraryItems?: LibraryItems;
  imageParams: {
    exportBackground: boolean;
    exportWithDarkMode: boolean;
    exportScale: 1 | 2 | 3;
  };
  embedSettings: EmbedSettings;
  embedCheckAvailable: boolean;
  remoteSession: boolean;
  iconSettings: IconSettings;
  iconPreferences: IconPreferences;
  codeBlockSettings: CodeBlockSettings;
  codeBlockPreferences?: CodeBlockPreferences;
  dirty: boolean;
  onChange: (
    elements: readonly any[],
    appState: Partial<AppState>,
    files?: BinaryFiles
  ) => void;
}) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const libraryItemsRef = useRef(props.libraryItems);
  const { theme, setThemeConfig } = useTheme(props.theme);
  const [imageParams, setImageParams] = useState(props.imageParams);
  const [langCode, setLangCode] = useState(props.langCode);
  const [embedSettings, setEmbedSettings] = useState(props.embedSettings);
  const [embedChecks, setEmbedChecks] = useState<
    Record<string, EmbedCheckResult>
  >({});
  const [mappedEmbedUrls, setMappedEmbedUrls] = useState<
    Record<string, string>
  >({});
  const [embedMapErrors, setEmbedMapErrors] = useState<Record<string, string>>(
    {}
  );
  const [localEmbedHtml, setLocalEmbedHtml] = useState<
    Record<string, string>
  >({});
  const requestedEmbedChecks = useRef(new Set<string>());
  const requestedEmbedMaps = useRef(new Set<string>());
  const icons = useIconLibrary({
    api: excalidrawAPI,
    wrapperRef,
    viewOnly: props.viewModeEnabled,
    initialSettings: props.iconSettings,
    initialPreferences: props.iconPreferences,
  });
  const codeBlocks = useCodeBlocks({
    api: excalidrawAPI,
    wrapperRef,
    viewOnly: props.viewModeEnabled,
    initialSettings: props.codeBlockSettings,
    initialPreferences: props.codeBlockPreferences,
  });

  useEffect(() => {
    if (!props.dirty) {
      return;
    }
    if (props.initialData) {
      const { elements, appState, files } = props.initialData;
      props.onChange(elements || [], appState || {}, files);
    } else {
      props.onChange([], { viewBackgroundColor: "#ffffff" }, {});
    }
  }, []);

  useEffect(() => {
    const listener = async (e: any) => {
      try {
        const message = e.data;
        switch (message.type) {
          case "library-change": {
            const blob = new Blob([message.library], {
              type: "application/json",
            });
            const libraryItems = await loadLibraryFromBlob(blob);
            if (
              JSON.stringify(libraryItems) ==
              JSON.stringify(libraryItemsRef.current)
            ) {
              return;
            }
            libraryItemsRef.current = libraryItems;
            excalidrawAPI?.updateLibrary({
              libraryItems,
              merge: message.merge,
              openLibraryMenu: !message.merge,
            });
            break;
          }
          case "theme-change": {
            setThemeConfig(message.theme);
            break;
          }
          case "activate-web-frame": {
            if (!props.viewModeEnabled) {
              if (!excalidrawAPI) {
                throw new Error("The drawing is not ready to insert a web frame.");
              }
              excalidrawAPI.setActiveTool({ type: "embeddable" });
            }
            break;
          }
          case "language-change": {
            setLangCode(message.langCode);
            break;
          }
          case "image-params-change": {
            setImageParams(message.imageParams);
            break;
          }
          case "embed-settings-change": {
            setEmbedSettings(message.embedSettings);
            requestedEmbedChecks.current.clear();
            setEmbedChecks({});
            break;
          }
          case "embed-check-result": {
            const result = message.result as EmbedCheckResult;
            setEmbedChecks((current) => ({ ...current, [result.url]: result }));
            break;
          }
          case "embed-url-result": {
            if (message.mappedUrl || typeof message.html === "string") {
              if (typeof message.html === "string") {
                setLocalEmbedHtml((current) => ({
                  ...current,
                  [message.url]: message.html,
                }));
              } else {
                setMappedEmbedUrls((current) => ({
                  ...current,
                  [message.url]: message.mappedUrl,
                }));
              }
              setEmbedMapErrors((current) => {
                const next = { ...current };
                delete next[message.url];
                return next;
              });
            } else if (message.error) {
              setEmbedMapErrors((current) => ({
                ...current,
                [message.url]: message.error,
              }));
            }
            break;
          }
        }
      } catch (e) {
        vscode.postMessage({
          type: "error",
          content: (e as Error).message,
        });
      }
    };
    window.addEventListener("message", listener);

    return () => {
      window.removeEventListener("message", listener);
    };
  }, [excalidrawAPI, props.viewModeEnabled]);

  const requestEmbedCheck = useCallback((url: string) => {
    if (requestedEmbedChecks.current.has(url)) {
      return;
    }
    requestedEmbedChecks.current.add(url);
    vscode.postMessage({ type: "embed-check", url });
  }, []);

  const requestEmbedMap = useCallback((url: string, retry = false) => {
    if (!retry && requestedEmbedMaps.current.has(url)) {
      return;
    }
    if (retry) {
      setEmbedMapErrors((current) => {
        const next = { ...current };
        delete next[url];
        return next;
      });
    }
    requestedEmbedMaps.current.add(url);
    vscode.postMessage({ type: "embed-map-url", url });
  }, []);

  const openEmbed = useCallback(
    (action: "external" | "simple-browser" | "local-file", url: string) => {
      vscode.postMessage({ type: "embed-open", action, url });
    },
    []
  );

  const updateEmbedMode = useCallback(
    (elementId: string, mode: EmbedMode) => {
      if (props.viewModeEnabled || !excalidrawAPI) {
        return;
      }

      const elements = excalidrawAPI.getSceneElements();
      const element = elements.find((candidate) => candidate.id === elementId);
      if (!element || element.type !== "embeddable") {
        return;
      }

      const nextElements = elements.map((candidate) =>
        candidate.id === elementId
          ? newElementWith(element, {
              customData: {
                ...(element.customData ?? {}),
                embedMode: mode,
              },
            })
          : candidate
      );
      excalidrawAPI.updateScene({
        elements: nextElements,
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    [excalidrawAPI, props.viewModeEnabled]
  );

  return (
    <div
      className="excalidraw-wrapper"
      ref={wrapperRef}
      onDragOverCapture={icons.onDragOver}
      onDropCapture={icons.onDrop}
    >
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
          },
        }}
        langCode={langCode}
        name={props.name}
        theme={theme}
        viewModeEnabled={props.viewModeEnabled}
        initialData={{
          ...props.initialData,
          libraryItems: props.libraryItems,
          scrollToContent: true,
        }}
        libraryReturnUrl={
          "vscode://ankurdotio.excalidraw-studio/importLib"
        }
        onChange={(elements, appState, files) =>
          props.onChange(
            elements,
            { ...appState, ...imageParams, exportEmbedScene: true },
            files
          )
        }
        validateEmbeddable={(url) => validateEmbeddable(url, embedSettings)}
        renderEmbeddable={(element) => {
          if (isExcalidrawEmbedUrl(element.link ?? "")) {
            return null;
          }
          return (
            <EmbedRenderer
              element={element}
              settings={embedSettings}
              checkAvailable={props.embedCheckAvailable}
              remoteSession={props.remoteSession}
              checkResult={element.link ? embedChecks[element.link] : undefined}
              mappedUrl={
                element.link ? mappedEmbedUrls[element.link] : undefined
              }
              localHtml={
                element.link ? localEmbedHtml[element.link] : undefined
              }
              mapError={element.link ? embedMapErrors[element.link] : undefined}
              viewOnly={props.viewModeEnabled}
              requestCheck={requestEmbedCheck}
              requestMap={requestEmbedMap}
              onOpen={openEmbed}
              onSetMode={updateEmbedMode}
            />
          );
        }}
        renderTopRightUI={() => (
          <>
            {icons.trigger}
            {codeBlocks.trigger}
          </>
        )}
        onLinkOpen={(element, event) => {
          vscode.postMessage({
            type: "link-open",
            url: element.link,
          });
          event.preventDefault();
        }}
        onLibraryChange={(libraryItems) => {
          if (
            JSON.stringify(libraryItems) ==
            JSON.stringify(libraryItemsRef.current)
          ) {
            return;
          }
          libraryItemsRef.current = libraryItems;
          vscode.postMessage({
            type: "library-change",
            library: serializeLibraryAsJSON(libraryItems),
          });
        }}
      >
        {icons.sidebar}
      </Excalidraw>
      {icons.toolbar}
      {codeBlocks.toolbar}
      {codeBlocks.editor}
    </div>
  );
}
