# Manual regression checklist

Run this checklist in the Extension Development Host against the sample files
in [`examples/`](../examples/). Record any skipped item and the reason.

## Phase 0 baseline

- [x] Open, edit, save, close, and reopen `examples/test.excalidraw`.
- [x] Open, edit, save, close, and reopen an `.excalidraw.svg` drawing.
- [x] Open, edit, save, close, and reopen an `.excalidraw.png` drawing.
- [x] Confirm an edit shows the unsaved-changes dot and Save clears it.
- [x] Make an edit, use Revert, and confirm the last saved drawing returns.
- [x] Verify Undo and Redo for drawing edits.
- [x] Change the editor theme using light, dark, and auto; confirm each mode.
- [x] Change the language setting and confirm the editor UI updates.
- [x] Import a public library and confirm its items appear in the editor.
- [x] Set `excalidrawStudio.workspaceLibraryPath` to
      `library.excalidrawlib` in the examples workspace, edit the library, then
      confirm the workspace library file changes and reloads.
- [x] Open a drawing from a Git diff and confirm it is view-only.

The user confirmed the manual Phase 0 checks passed via F5.

## Web extension smoke test

- [ ] Run `npm run open-in-browser` and confirm the VS Code web workbench and
      extension load without errors. This check is non-blocking until Phase 4.

## Baseline checks already run

- `npm install`: passed.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run open-in-browser`: not verified; the headless Chromium process failed
  to spawn with `Unknown system error -88` in this environment.
- Running the same test server with `--browser none` responds, but the
  integrated browser cannot load its `/static/build/out/...` workbench assets
  (404), so it does not provide a usable smoke test either.
- The VS Code CLI accepted the development-host launch command, but visual
  confirmation was unavailable in the unattended session.

## Phase 1: web embeds

Run the automated checks first:

- `npm run build`
- `npm run test`
- `npm run lint`
- `cd webview && npx eslint src/features/embeds tests`

Then run these manual checks in the Extension Development Host. Use the
disposable [`examples/embed-test.excalidraw`](../examples/embed-test.excalidraw)
file; do not overwrite other drawings. For each URL below, select Excalidraw's
**Embed** tool, click the canvas where it should go, paste the URL in the
dialog, and press Enter.

1. Press **F5**, choose **Launch extension (desktop)**, wait for the new
   Extension Development Host window, then click
   `examples/embed-test.excalidraw` in Explorer. Expected: the drawing opens
   and the desktop extension host is active.
2. Add `https://www.youtube.com/embed/dQw4w9WgXcQ`. Expected: the built-in
   YouTube embed is used; note any player error.
3. Add `https://react.dev/`. Expected: it renders in a scrollable frame. Hover
   it and click **Reload**, **Open**, **Simple Browser**, then **Link card**.
   Scroll while the pointer is over the page; verify the page scrolls and the
   frame remains selectable/movable when it is not active.
4. Add `https://github.com/`. Expected on desktop: it becomes a link card
   automatically. Click **Open in browser**, **Simple Browser**, and **Try
   embedding anyway**.
5. Add `https://www.figma.com/`. Expected: Excalidraw's built-in Figma behavior
   remains in use.
6. In VS Code, click **Terminal > New Terminal**, run
   `npm --prefix webview run dev -- --host 127.0.0.1 --port 5173`, then embed
   `http://localhost:5173`. Keep the terminal running. Expected: the local
   Vite page loads. To test HMR, make and save a reversible change in
   `webview/src/styles.css`; confirm the iframe updates, then restore the file.
7. Move and resize a frame, delete it and undo; save the drawing, close it, and
   reopen it. Expected: the embed and its chosen frame/card mode persist, and
   undo restores deleted embeds.
8. Export the drawing to PNG and SVG. Expected: embeds appear as Excalidraw
   placeholders, not as live web pages.
9. Open an embed from a Git-diff drawing. Expected: modifying embed controls
   such as **Link card** and **Try embedding anyway** are hidden.

The vscode.dev smoke test remains non-blocking until Phase 4.

## Phase 2: icon rendering regression checks

Automated checks:

- `npm run build`
- `npm run test` (19 tests, including SVG root-attribute validity and preview
  versus inserted-asset resolution).
