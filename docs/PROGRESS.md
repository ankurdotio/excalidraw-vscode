# Build progress

This checklist tracks the tasks and acceptance criteria in
[`COPILOT_PROMPT.md`](./COPILOT_PROMPT.md). A phase is complete only after its
checks pass, its commit is created, and its summary is reported.

## Phase 0: Set up the fork

- [x] Add the original repository as the `upstream` remote.
- [x] Run `npm install` and `npm run build` before changing source.
- [x] Launch the Extension Development Host and confirm the editor works
      visually (user confirmed the manual F5 checks passed).
- [x] Rename extension identity to Excalidraw Studio / `excalidraw-studio` /
      `your-publisher-id` / `excalidrawStudio`.
- [x] Rename custom editor view type, commands, setting keys, library-return
      URL, export source, URI-handler class, and contribution labels.
- [x] Preserve associations for `.excalidraw`, `.excalidraw.json`,
      `.excalidraw.svg`, and `.excalidraw.png`.
- [x] Keep the original MIT license and add the fork copyright line.
- [x] Add the requested README attribution.
- [x] Write `docs/ARCHITECTURE.md`.
- [x] Create this progress checklist.
- [x] Create `docs/TESTING.md`.
- [x] Use a distinct extension identifier for side-by-side installation and
      document the default-editor selection flow.
- [ ] Install the packaged extension alongside the original and confirm both
      editor choices work.
- [x] Pass the Phase 0 manual regression checklist in `docs/TESTING.md`
      (user-confirmed via F5).
- [x] Build passes after the identity changes.
- [x] Lint passes after the identity changes.
- [ ] Web smoke test passes. This is non-blocking until Phase 4. The previous
      `npm run open-in-browser` attempt failed before Chromium started
      (`spawn Unknown system error -88`); the no-browser fallback also could not
      load the test workbench assets.
- [ ] Create the Phase 0 commit.

## Phase 0 acceptance

- [x] Open, edit, and save `.excalidraw`, `.excalidraw.svg`, and
      `.excalidraw.png` files.
- [x] Verify unsaved indicator, Save, and Revert.
- [x] Verify Undo and Redo.
- [x] Verify light, dark, and auto themes.
- [x] Verify language setting.
- [x] Verify library import and workspace library.
- [x] Verify a Git-diff drawing is view-only.
- [ ] Verify the web build loads in a browser (non-blocking until Phase 4).

## Phase 1: Make web embeds work

- [ ] Diagnose YouTube, react.dev, github.com/google.com, and localhost:5173
      with Excalidraw's embed tool before changing behavior.
- [ ] Report diagnosis of allowlist, scrolling, sandbox, frame-blocking headers,
      and VS Code webview restrictions.
- [ ] Implement `validateEmbeddable` using the `excalidrawStudio.embeds.*`
      settings; allow HTTP(S), configured hosts, and localhost loopback, and reject
      all other schemes.
- [ ] Add unit tests for URL validation and frame-header parsing.
- [ ] Keep built-in providers on Excalidraw's renderer.
- [ ] Render other URLs in a scrollable frame with the required sandbox,
      permissions, and referrer policy.
- [ ] Add Reload, Open in browser, Open in Simple Browser, and Show as link card
      actions without changing selection/drag/resize/click behavior.
- [ ] Add a Node-targeted host bundle alongside the browser bundle, with
      desktop-only frame-blocking checks, page title/favicon metadata, a 5-second
      timeout, redirect handling, and per-session URL caching.
- [ ] Render blocked sites as link cards with the required actions and
      Try-embedding override; store `embedMode` in element `customData`.
- [ ] Skip frame checks in the web extension build.
- [ ] Map remote localhost URLs with `vscode.env.asExternalUri`.
- [ ] Diagnose/document any YouTube referrer-policy failure.
- [ ] Verify react.dev scrolling and localhost Vite hot reload.
- [ ] Verify github.com link-card behavior and all card actions on desktop.
- [ ] Verify YouTube and Figma behavior.
- [ ] Verify embeds move, resize, delete, undo, save, and reload.
- [ ] Verify embeds export as Excalidraw placeholders.
- [ ] Verify vscode.dev does not crash.

