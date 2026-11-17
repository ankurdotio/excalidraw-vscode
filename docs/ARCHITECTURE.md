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

| Direction       | Type                    | Purpose                                                                                       |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Webview to host | `change`                | Persist serialized JSON, SVG, or PNG bytes in the custom document.                            |
| Webview to host | `library-change`        | Store an updated Excalidraw library in global state or the configured workspace library file. |
| Webview to host | `link-open`             | Open a drawing link in VS Code or externally.                                                 |
| Webview to host | `error`                 | Show a webview error to the user.                                                             |
| Webview to host | `info`                  | Show an informational notification; supported by the host listener.                           |
| Webview to host | `embed-check`           | Check remote page headers and metadata in the Node desktop host.                              |
| Webview to host | `embed-open`            | Open an embed in the external browser or VS Code Simple Browser.                              |
| Webview to host | `embed-map-url`         | Map remote localhost URLs through `vscode.env.asExternalUri`.                                 |
| Webview to host | `embed-pick-local-html` | Open the HTML file picker for an editable drawing.                                            |
| Host to webview | `theme-change`          | Apply an updated theme setting.                                                               |
| Host to webview | `language-change`       | Apply an updated language setting.                                                            |
| Host to webview | `image-params-change`   | Apply updated image export settings.                                                          |
| Host to webview | `library-change`        | Load or replace/merge library items.                                                          |
| Host to webview | `embed-check-result`    | Return frame policy, title, and favicon metadata.                                             |
| Host to webview | `embed-settings-change` | Apply updated embed domain and detection settings.                                            |
| Host to webview | `embed-url-result`      | Return a remote-mapped localhost URL.                                                         |
| Host to webview | `embed-local-html-selected` | Return the selected local HTML URI for insertion as an embeddable element.                |

## Settings and initial configuration

Before the page is loaded, `ExcalidrawEditor` reads the active workspace
configuration and includes `theme`, `language`, `imageParams`, and library
content, along with embed settings, desktop-check availability, and remote
session state, in the injected webview configuration. Language falls back to the
current VS Code display language. The workspace library path is resolved from
the `excalidrawStudio.workspaceLibraryPath` setting; without it, the library
uses extension `globalState`.

The editor listens for configuration changes and posts the corresponding
`theme-change`, `language-change`, `image-params-change`, or `library-change`
message. Embed setting changes are sent with `embed-settings-change`. The
webview settings controls do not write those settings directly.

## Planned feature integration points

- **Embeds:** `webview/src/features/embeds/` contains URL validation, the
  custom frame and link-card UI. `App.tsx` preserves Excalidraw's built-in
  renderer for supported providers and delegates other URLs to the custom
  frame. The Node host uses `src/embedCheck.node.ts` for desktop-only header
  checks, page metadata, redirects, timeout, and session caching; the browser
  build omits this service. `src/editor.ts` handles external/browser actions,
  configuration updates, remote localhost mapping, and local HTML selection.
  Local HTML requires a trusted workspace and a file inside a workspace folder.
  The host resolves its URI to a webview resource; the iframe runs with scripts
  but without same-origin access. Drawings retain the file URI, not file contents.
- **Icons:** add icon search, SVG construction, and panel UI under
  `webview/src/features/icons/`. Keep `App.tsx` changes limited to Excalidraw
  panel/toolbar wiring and add a host command for the active editor.
- **Code blocks:** `webview/src/features/code-blocks/` contains the persistent
  on-canvas CodeMirror editor and Shiki tokenization. Each block is stored as a
  standard Excalidraw text element with source/options in `customData`; code is
  not rasterized. Borderless transparent CodeMirror surfaces are positioned
  with public scene/viewport helpers and follow zoom/scroll. They remain visible
  after saving and reopening; Done/outside-click only exits edit mode, while
  Cancel restores the pre-edit text element. CodeMirror copy, cut and paste
  events stop before Excalidraw's document clipboard handlers, while clipboard
  shortcut keydowns reach VS Code's webview event forwarding. Source-derived
  text and surface bounds are capped at 800 by 520 scene units, with larger code
  scrolling inside the editor. The editor surface is extension UI,
  so it is absent from Excalidraw exports and other clients.
  `src/codeBlockTheme.ts` reads the active VS Code theme through extension
  contributions and `workspace.fs`, follows JSONC includes, and merges user
  TextMate/color overrides. Theme/configuration changes send
  `code-block-settings-change` messages. One shared highlighter colors the
  persistent CodeMirror surfaces, without a separate theme picker. The saved
  text element's `customData` includes its source/options and theme snapshot. Commands
  and initial configuration are wired through the host and `App.tsx`.

The planned features use standard Excalidraw elements so existing file loading
and serialization continue to own persistence and undo behavior.
