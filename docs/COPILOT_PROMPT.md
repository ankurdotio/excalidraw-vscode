# Build plan: fork of the Excalidraw VS Code extension with icons, working web embeds, and code blocks

## 0. Fill these in (or keep the working defaults)

| Placeholder | Working default | Used for |
|---|---|---|
| `{{DISPLAY_NAME}}` | `Excalidraw Studio` | Marketplace display name (check it's free before publishing) |
| `{{EXT_NAME}}` | `excalidraw-studio` | `package.json` `name` |
| `{{PUBLISHER}}` | `your-publisher-id` | `package.json` `publisher` |
| `{{PREFIX}}` | `excalidrawStudio` | Prefix for every command ID, setting key and the custom editor `viewType` |

---

## 1. Your role and the goal

You are working inside my fork of `excalidraw/excalidraw-vscode` (MIT, Marketplace ID `pomdtr.excalidraw-editor`). I like the current Excalidraw UX and want to keep all of it. Your job is to add three features on top, without changing how the existing editor looks or behaves:

1. **Built-in icon library**: Remix Icon, Feather, Tabler and Simple Icons, bundled offline, searchable, inserted as recolorable images.
2. **Web embeds that work**: any website (and `localhost`) as a live, scrollable frame on the canvas, with a link-card fallback for sites that refuse to be framed.
3. **Code blocks**: syntax-highlighted code (VS Code-quality highlighting) that can be edited again later.

The result must run locally from a `.vsix` file and be clean enough to publish to the Marketplace later.

## 2. How to work

- Work **one phase at a time**, in order. At the end of each phase:
  1. The build passes (`npm run build`), and lint and tests pass.
  2. Update `docs/PROGRESS.md` (a checklist of every task in this file, ticked as done).
  3. Make one commit per phase, with a clear message.
  4. Give me a short summary: files changed, how to test it manually, anything you couldn't do.
  5. **Stop and wait for me to say "continue".**
- You can't see the VS Code UI. When a check needs a person, first finish every automated check, then give me a numbered manual checklist for that phase (exact files, clicks and expected results, max 10 steps) and wait. When I reply with the results, fix any failures, then commit.
- Before writing code in a phase, read the relevant existing files. If something in this prompt is wrong for this codebase, **stop and tell me** instead of quietly working around it.
- **Ask me before you:** add a dependency not named here, change the `@excalidraw/excalidraw` version, change the saved file format, or remove or alter any existing feature.
- Put new code in focused modules: `webview/src/features/embeds/`, `webview/src/features/icons/`, `webview/src/features/code-blocks/`, shared helpers in `webview/src/lib/`. Keep edits to existing files (`App.tsx`, `main.tsx`, `editor.ts`, `package.json`) small and wiring-only, so future upstream updates stay easy to merge.
- New code is strict TypeScript. No unrelated refactors or upgrades: for example, leave the existing `ReactDOM.render` call alone.
- Add unit tests (Vitest, in `webview/`) for every pure function: URL validation, header parsing, icon SVG building, code-block layout math, the highlight-lines parser.

## 3. Hard constraints

- **Keep the Excalidraw UX.** Additions must look native. Use Excalidraw's own components (`Sidebar`, `MainMenu`, `Footer`, `renderTopRightUI`) and its CSS variables and "island" styling. They must work in light and dark themes.
- **Public API only.** Use only the props, `excalidrawAPI` methods and exported helpers of `@excalidraw/excalidraw`. No editing `node_modules`, no `patch-package`, no copying Excalidraw internals.
- **Keep files compatible.** No new element types. Icons and code blocks are standard `image` elements; embeds are standard `embeddable` elements. Store extra data only in the element's `customData`. Files must still open on excalidraw.com, where icons and code blocks show as images.
- **Offline.** No CDN or runtime downloads for app code, fonts, icons, grammars or themes. Everything is bundled. The only network traffic allowed is the embedded website itself and the frame-blocking check in Phase 1.
- **Keep the web build working.** The extension currently runs in vscode.dev. Features that need Node.js must degrade gracefully there.
- **View-only mode** (the extension's `isViewOnly()`, for example git diffs) hides all insert and edit UI.
- **Every programmatic scene change must save and undo correctly.** Use `excalidrawAPI.updateScene({ ..., captureUpdate: CaptureUpdateAction.IMMEDIATELY })` so it joins the undo stack, and make sure the changed element's `version` increases. The webview only sends changes to VS Code when `hashElementsVersion(elements)` changes (see `main.tsx`), so an edit that doesn't bump a version will never mark the file dirty or save.

## 4. Facts already verified in this codebase (re-check, don't trust blindly)

**Extension host (`src/`)**
- Files: `extension.ts`, `editor.ts` (custom editor provider, builds the webview HTML), `document.ts`, `commands.ts`, `uri-handler.ts`, `utils.ts`, `lang.ts`.
- Built by `webpack.config.js` with `target: "webworker"`. `package.json` has only a `"browser"` entry, so it's a web extension with **no Node APIs** today, and its `fetch` is subject to CORS.
- `editor.ts` reads `webview/dist/index.html`, injects a base64 config into `data-excalidraw-config`, and sets `window.EXCALIDRAW_ASSET_PATH` to the webview `dist` folder URI (with a trailing slash). **No Content Security Policy is set.**
- Identity strings to rename: the custom editor `viewType` `editor.excalidraw`; every command and setting prefixed `excalidraw.`; `libraryReturnUrl` hard-coded as `vscode://pomdtr.excalidraw-editor/importLib` in `App.tsx`; `window.EXCALIDRAW_EXPORT_SOURCE` in `webview/index.html` pointing at the original Marketplace page; the URI handler.

**Webview (`webview/`)**
- React 18, Vite 6, TypeScript 5.7, `@excalidraw/excalidraw` ^0.18.1 (0.18.1 is the current latest on npm).
- `App.tsx` renders `<Excalidraw>` and passes **no `validateEmbeddable` and no `renderEmbeddable`**.
- `main.tsx` loads the file and debounces `onChange` (250 ms), comparing `hashElementsVersion`.
- `vscode.ts` serializes per file type: JSON via `serializeAsJSON(..., "local")`, which drops files not referenced by any element; SVG via `exportToSvg`; PNG via `exportToBlob`.

**Excalidraw 0.18.1 behavior that matters here**
- The default embed allowlist covers only youtube.com, youtu.be, vimeo.com, player.vimeo.com, figma.com, link.excalidraw.com, gist.github.com, twitter.com, x.com, *.simplepdf.eu, stackblitz.com, val.town, giphy.com and reddit.com.
- The built-in embed `<iframe>` uses `scrolling="no"` and a sandbox that only includes `allow-same-origin` for a short list of known providers. Most other sites can't scroll, and many break without same-origin storage access.
- `renderEmbeddable(element, appState)` replaces the built-in iframe. Returning `null` falls back to the built-in one.
- **Dark mode:** Excalidraw inverts the whole canvas (`invert(93%) hue-rotate(180deg)`). Raster images (PNG, JPEG, WebP) get a counter-filter so they keep their real colors. **SVG images do not.** So SVG icons invert exactly like normal strokes (good for icons), while an SVG code block would show the wrong theme colors (so code blocks must be PNG).
- **Double-clicking a selected image starts image cropping.** Icons and code blocks need that intercepted.
- Exports you'll need: `CaptureUpdateAction`, `convertToExcalidrawElements`, `newElementWith`, `sceneCoordsToViewportCoords`, `viewportCoordsToSceneCoords`, `Sidebar`, `MainMenu`, `Footer`. Useful props: `renderTopRightUI`, `onScrollChange`, `onPointerUp`.

---

## Phase 0: Set up the fork (no features yet)

**Tasks**
1. Add the original repo as the `upstream` remote. Run `npm install` and `npm run build`, launch the Extension Development Host (F5), and confirm everything works **before** changing anything.
2. Rename the identity to `{{DISPLAY_NAME}}` / `{{EXT_NAME}}` / `{{PUBLISHER}}` / `{{PREFIX}}` everywhere listed in section 4: `viewType`, all command IDs, all setting keys, `libraryReturnUrl`, `EXCALIDRAW_EXPORT_SOURCE`, the URI handler, and the `contributes` titles and categories. Keep the same file associations (`*.excalidraw`, `*.excalidraw.json`, `*.excalidraw.svg`, `*.excalidraw.png`). It must be possible to install it alongside the original extension; tell me how to pick it as the default editor.
3. Licensing: keep the original MIT `LICENSE` with its copyright line, add my copyright line under it, and add a README note: "Based on excalidraw-vscode by pomdtr (MIT)".
4. Write `docs/ARCHITECTURE.md`: how a file is loaded, edited, serialized and saved; the message types between host and webview; where settings flow into the webview; and where each new feature will plug in.
5. Create `docs/PROGRESS.md` and `docs/TESTING.md` (a manual regression checklist, see below).

**Acceptance (regression baseline, which every later phase must keep passing)**
- Open, edit and save `.excalidraw`, `.excalidraw.svg` and `.excalidraw.png` files. The unsaved-changes dot, Save, Revert, Undo/Redo, theme (light/dark/auto), language setting, library import and workspace library all behave exactly as before.
- Opening a file from a git diff is view-only.
- The web build still loads (for example with `npx @vscode/test-web --extensionDevelopmentPath=.`).

---

## Phase 1: Make web embeds work

**Tasks**
1. **Diagnose first.** Using Excalidraw's own web-embed tool, try: a YouTube video, a docs site such as react.dev, a site known to refuse framing (github.com or google.com), and a local Vite dev server on `http://localhost:5173`. Report what fails and why, **before fixing anything**. Suspects to confirm or rule out: the default allowlist, `scrolling="no"`, the sandbox missing `allow-same-origin`, sites sending `X-Frame-Options` or CSP `frame-ancestors`, and limits of VS Code's own webview sandbox (popups, fullscreen).
2. **`validateEmbeddable`**, driven by settings:
   - `{{PREFIX}}.embeds.allowAllDomains` (boolean, default `true`): any `http`/`https` URL is allowed.
   - `{{PREFIX}}.embeds.allowedDomains` (string array): used when the above is `false`.
   - `localhost`, `127.0.0.1` and `[::1]` (any port) are always allowed.
   - Always reject `javascript:`, `data:`, `file:`, `vscode:` and other non-web schemes.
3. **`renderEmbeddable`**:
   - For URLs Excalidraw already handles (its provider list in section 4), return `null` to keep its built-in behavior.
   - For everything else, render a `WebFrame` component: an `<iframe>` with scrolling enabled; sandbox `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads`; the same `allow` list Excalidraw uses; and `referrerPolicy="strict-origin-when-cross-origin"`.
   - Add a small hover toolbar on the frame: Reload, Open in browser (`vscode.env.openExternal` via a host message), Open in VS Code's Simple Browser (`simpleBrowser.show`), and Show as link card.
   - Excalidraw's select, drag, resize and click-to-interact behavior must stay exactly as it is.
4. **Detect sites that refuse framing (desktop only).**
   - Add a Node.js build of the extension host: a second webpack config with `target: "node"`, output `dist/extension-node.js`, and `"main"` in `package.json`, while keeping `"browser"` for vscode.dev. Share the code; put Node-only code behind a small interface.
   - In the Node host, request the URL (5 s timeout, follow redirects) and check the `X-Frame-Options` header and CSP `frame-ancestors`. Also read the page title and favicon for the link card. Cache results per URL for the session.
   - If the site refuses framing, render a **link card** instead: favicon, title, URL, plus Open in browser, Open in Simple Browser, and Try embedding anyway.
   - On the web build, skip the check and just try to embed (the toolbar's "Show as link card" still works).
   - Save the user's choice per element in `customData` (`{ embedMode: "frame" | "card" }`).
   - Setting: `{{PREFIX}}.embeds.detectBlockedSites` (boolean, default `true`).
5. **Remote sessions (SSH/WSL/Codespaces):** when `vscode.env.remoteName` is set, map `localhost` URLs through `vscode.env.asExternalUri` before framing.
6. YouTube: if it shows a player error inside the webview, investigate the referrer policy. If it can't be fixed, document it.

**Acceptance**
- react.dev embeds and **scrolls**. A local Vite app embeds, and hot reload shows inside the frame.
- github.com shows a link card automatically on desktop. Its buttons work.
- YouTube and Figma behave as well as or better than before.
- Embeds move, resize, delete and undo normally, and they save and reload with the file.
- In exports, embeds appear as Excalidraw's normal placeholder.
- In vscode.dev, nothing crashes.

---

## Phase 2: Built-in icon library

**Tasks**
1. **Shared scene helpers** (`webview/src/lib/`), also used by Phase 3:
   - `insertImageElement({ dataURL, mimeType, width, height, customData, at })`: add the file with `excalidrawAPI.addFiles`, add the element, select it, undoable.
   - `replaceImageOfElement(elementId, { dataURL, mimeType, width, height, customData })`: keep the same element ID and top-left position, swap the file, bump the version, undoable.
   - A **floating selection toolbar** anchored to the selected element (`sceneCoordsToViewportCoords`), kept in place on scroll, zoom and move. It's hidden while dragging and in view-only mode.
   - **Double-click interception:** a capture-phase `dblclick` listener on the wrapper that, only when the hit and selected element has our `customData.kind`, stops the event (so cropping doesn't start) and opens our editor instead. Any other double-click passes through untouched. Pressing Enter with one of our elements selected does the same. Check that the context-menu image actions (crop and others) behave sensibly on our elements.
2. **Icon data pipeline:**
   - Dependencies: `@iconify/utils`, `@iconify-json/ri` (Remix), `@iconify-json/feather`, `@iconify-json/tabler`, `@iconify-json/simple-icons`.
   - A build script (run on `predev` and `prebuild`) writes `webview/public/icons/<prefix>.json` per set plus a compact `icons/index.json` search index (set, name, aliases or categories where available). The generated files are git-ignored.
   - The webview loads these lazily with `fetch(window.EXCALIDRAW_ASSET_PATH + "icons/...")`: the index when the panel first opens, a set's full data only when it's needed.
   - A registry file `iconSets.ts` (prefix, display name, license, style `stroke` or `fill`), so adding a set later is one entry plus one package.
3. **SVG builder:**
   - Use `iconToSVG` and `iconToHTML`, and replace `currentColor` with the chosen color.
   - For stroke sets (Feather, Tabler), set `stroke-width`.
   - Use unique IDs (`replaceIDs`).
   - Set a large intrinsic `width`/`height` (for example 512) while keeping the original `viewBox`, so icons stay sharp when zoomed. Verify this.
   - Output an `image/svg+xml` data URL.
   - SVG is deliberate: in dark mode, icons invert exactly like native strokes.
4. **Icon panel:**
   - An Excalidraw `Sidebar` named `icons`, with a trigger placed next to the Library button (via `renderTopRightUI`) and a command `{{PREFIX}}.insertIcon` that toggles it in the active editor.
   - Search box (debounced; ranking: exact match, then prefix, then contains; also matches aliases). Set filter chips. A **virtualized** grid (only visible icons render). Recents (last 24) and favorites, saved via the extension's `globalState` so they're shared across files.
   - Insert options: color (defaults to Excalidraw's current stroke color, `appState.currentItemStrokeColor`), size presets 24/32/48/64/96 (default from `{{PREFIX}}.icons.defaultSize`, 48), and stroke width (stroke sets only).
   - Click inserts at the viewport center. Dragging an icon onto the canvas inserts it at the drop point (`viewportCoordsToSceneCoords`).
   - Typing in the search box must never trigger Excalidraw shortcuts.
5. **Editing a placed icon:**
   - The floating toolbar has color, size, stroke width and Replace icon (opens the panel in replace mode, keeping position and size). Double-click or Enter opens the same controls.
   - With several icons selected, a color change applies to all of them.
   - `customData`: `{ kind: "icon", v: 1, set, name, color, strokeWidth }`.
6. Setting `{{PREFIX}}.icons.enabledSets` (default: all four).

**Acceptance**
- Search "database", "user" and "docker" across all sets in under 100 ms after the first load. Scrolling the full Tabler grid stays smooth.
- Insert by click and by drag. Recolor, resize and replace. Undo/Redo each step. Save, close, reopen: everything is intact.
- Light and dark themes: a default-colored icon looks like a normal stroke in both.
- The file opens on excalidraw.com with icons visible as images.
- `.excalidraw.svg` and `.excalidraw.png` exports include the icons.
- Phase 0 regression checklist passes.

---

## Phase 3: Code blocks

**Tasks**
1. **Dependencies:**
   - `shiki`: use `shiki/core` with `createJavaScriptRegexEngine` (no WASM), and lazy fine-grained imports of languages and themes.
   - CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/language-data`).
   - `@fontsource/jetbrains-mono` (OFL).
   - First verify that lazy-loaded chunks resolve correctly inside the webview (Vite's `base` versus the webview resource URI). Fix it if needed and tell me what you changed.
2. **Renderer** `renderCodeBlock(options): Promise<{ dataURL, width, height }>`:
   - Get tokens from Shiki `codeToTokens`, then draw them on an offscreen canvas with JetBrains Mono (loaded via the `FontFace` API from the bundled woff2) at `scale` (default 3, setting `{{PREFIX}}.codeBlock.renderScale`). Export as **PNG**, because Excalidraw keeps raster images' true colors in dark mode (section 4).
   - Layout: theme background, 8 px rounded corners, 16 px padding, 1.5 line height.
   - Optional title bar showing a filename, with optional macOS window dots.
   - Optional line-number gutter in the theme's muted color.
   - Highlighted lines get a translucent background that suits the theme.
   - Bold and italic token styles. Tabs become 2 spaces. No line wrapping.
   - Warn above 500 lines.
   - The element's on-canvas size is the canvas size divided by `scale`.
3. **Editor modal:**
   - CodeMirror with syntax highlighting, line numbers, bracket matching, auto-closing brackets, Tab to indent. It follows the Excalidraw theme.
   - Controls: language (searchable; common languages first: JS, TS, JSX, TSX, JSON, HTML, CSS, SCSS, Python, Java, C, C++, C#, Go, Rust, PHP, Ruby, Kotlin, Swift, SQL, Bash, PowerShell, YAML, TOML, Markdown, Dockerfile, GraphQL, Diff, plain text; then any other Shiki language), theme (github-light, github-dark, one-dark-pro, dracula, nord, vitesse-light, vitesse-dark, catppuccin-latte, catppuccin-mocha), font size, line numbers, title, window dots, highlight lines (input like `3, 5-7`).
   - A live preview of the actual rendered image, debounced.
   - Save with Ctrl/Cmd+Enter, cancel with Esc. Keystrokes inside the modal never reach Excalidraw. Focus returns to the canvas on close.
   - Remember the last-used language, theme and options.
4. **Insert:** a Code button next to the Icons trigger, plus the command `{{PREFIX}}.insertCodeBlock`. The block is inserted at the viewport center and selected.
5. **Edit:**
   - Double-click (intercepted before cropping), Enter, or the floating toolbar's Edit button opens the modal with the saved code and options.
   - Saving re-renders via `replaceImageOfElement`: same element ID, same top-left, new size, undoable.
   - The floating toolbar also has Copy code, which is available in view-only mode too.
   - `customData`: `{ kind: "code-block", v: 1, code, language, theme, fontSize, lineNumbers, title, windowControls, highlightLines, scale }`.
6. **Settings:**
   - `{{PREFIX}}.codeBlock.defaultTheme`: default `auto`, meaning github-light on a light canvas and github-dark on a dark canvas at insert time.
   - `{{PREFIX}}.codeBlock.defaultLanguage`: `javascript`.
   - `{{PREFIX}}.codeBlock.fontSize`: 16.
   - `{{PREFIX}}.codeBlock.showLineNumbers`: `true`.
   - `{{PREFIX}}.codeBlock.windowControls`: `false`.

**Acceptance**
- Insert JS, Python, Bash and JSON blocks. Each looks like VS Code's highlighting for its theme, and is crisp at 200% zoom.
- In a dark canvas, a github-dark block shows true github-dark colors (not inverted).
- Edit an existing block: the code and options reload, the position is kept, and Undo/Redo works.
- Copy code copies the exact source.
- Save, close, reopen: everything is intact. On excalidraw.com the block shows as an image.
- PNG and SVG exports include the blocks.
- Typing `a`, `r`, `Delete` or `Ctrl+Z` in the modal never affects the canvas.
- Phase 0 regression checklist passes.

---

## Phase 4: Polish and package

**Tasks**
1. **`THIRD_PARTY_NOTICES.md`**: Excalidraw (MIT), excalidraw-vscode by pomdtr (MIT), Remix Icon (Apache-2.0, include the license text), Feather (MIT), Tabler Icons (MIT), Simple Icons (CC0-1.0, plus a note that brand logos remain their owners' trademarks), Shiki (MIT), CodeMirror (MIT), JetBrains Mono (OFL-1.1), Iconify utils (MIT), and any other bundled dependency. Ship it in the `.vsix`.
2. **README:** features with screenshot placeholders, settings table, commands, known limitations (sites that refuse framing; VS Code sandbox limits on popups and fullscreen; icons and code blocks are plain images in other Excalidraw editors), and credits. Also a `CHANGELOG.md` entry for `0.1.0`.
3. **Packaging:**
   - `.vscodeignore` must include `webview/dist` and `dist` and exclude sources, `node_modules` and dev files.
   - Add `npm run package` (`npx @vscode/vsce package`).
   - Report the final `.vsix` size and the webview bundle size, and point out the biggest chunks.
   - Do **not** publish.
4. **Code quality:** run a full pass of `docs/TESTING.md` (regression plus all phase acceptance items) and report the results.
5. Give me the exact commands to build the `.vsix` and install it (`code --install-extension <file>.vsix`), and how to make it the default editor for `.excalidraw` files.

## Optional extras (only when I say yes after Phase 4)

- **Add Selection to Drawing**: an editor context-menu command that sends the selected code, with its `languageId`, to the most recently focused drawing as a code block.
- A Lucide icon set.
- A strict Content Security Policy for the webview (it must still allow framing of `https:` and localhost, plus `data:` and `blob:` images, fonts and workers). Propose it and test it; don't add it if it risks breaking Excalidraw.

## Definition of done

All phases are complete. Every acceptance item and the regression checklist pass. The web build loads without errors. The `.vsix` installs and works in a fresh VS Code window. `docs/PROGRESS.md` is fully ticked.