import { useEffect, useRef } from "react";
import { bracketMatching, indentUnit } from "@codemirror/language";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  Compartment,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  Decoration,
} from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { CodeBlockOptions } from "../../../../src/codeBlockTypes";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/jetbrains-mono/400-italic.css";
import "@fontsource/jetbrains-mono/700-italic.css";
import { getCodeMirrorLanguage } from "./codeLanguages";
import { highlightCode } from "./codeHighlighter";

type Props = {
  options: CodeBlockOptions;
  readOnly?: boolean;
  active?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
  onFocus: () => void;
};

const setHighlighting = StateEffect.define<DecorationSet>();
const highlighting = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    value = value.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(setHighlighting)) {
        value = effect.value;
      }
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const bracketPairs: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
  "`": "`",
};

function stopClipboardPropagation(event: ClipboardEvent) {
  event.stopPropagation();
  return false;
}

function autoCloseBrackets(): Extension {
  return EditorView.inputHandler.of((view, from, to, text) => {
    if (text.length !== 1 || !bracketPairs[text]) {
      return false;
    }
    const selected = view.state.sliceDoc(from, to);
    const closing = bracketPairs[text];
    view.dispatch({
      changes: { from, to, insert: `${text}${selected}${closing}` },
      selection: {
        anchor: from + 1,
        head: from + 1 + selected.length,
      },
    });
    return true;
  });
}

function editorTheme(fontSize: number): Extension {
  return EditorView.theme({
    "&": {
      height: "100%",
      color: "var(--vscode-editor-foreground, #1e1e1e)",
      backgroundColor: "transparent",
      fontSize: `${fontSize}px`,
    },
    "&.cm-focused": { outline: "none" },
    ".cm-content": { caretColor: "var(--text-primary-color, #1b1b1f)" },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--text-primary-color, #1b1b1f)",
      borderLeftWidth: "2px",
      filter: "drop-shadow(0 0 1px var(--island-bg-color, #ffffff))",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "JetBrains Mono, monospace",
      lineHeight: "1.5",
    },
    ".cm-gutters": {
      color: "var(--vscode-editorLineNumber-foreground, #858585)",
      backgroundColor: "transparent",
      border: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
  });
}

export function CodeMirrorEditor({
  options,
  readOnly = false,
  active = true,
  onCancel,
  onChange,
  onError,
  onFocus,
  onSave,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView>();
  const activeRef = useRef(active);
  activeRef.current = active;
  const initialOptions = useRef(options);
  const languageConfig = useRef(new Compartment());
  const themeConfig = useRef(new Compartment());
  const editableConfig = useRef(new Compartment());
  const callbacks = useRef({ onChange, onSave, onCancel, onFocus });
  callbacks.current = { onChange, onSave, onCancel, onFocus };
  const errorCallback = useRef(onError);
  errorCallback.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const editor = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialOptions.current.code,
        extensions: [
          initialOptions.current.lineNumbers ? lineNumbers() : [],
          history(),
          drawSelection(),
          highlightActiveLine(),
          bracketMatching(),
          highlighting,
          autoCloseBrackets(),
          indentUnit.of("  "),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                callbacks.current.onSave();
                return true;
              },
            },
            {
              key: "Escape",
              run: () => {
                callbacks.current.onCancel();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          languageConfig.current.of([]),
          editableConfig.current.of([]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              callbacks.current.onChange(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            copy: stopClipboardPropagation,
            cut: stopClipboardPropagation,
            paste: stopClipboardPropagation,
            focus: () => {
              callbacks.current.onFocus();
              return false;
            },
          }),
          themeConfig.current.of(editorTheme(initialOptions.current.fontSize)),
        ],
      }),
    });
    viewRef.current = editor;
    if (activeRef.current) editor.focus();
    return () => {
      editor.destroy();
      viewRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeConfig.current.reconfigure(editorTheme(options.fontSize)),
    });
  }, [options.fontSize]);

  useEffect(() => {
    const editor = viewRef.current;
    if (!editor) return;
    editor.dispatch({
      effects: editableConfig.current.reconfigure([
        EditorState.readOnly.of(readOnly || !active),
        EditorView.editable.of(!readOnly && active),
      ]),
    });
    if (!active) {
      editor.contentDOM.blur();
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      if (activeRef.current) {
        viewRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, readOnly]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const editor = viewRef.current;
      if (!editor) {
        return;
      }
      const code = editor.state.doc.toString();
      void highlightCode(code, options)
        .then((result) => {
          if (
            !active ||
            viewRef.current !== editor ||
            editor.state.doc.toString() !== code
          ) {
            return;
          }
          let offset = 0;
          const marks = result.tokens.flatMap((tokens) => {
            const ranges = tokens.flatMap((token) => {
              const start = offset;
              offset += token.content.length;
              if (start === offset) {
                return [];
              }
              const style = token.fontStyle ?? 0;
              return [
                Decoration.mark({
                  attributes: {
                    style: `color:${token.color ?? result.fg};font-style:${
                      style & 1 ? "italic" : "normal"
                    };font-weight:${style & 2 ? "700" : "400"}`,
                  },
                }).range(start, offset),
              ];
            });
            offset++;
            return ranges;
          });
          editor.dispatch({
            effects: setHighlighting.of(Decoration.set(marks, true)),
          });
        })
        .catch((error: unknown) => {
          if (active) {
            errorCallback.current(
              `Unable to highlight code: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        });
    }, 100);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [options]);

  useEffect(() => {
    let active = true;
    const description = getCodeMirrorLanguage(options.language);
    const support = description?.load() ?? Promise.resolve([]);
    void support
      .then((loaded) => {
        if (active && viewRef.current) {
          viewRef.current.dispatch({
            effects: languageConfig.current.reconfigure(loaded),
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          errorCallback.current(
            error instanceof Error
              ? `Unable to load editor language: ${error.message}`
              : `Unable to load editor language: ${String(error)}`
          );
        }
      });
    return () => {
      active = false;
    };
  }, [options.language]);

  return <div className="studio-code-editor" ref={hostRef} />;
}
