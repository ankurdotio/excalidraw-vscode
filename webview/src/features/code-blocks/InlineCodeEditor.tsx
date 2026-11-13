import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  CodeBlockOptions,
  CodeBlockSettings,
} from "../../../../src/codeBlockTypes";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { getCodeTextBounds } from "./codeLayout";
import { createLanguageOptions } from "./codeLanguages";
import { SHIKI_LANGUAGE_IDS } from "./codeHighlighter";
import { parseHighlightLines } from "./highlightLines";

const languages = createLanguageOptions(SHIKI_LANGUAGE_IDS);

type Props = {
  api: ExcalidrawImperativeAPI;
  container: HTMLElement;
  at: { x: number; y: number; width: number; angle: number };
  initialOptions: CodeBlockOptions;
  settings: CodeBlockSettings;
  editing: boolean;
  readOnly?: boolean;
  onSave: (options: CodeBlockOptions) => Promise<void>;
  onFinish: (restoreFocus: boolean) => void;
  onStart: () => void;
  onCancel: () => void;
};

export function InlineCodeEditor({
  api,
  container,
  at,
  initialOptions,
  settings,
  editing,
  readOnly = false,
  onSave,
  onFinish,
  onStart,
  onCancel,
}: Props) {
  const [options, setOptions] = useState(initialOptions);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const finishingRef = useRef(false);
  const pending = useRef<Promise<void>>();
  const savedKey = useRef<string>();
  const callbacks = useRef({ onSave, onFinish, onStart, onCancel });
  callbacks.current = { onSave, onFinish, onStart, onCancel };
  const [viewport, setViewport] = useState(() => api.getAppState());
  const themedOptions = useMemo(
    () => ({
      ...options,
      theme: settings.defaultTheme,
      vscodeTheme: settings.vscodeTheme,
    }),
    [options, settings]
  );
  const lineCount = options.code.split("\n").length;
  const validation = useMemo(() => {
    if (lineCount > 500) {
      return "Code blocks are limited to 500 lines.";
    }
    try {
      parseHighlightLines(options.highlightLines, lineCount);
      return "";
    } catch (issue) {
      return issue instanceof Error ? issue.message : String(issue);
    }
  }, [lineCount, options.highlightLines]);

  useEffect(() => {
    const update = () => setViewport({ ...api.getAppState() });
    const unsubscribe = api.onScrollChange(update);
    window.addEventListener("resize", update);
    return () => {
      unsubscribe();
      window.removeEventListener("resize", update);
    };
  }, [api]);

  const latest = useRef({ options: themedOptions, validation, dirty });
  latest.current = { options: themedOptions, validation, dirty };

  const reportError = useCallback((issue: unknown) => {
    setError(issue instanceof Error ? issue.message : String(issue));
  }, []);

  const persist = useCallback(async () => {
    while (pending.current) {
      await pending.current;
    }
    if (latest.current.validation) {
      return;
    }
    while (true) {
      const snapshot = latest.current.options;
      const key = JSON.stringify(snapshot);
      if (key === savedKey.current) return;
      const request = callbacks.current.onSave(snapshot);
      pending.current = request;
      try {
        await request;
        savedKey.current = key;
        setError("");
      } finally {
        pending.current = undefined;
      }
      if (JSON.stringify(latest.current.options) === savedKey.current) return;
    }
  }, []);

  const finish = useCallback(
    async (restoreFocus: boolean) => {
      if (!editing || finishingRef.current || latest.current.validation) {
        return;
      }
      finishingRef.current = true;
      setFinishing(true);
      setError("");
      try {
        if (latest.current.dirty || latest.current.options.code) {
          await persist();
        }
        callbacks.current.onFinish(restoreFocus);
      } catch (issue) {
        reportError(issue);
      } finally {
        finishingRef.current = false;
        setFinishing(false);
      }
    },
    [editing, persist, reportError]
  );

  const cancel = () => {
    if (!editing || finishingRef.current) return;
    try {
      callbacks.current.onCancel();
    } catch (issue) {
      reportError(issue);
    }
  };

  useEffect(() => {
    if (!editing || !dirty || validation || finishing) return;
    const timer = window.setTimeout(() => {
      void persist().catch(reportError);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    dirty,
    editing,
    finishing,
    persist,
    reportError,
    themedOptions,
    validation,
  ]);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!editing) return;
      if (
        event.button === 0 &&
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        void finish(false);
      }
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [editing, finish]);
  useEffect(() => {
    if (!editing) {
      setOptions(initialOptions);
      setDirty(false);
      savedKey.current = JSON.stringify({
        ...initialOptions,
        theme: settings.defaultTheme,
        vscodeTheme: settings.vscodeTheme,
      });
    }
  }, [editing, initialOptions, settings]);
  const point = sceneCoordsToViewportCoords(
    { sceneX: at.x, sceneY: at.y },
    viewport
  );
  const bounds = container.getBoundingClientRect();
  return (
    <div
      className={`studio-code-inline${
        editing ? "" : " studio-code-inline--inactive"
      }`}
      ref={rootRef}
      role="group"
      aria-label="Code block editor"
      aria-busy={finishing}
      style={{
        left: point.x - bounds.left,
        top: point.y - bounds.top,
        width: Math.max(380, at.width),
        transform: `scale(${viewport.zoom.value}) rotate(${at.angle}rad)`,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (!editing) callbacks.current.onStart();
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        const clipboardShortcut =
          ((event.metaKey || event.ctrlKey) &&
            ["c", "v", "x"].includes(event.key.toLowerCase())) ||
          (event.shiftKey && event.key === "Insert");
        if (!clipboardShortcut) {
          event.stopPropagation();
        }
        if (event.defaultPrevented) {
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void finish(true);
        }
      }}
    >
      {editing && (
        <div className="studio-code-inline__controls">
          <select
            aria-label="Code language"
            value={options.language}
            disabled={finishing}
            onChange={(event) => {
              const language = event.currentTarget.value;
              setError("");
              setDirty(true);
              setOptions((current) => ({ ...current, language }));
            }}
          >
            {languages.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={cancel}
            disabled={finishing}
            aria-label="Cancel code editing"
            title="Cancel (Esc)"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void finish(true)}
            disabled={finishing || Boolean(validation)}
            aria-label="Done"
            title={finishing ? "Saving code block..." : "Done (Ctrl/Cmd+Enter)"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          </button>
        </div>
      )}
      <div style={{ height: getCodeTextBounds(themedOptions).height }}>
        <CodeMirrorEditor
          options={themedOptions}
          readOnly={readOnly || finishing}
          active={editing}
          onChange={(code) => {
            setError("");
            setDirty(true);
            setOptions((current) => ({ ...current, code }));
          }}
          onSave={() => void finish(true)}
          onCancel={cancel}
          onError={setError}
          onFocus={() => {
            if (!editing) callbacks.current.onStart();
          }}
        />
      </div>
      {(validation || error) && (
        <p className="studio-code-inline__error" role="alert">
          {validation || error}
        </p>
      )}
    </div>
  );
}