- `npm run lint` (no errors; existing in-progress host formatting warnings).
- `cd webview && npx eslint src/features/icons/IconGrid.tsx src/features/icons/iconSvg.ts src/features/icons/useIconLibrary.tsx tests/iconSvg.test.ts`

A local built-webview browser fixture also verified SVG image decoding,
click insertion and saved image data, repeated panel opening, responsive
viewport sizing, and 27–36 mounted previews while scrolling the complete
Tabler set. Dark/light/dark switching used exactly the same computed filter
for previews and the canvas, without modifying the image data URL.
This fixture does not replace VS Code UI verification.

Manual confirmation (pending):

1. Rebuild, restart **F5 > Launch extension (desktop)**, open
   [`examples/test.excalidraw`](../examples/test.excalidraw), and use
   **File > Save As** to create `examples/icons-test.excalidraw`. Use that copy
   for these checks.
2. Run **ex+: Color Theme**, choose **Dark**, then click
   **Icons**. Keep the default color and insert an icon. Expected: previews
   are light and readable like the placed icon; no broken-image symbols or
   blank canvas.
3. Switch the editor theme to **Light**, then **Dark** again. Expected:
   previews track the canvas appearance immediately; the chosen source color
   stays unchanged.
4. Clear search, select **Tabler**, and scroll through the grid. Then search
   `database`, `user`, and `docker` with **All** selected. Expected: the panel
   remains responsive and typing does not activate canvas shortcuts. Report
   any remaining slow scrolling/search.

Phase completion and commits still require the user's manual results.

## Phase 3: inline code blocks

Automated checks:

- `npm run build` (webview plus browser/desktop extension hosts).
- `npm run test` (31 tests, including theme JSONC parsing and snapshot validation).
- `npm run lint`.
- `cd webview && npx eslint src/features/code-blocks tests/codeBlockHelpers.test.ts tests/codeBlockTheme.test.ts`.

The local built-webview fixture verifies that Code creates a standard text
element with a persistent CodeMirror surface, not a dialog or generated image.
It checks live theme token colors, continuous/debounced saves, outside-click
focus removal, Done/Cancel, stable element identity, moving and reopening the
unfocused surface, Undo/Redo, shortcut isolation, the 500-line limit and saved
theme/source snapshots. This is not VS Code UI sign-off.

A native-clipboard browser regression checks copy, cut and paste after reopening
a selected block, including pasting while the pointer is over the canvas but
CodeMirror retains focus. Enter must insert a newline and pasted code must not
create another canvas text element. Long lines and multiline pastes stay within
800 by 520 scene units and scroll inside the editor; normal canvas pasting remains
available. A separate browser check emulates VS Code's webview clipboard shortcut
forwarding and verifies a forwarded paste reaches CodeMirror.

Manual confirmation (pending; use the copy created in step 1):

1. Run `npm run build`, then **F5 > Launch extension (desktop)**. Open
   [`examples/test.excalidraw`](../examples/test.excalidraw), then **File > Save As**
   `examples/code-blocks-test.excalidraw`.
2. Click **Code** next to **Icons**. Expected: a persistent, borderless and
   transparent code editor directly on the canvas; no modal, backdrop,
   separate window, generated image or theme picker.
3. Enter JavaScript, choose **JavaScript**, and press **Cmd/Ctrl+Enter**.
   Repeat with Python, Bash and JSON, moving each finished block aside first.
   Expected: highlighted code remains editable on the canvas after saving;
   editing controls disappear but the code surface stays. Zooming to 200%
   remains crisp.
4. Double-click a block, then cancel and try selecting it and pressing **Enter**.
   Expected: the persistent editor reopens with the original source and language.
   Change source and wait for autosave; click elsewhere and confirm the new source
   remains on-canvas without focus. Drag the unfocused block; expected: its text
   element and visible editor move together. Done hides editing controls but
   leaves the editor visible. Cancel restores the source from before that edit session.
5. While editing, use **Preferences: Color Theme** in VS Code to switch between
   light, dark and your custom theme. Expected: inline syntax/editor colors update
   automatically, including on unfocused persistent code surfaces.
6. Save, close and reopen `examples/code-blocks-test.excalidraw`. Expected:
   source/language reload into a persistent CodeMirror surface. Confirm the
   limitation that the CodeMirror surface is extension UI and isn't included
   in exports or other Excalidraw clients.
