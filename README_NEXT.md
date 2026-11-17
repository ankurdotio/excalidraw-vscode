# ex+

Based on excalidraw-vscode by pomdtr (MIT).

This extension integrates Excalidraw into VS Code.
To use it, create an empty file with a `.excalidraw`, `.excalidraw.json`,
`.excalidraw.svg`, or `.excalidraw.png` extension and open it in VS Code.

Try the web version at : <https://excalidraw.com/>

![screenshot](https://raw.githubusercontent.com/excalidraw/excalidraw-vscode/master/medias/screenshot.png)

## Configuration

### Switch Excalidraw Theme

![theme switching](https://raw.githubusercontent.com/excalidraw/excalidraw-vscode/master/medias/change-theme.gif)

### Import Public Library

![library import](https://raw.githubusercontent.com/excalidraw/excalidraw-vscode/master/medias/import-library.gif)

### Switch between multiple file formats

Update the document extension to the desired format. For example, `document.excalidraw` -> `document.excalidraw.png`.

### Associate Additional Extensions With the Excalidraw Editor

By default, this extension handles `*.excalidraw`, `*.excalidraw.json`,
`*.excalidraw.svg`, and `*.excalidraw.png` files. Choose **Open With...** on a
matching file, then **Configure default editor for...**, and select
**ex+** to make it the default.

Add this to your VS Code settings.json file if you want to associate it with additional file extensions (ex: SVG):

```json
{
  "workbench.editorAssociations": {
    "*.svg": "excalidrawStudio.editor"
  }
}
```

You won't be able to edit arbitrary SVG files though - only those that have been created with Excalidraw or this extension!

### Sharing your Library

If you want to use a workspace specific library (and share it with other contributors), add this to your vscode workspace settings file (`.vscode/settings.json`):

```json
{
  "excalidrawStudio.workspaceLibraryPath": "path/to/library.excalidrawlib"
}
```

The workspaceLibraryPath path is relative to your workspace root.