## Phase 2: Built-in icon library

- [ ] Add shared image insertion/replacement and floating-toolbar helpers.
- [ ] Test shared pure helpers and the icon SVG builder.
- [ ] Add selective double-click and Enter interception; review context-menu
      image actions.
- [ ] Add the four named icon packages and `@iconify/utils`.
- [ ] Generate offline icon data and search index from a build script; ignore
      generated files and lazy-load index/set data.
- [ ] Add the icon-set registry with prefix, display name, license, and style.
- [ ] Implement SVG building with color replacement, stroke width, unique IDs,
      large intrinsic dimensions, and data URLs.
- [ ] Add the Excalidraw Sidebar, toolbar trigger, and insert command.
- [ ] Implement ranked debounced search, aliases, set chips, virtualized grid,
      recents, favorites, and global-state persistence.
- [ ] Add color, size, stroke-width, click insertion, and drag insertion.
- [ ] Add edit/replace controls, multi-selection recoloring, and the specified
      icon `customData`.
- [ ] Ensure replacement keeps the image element ID, top-left position, and
      size; ensure typing in search never invokes Excalidraw shortcuts.
- [ ] Add the enabled-sets setting.
- [ ] Verify database/user/docker search timing and smooth full-set scrolling.
- [ ] Verify click/drag insertion, recolor, resize, replace, Undo/Redo, and
      save/reopen.
- [ ] Verify light/dark appearance and excalidraw.com compatibility.
- [ ] Verify PNG/SVG exports and Phase 0 regression.

## Phase 3: Code blocks

- [ ] Add the specified Shiki, CodeMirror, and JetBrains Mono dependencies.
- [ ] Use `shiki/core` with the JavaScript regex engine (no WASM) and lazy,
      fine-grained language/theme imports.
- [ ] Verify lazy chunk resolution in the webview and adjust Vite base handling
      if required.
- [ ] Implement the PNG renderer with syntax tokens, layout, font, title,
      optional dots/gutter/highlight, tab conversion, token styles, and line limit.
- [ ] Implement the CodeMirror editor modal, syntax language/theme controls,
      options, preview, keyboard behavior, and remembered preferences.
- [ ] Include searchable language selection, the specified common languages
      and themes, font-size/line-number/title/window-dot/highlight controls, and
      modal keyboard isolation.
- [ ] Add Code insertion UI/command and select the inserted block.
- [ ] Add block editing, toolbar actions, view-only Copy code, and the specified
      code-block `customData`.
- [ ] Test code-block layout and highlight-line parsing pure functions.
- [ ] Add the specified settings.
- [ ] Verify JS/Python/Bash/JSON rendering, crisp zoom, and correct dark colors.
- [ ] Verify edit reloads source/options, position retention, and Undo/Redo.
- [ ] Verify exact Copy code content and save/reopen compatibility.
- [ ] Verify PNG/SVG exports, modal shortcut isolation, and Phase 0 regression.

## Phase 4: Polish and package

- [ ] Add complete third-party notices and ship them in the VSIX.
- [ ] Update README with features, screenshot placeholders, settings, commands,
      limitations, credits, and changelog entry for 0.1.0.
- [ ] Configure `.vscodeignore`, package script, and VSIX packaging.
- [ ] Exclude generated web/host bundles and source, dependencies, and
      development files from the packaged extension.
- [ ] Report VSIX/webview sizes and largest chunks; do not publish.
- [ ] Run the complete `docs/TESTING.md` regression and acceptance checklist.
- [ ] Report exact build/install commands and default-editor configuration.

## Optional extras

- [ ] Await explicit approval before implementing Add Selection to Drawing,
      Lucide icons, or a strict webview CSP.

## Definition of done

- [ ] All required phases and acceptance checks are complete.
- [ ] The web build loads without errors.
- [ ] The VSIX installs and works in a fresh VS Code window.
- [ ] All required `docs/PROGRESS.md` items are checked.
