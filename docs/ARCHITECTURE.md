# Architecture

## Extension host and file lifecycle

`src/extension.ts` activates the extension and registers the custom editor
provider, URI handler, and commands. The provider in `src/editor.ts` opens an
`ExcalidrawDocument` for each file. `src/document.ts` keeps the file URI,
content bytes, and MIME type; JSON, SVG, and PNG content is read and written
through `vscode.workspace.fs`.

When VS Code resolves the custom editor, `ExcalidrawEditor.setupWebview()`
configures its webview, installs message/configuration listeners, and builds the
webview HTML from `webview/dist/index.html`. It injects a base64-encoded
configuration object into `data-excalidraw-config` and replaces the asset-path
placeholder with a webview-safe URI for `webview/dist/`.

`webview/src/main.tsx` decodes that configuration, loads the saved drawing with
Excalidraw's `loadFromBlob`, and mounts `App`. It tries the declared MIME type
first and then the other supported JSON/SVG/PNG types, which allows the editor
to open its supported file formats. Untitled documents start as an empty
Excalidraw JSON document.

## Editing and saving

`App.tsx` passes Excalidraw changes to `main.tsx`. The webview debounces them by
250 ms and compares `hashElementsVersion` to avoid reporting changes that have
not changed element versions. `webview/src/vscode.ts` serializes the scene for
the current document format:

- JSON: `serializeAsJSON(..., "local")`
- SVG: `exportToSvg`
- PNG: `exportToBlob`

The webview sends the resulting bytes in a `change` message. The host applies
them with `ExcalidrawDocument.update()`, which raises the custom-document change
event used by VS Code's dirty indicator and editor Save/Revert lifecycle. Save
writes the current bytes to the document URI; Revert reloads those bytes from
the filesystem.

## Host/webview messages

| Direction       | Type                  | Purpose                                                                                       |
| --------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Webview to host | `change`              | Persist serialized JSON, SVG, or PNG bytes in the custom document.                            |
| Webview to host | `library-change`      | Store an updated Excalidraw library in global state or the configured workspace library file. |
| Webview to host | `link-open`           | Open a drawing link in VS Code or externally.                                                 |
| Webview to host | `error`               | Show a webview error to the user.                                                             |
| Webview to host | `info`                | Show an informational notification; supported by the host listener.                           |
| Host to webview | `theme-change`        | Apply an updated theme setting.                                                               |
| Host to webview | `language-change`     | Apply an updated language setting.                                                            |
| Host to webview | `image-params-change` | Apply updated image export settings.                                                          |
| Host to webview | `library-change`      | Load or replace/merge library items.                                                          |

## Settings and initial configuration

Before the page is loaded, `ExcalidrawEditor` reads the active workspace
configuration and includes `theme`, `language`, `imageParams`, and library
content in the injected webview configuration. Language falls back to the
current VS Code display language. The workspace library path is resolved from
the `excalidrawStudio.workspaceLibraryPath` setting; without it, the library
uses extension `globalState`.

The editor listens for configuration changes and posts the corresponding
`theme-change`, `language-change`, `image-params-change`, or `library-change`
message. The webview settings controls do not write those settings directly.

## Planned feature integration points

- **Embeds:** wire `validateEmbeddable` and `renderEmbeddable` into the
  `<Excalidraw>` component in `webview/src/App.tsx`. Webview UI and URL helpers
  belong under `webview/src/features/embeds/`; desktop-only frame checks and
  external-browser requests need a small host interface and message handlers
  in `src/editor.ts`.
- **Icons:** add icon search, SVG construction, and panel UI under
  `webview/src/features/icons/`. Keep `App.tsx` changes limited to Excalidraw
  panel/toolbar wiring and add a host command for the active editor.
- **Code blocks:** put rendering, editing, and layout helpers under
  `webview/src/features/code-blocks/`, with shared image/scene helpers in
  `webview/src/lib/`. Wire the editor and commands through `App.tsx` and
  `src/commands.ts`.

The planned features use standard Excalidraw elements so existing file loading
and serialization continue to own persistence and undo behavior.
