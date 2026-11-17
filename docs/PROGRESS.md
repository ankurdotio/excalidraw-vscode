# Build progress

This checklist tracks the tasks and acceptance criteria in
[`COPILOT_PROMPT.md`](./COPILOT_PROMPT.md). A phase is complete only after its
checks pass, its commit is created, and its summary is reported.

At the user's request, the icon, web-frame, and code-block implementations were
committed separately, with shared integration in the code-block commit. Pending
manual checks still prevent phase sign-off.

The current Marketplace ID is `ankurdotio.excalidraw-studio` and display name
is `ex+`; command and settings prefixes and the editor view type remain
unchanged for compatibility.
Manual confirmation of the rename is pending.

Local HTML embeds: the HTML picker, trusted-workspace validation, isolated
preview, and save/reopen behavior have automated checks; VS Code UI confirmation
is pending.

## Phase 0: Set up the fork

- [x] Add the original repository as the `upstream` remote.
- [x] Run `npm install` and `npm run build` before changing source.
- [x] Launch the Extension Development Host and confirm the editor works
      visually (user confirmed the manual F5 checks passed).
- [x] Rename extension identity to ex+ / `excalidraw-studio` / `ankurdotio` /
      `excalidrawStudio`.
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
- [x] Create the Phase 0 commit (`6600baa`).

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

- Automated preflight confirmed the installed provider allowlist, `scrolling="no"`,
  and conditional `allow-same-origin`; HTTP probes found GitHub sends
  `X-Frame-Options: DENY` and `frame-ancestors 'none'`, while Google sends
  `X-Frame-Options: SAMEORIGIN`. The user asked to proceed before providing the
  requested F5 UI observations, so those manual diagnosis results remain
  unverified.
- [ ] Diagnose YouTube, react.dev, github.com/google.com, and localhost:5173
      with Excalidraw's embed tool before changing behavior.
- [ ] Report diagnosis of allowlist, scrolling, sandbox, frame-blocking headers,
      and VS Code webview restrictions.
- [x] Implement `validateEmbeddable` using the `excalidrawStudio.embeds.*`
      settings; allow HTTP(S), configured hosts, and localhost loopback, and reject
      all other schemes.
- [x] Add unit tests for URL validation and frame-header parsing.
- [x] Keep built-in providers on Excalidraw's renderer.
- [x] Render other URLs in a scrollable frame with the required sandbox,
      permissions, and referrer policy.
- [x] Add Reload, Open in browser, Open in Simple Browser, and Show as link card
      actions without changing selection/drag/resize/click behavior.
- [x] Add a Node-targeted host bundle alongside the browser bundle, with
      desktop-only frame-blocking checks, page title/favicon metadata, a 5-second
      timeout, redirect handling, and per-session URL caching.
- [x] Render blocked sites as link cards with the required actions and
      Try-embedding override; store `embedMode` in element `customData`.
- [x] Skip frame checks in the web extension build.
- [x] Map remote localhost URLs with `vscode.env.asExternalUri`.
- [ ] Diagnose/document any YouTube referrer-policy failure.
- [ ] Verify react.dev scrolling and localhost Vite hot reload.
- [ ] Verify github.com link-card behavior and all card actions on desktop.
- [ ] Verify YouTube and Figma behavior.
- [ ] Verify embeds move, resize, delete, undo, save, and reload.
- [ ] Verify embeds export as Excalidraw placeholders.
- [ ] Verify vscode.dev does not crash (web smoke test is non-blocking until
      Phase 4).
- [x] Commit web-frame components (`59189b6`); shared integration follows in
      the code-block commit.

## Phase 2: Built-in icon library

Phase 2 was started at the user's request; Phase 1 manual confirmation remains
pending.

### Rendering fixes verified automatically

- Fixed the sidebar's missing tab-context crash.
- Removed duplicate SVG namespace attributes that prevented image decoding;
  added a regression test.
- Constrained the grid viewport so the full library does not mount at once:
  the browser check rendered 27–36 previews while scrolling 6,594 Tabler icons.
- Memoized previews/tiles and used small preview SVGs while keeping inserted
  assets at 512 px intrinsic resolution.
- Applied Excalidraw's `--theme-filter` to sidebar previews. Browser checks
  confirmed dark/light/dark switching matches the canvas filter without
  rewriting icon colors, and saved image data decodes successfully.
- Build and 19 unit tests pass; targeted icon lint passes. Host lint has no
  errors and retains five formatting warnings from the in-progress host work.
- VS Code UI confirmation remains pending. Icon components were committed in
  `33f78a3`, with shared integration in the code-block commit. Full performance
  acceptance is not signed off: ordinary row scrolling measured approximately
  16.7 ms per frame, but rapid paging was slower and one warmed search update
  exceeded 100 ms in the local browser check.

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

The user replaced the modal workflow with direct canvas editing and automatic
VS Code theming. Phase 1/2 manual gates remain pending.

- [x] Add the specified Shiki, CodeMirror, and JetBrains Mono dependencies.
- [x] Use `shiki/core` with the JavaScript regex engine (no WASM) and lazy,
      fine-grained language/theme imports.
- [x] Use Vite `base: "./"` so lazy chunks/font URLs are relative to the webview
      resource URI; verify local built-webview loading without asset errors.
- [x] Store code blocks as standard Excalidraw text elements with source/options
      in `customData`; do not render or replace code with images.
- [x] Keep each borderless, transparent CodeMirror surface on the canvas after
      saving and reopening; show language selection and icon-only Cancel/Done
      only while editing.
- [x] Debounce source saves, flush on click-away/Done, and restore the edit
      session baseline on Cancel.
- [x] Let inactive code surfaces pass pointer input through so their standard
      Excalidraw text elements remain selectable and movable.
- [x] Isolate CodeMirror clipboard events from Excalidraw's document handlers;
      cap code-block dimensions at 800 by 520 scene units and scroll large code.
      Native clipboard browser checks confirm copy, cut and paste after reopening
      a selected block, no duplicate canvas text and normal canvas pasting.
      An emulated VS Code webview check verifies clipboard shortcuts reach its
      window listener before a forwarded paste is dispatched.
- [x] Keep Enter and the save shortcut available to CodeMirror after reopening
      a selected code block.
- [x] Read the active VS Code theme, inherited JSONC themes and user TextMate/color
      customizations. Use Shiki colors in the editor; update active surfaces on
      theme changes without a separate theme selector.
- [x] Add Code insertion UI/command for a persistent canvas code surface.
- [x] Add persistent block editing, keyboard isolation and the specified
      code-block `customData`.
- [x] Test code-block layout, highlight parsing, JSONC parsing and saved theme validation.
- [x] Add language/font/line-number/window-control settings; theme
      follows VS Code instead of a separate default-theme setting.
- [x] Fix the nested theme-validator export and unused parser argument; full build passes.
- [x] Browser fixture verifies persistent editor surfaces, live theme token colors,
      source/language reload, same text-element ID/top-left, moving the unfocused
      surface with its text element and reopening it, Undo/Redo, shortcut
      isolation, the 500-line limit and serialized source/theme snapshots.
- [ ] Verify JS/Python/Bash/JSON highlighting, persistent surfaces, zoom, and dark colors.
- [ ] Verify edit reloads source/options, position retention, and Undo/Redo.
- [ ] Verify autosaved source and save/reopen compatibility.
- [ ] Verify the documented export/client limitation, inline shortcut isolation,
      and Phase 0 regression.
- [x] Commit code-block components and shared integration.
- [ ] Receive VS Code manual results for Phase 3.

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
