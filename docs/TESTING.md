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

Append each later phase's acceptance scenarios here as that phase is
implemented.