7. While editing, type `a`, `r`, Delete and Cmd/Ctrl+Z. Expected: only the source
   changes, not canvas elements/tools. After reopening a selected block, press
   Enter and copy, cut and paste code. Expected: Enter inserts a new line and
   the clipboard contains the selected code, not a canvas element. Move the
   pointer over the canvas without clicking and paste a long multiline snippet.
   Expected: no duplicate canvas text, the block stays within 800 by 520 at 100%
   zoom, and long code scrolls
   horizontally and vertically. Press Esc; the draft is discarded and
   keyboard focus returns to the canvas.
8. Use Excalidraw's menu to export PNG and SVG. Expected: code editor surfaces
   are absent from exports and other Excalidraw clients; source/options remain in
   the saved text elements. The original drawing still saves/reopens normally.
   Run the Phase 0 regression checklist before signing off the phase.

Theme snapshots use TextMate rules, not language-server semantic highlighting.
If an installed theme cannot be read (including legacy external `.tmTheme`
files), a warning explicitly reports the built-in VS Code light/dark fallback.

## Drawing shortcuts

The local browser fixture emulates VS Code forwarding the configured shortcuts
and checks that they toggle the icon library, select the web-frame tool and
open a code block. It also checks the view-only message guards.

Manual confirmation (pending):

1. Restart **F5 > Launch extension (desktop)** and open
   [`examples/test.excalidraw`](../examples/test.excalidraw). Click the canvas.
2. Press **Cmd+Option+Shift+I** on macOS, or **Ctrl+Alt+Shift+I** elsewhere.
   Expected: the icon library opens. Click the canvas and repeat to close it.
3. Press **Cmd+Option+Shift+W** (elsewhere **Ctrl+Alt+Shift+W**). Expected:
   the web-frame tool is selected; drag a rectangle and enter a URL.
4. Click the canvas and press **Cmd+Option+Shift+C** (elsewhere
   **Ctrl+Alt+Shift+C**). Expected: a code block opens on the canvas.

## ex+ branding

Manual confirmation (pending):

1. Press **F5**, choose **Launch extension (desktop)**, then right-click
   [`examples/test.excalidraw`](../examples/test.excalidraw) and choose
   **Open With...**. Expected: **ex+** is an available editor and opens the
   drawing.
2. Open the Command Palette and run **Developer: Show Running Extensions**.
   Expected: the active extension is named **ex+**.
3. Open the Command Palette and type `ex+`. Expected: **ex+: Color Theme**
   and the insert commands appear. Press Escape without changing settings.
4. Open **Preferences: Open Settings (UI)** and search
   `@ext:ankurdotio.excalidraw-studio`. Expected: the settings are
   grouped under **ex+** and retain their `excalidrawStudio` keys.

## Local HTML embeds

Manual confirmation (pending):

1. In a trusted workspace, create `examples/local-embed.html` containing
   `<h1>Local HTML</h1><script>document.body.append(" script works")</script>`.
   Press **F5**, choose **Launch extension (desktop)**, open
   [`examples/test.excalidraw`](../examples/test.excalidraw), then use **File >
   Save As** to save a disposable `examples/local-embed-test.excalidraw`.
2. Select the existing **Web Embed** tool, draw a frame, and enter the absolute
   path to `examples/local-embed.html` in its link field. Repeat with its
   `file:///` URL. There should be no separate HTML button.
   Expected: a movable, resizable frame displays “Local HTML script works”.
3. Double-click the frame, hover it, and click **Open file**. Expected: the
   HTML file opens in VS Code. Edit its heading, save it, return to the
   drawing, and click **Reload**. Expected: the updated heading appears.
4. Undo and redo the insertion, then save, close, and reopen
   `examples/local-embed-test.excalidraw`. Expected: undo/redo work and the
   local page reappears after reopening.
5. Rename `examples/local-embed.html` and reopen the drawing. Expected: the
   frame reports the missing file. Restore the filename, double-click the
   frame, and click **Retry**. Expected: the page loads again.
6. Enter a path to an HTML file outside every workspace folder. Expected: an
   error explains that the file must be inside an open workspace folder.
   Existing web embeds should continue to work.
