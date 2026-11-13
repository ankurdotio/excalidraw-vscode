import * as vscode from "vscode";
import * as path from "path";
import { Base64 } from "js-base64";
import { readVSCodeTheme } from "./codeBlockTheme";

import { ExcalidrawDocument } from "./document";
import { languageMap } from "./lang";
import { showEditor } from "./commands";
import type { EmbedHostServices, EmbedSettings } from "./embedTypes";
import { clearActiveIconPanel, setActiveIconPanel } from "./iconPanelCommand";
import {
  clearActiveCodeBlockEditor,
  setActiveCodeBlockEditor,
} from "./codeBlockCommand";
import {
  clearActiveWebFrameEditor,
  setActiveWebFrameEditor,
} from "./webFrameCommand";
import {
  CODE_BLOCK_THEMES,
  DEFAULT_CODE_BLOCK_SETTINGS,
} from "./codeBlockTypes";
import type {
  CodeBlockPreferences,
  CodeBlockSettings,
  CodeBlockTheme,
} from "./codeBlockTypes";
import {
  DEFAULT_ICON_PREFERENCES,
  DEFAULT_ICON_SETTINGS,
  ICON_SET_IDS,
} from "./iconTypes";
import type {
  IconPreferences,
  IconReference,
  IconSetId,
  IconSettings,
} from "./iconTypes";

export class ExcalidrawEditorProvider
  implements vscode.CustomEditorProvider<ExcalidrawDocument>
{
  public static async register(
    context: vscode.ExtensionContext,
    embedServices?: EmbedHostServices
  ): Promise<vscode.Disposable> {
    const provider = new ExcalidrawEditorProvider(context, embedServices);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      ExcalidrawEditorProvider.viewType,
      provider,
      {
        supportsMultipleEditorsPerDocument: false,
        webviewOptions: { retainContextWhenHidden: true },
      }
    );

    ExcalidrawEditorProvider.migrateLegacyLibraryItems(context);

    return providerRegistration;
  }

  private static migrateLegacyLibraryItems(context: vscode.ExtensionContext) {
    const libraryItems = context.globalState.get("libraryItems");
    if (!libraryItems) {
      return;
    }
    context.globalState
      .update(
        "library",
        JSON.stringify({
          type: "excalidrawlib",
          version: 2,
          source:
            "https://marketplace.visualstudio.com/items?itemName=your-publisher-id.excalidraw-studio",
          libraryItems,
        })
      )
      .then(() => {
        context.globalState.update("libraryItems", undefined);
      });
  }

  private static readonly viewType = "excalidrawStudio.editor";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly embedServices?: EmbedHostServices
  ) {}

  public async resolveCustomEditor(
    document: ExcalidrawDocument,
    webviewPanel: vscode.WebviewPanel
  ) {
    const editor = new ExcalidrawEditor(
      document,
      webviewPanel.webview,
      this.context,
      this.embedServices
    );
    const editorDisposable = await editor.setupWebview();
    const updateActiveEditor = () => {
      if (webviewPanel.active) {
        setActiveIconPanel(webviewPanel, async () => {
          if (editor.isViewOnly()) {
            return false;
          }
          return webviewPanel.webview.postMessage({
            type: "toggle-icon-panel",
          });
        });
        setActiveCodeBlockEditor(webviewPanel, async () => {
          if (editor.isViewOnly()) {
            return false;
          }
          return webviewPanel.webview.postMessage({ type: "open-code-block" });
        });
        setActiveWebFrameEditor(webviewPanel, async () => {
          if (editor.isViewOnly()) {
            return false;
          }
          return webviewPanel.webview.postMessage({
            type: "activate-web-frame",
          });
        });
      } else {
        clearActiveIconPanel(webviewPanel);
        clearActiveCodeBlockEditor(webviewPanel);
        clearActiveWebFrameEditor(webviewPanel);
      }
    };
    updateActiveEditor();
    const onDidChangeViewState =
      webviewPanel.onDidChangeViewState(updateActiveEditor);

    webviewPanel.onDidDispose(() => {
      onDidChangeViewState.dispose();
      clearActiveIconPanel(webviewPanel);
      clearActiveCodeBlockEditor(webviewPanel);
      clearActiveWebFrameEditor(webviewPanel);
      editorDisposable.dispose();
    });
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentContentChangeEvent<ExcalidrawDocument>
  >();
  public readonly onDidChangeCustomDocument =
    this._onDidChangeCustomDocument.event;

  async backupCustomDocument(
    document: ExcalidrawDocument,
    context: vscode.CustomDocumentBackupContext
  ): Promise<vscode.CustomDocumentBackup> {
    return document.backup(context.destination);
  }

  // TODO: Backup Support
  async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext
  ): Promise<ExcalidrawDocument> {
    let content: Uint8Array;
    if (uri.scheme === "untitled") {
      content = new TextEncoder().encode(
        JSON.stringify({ type: "excalidraw", elements: [] })
      );
    } else {
      content = await vscode.workspace.fs.readFile(
        openContext.backupId ? vscode.Uri.parse(openContext.backupId) : uri
      );
    }
    const document = new ExcalidrawDocument(uri, content);

    const onDidDocumentChange = document.onDidContentChange(() => {
      this._onDidChangeCustomDocument.fire({ document });
    });

    document.onDidDispose(() => {
      onDidDocumentChange.dispose();
    });

    return document;
  }

  revertCustomDocument(document: ExcalidrawDocument): Thenable<void> {
    return document.revert();
  }

  saveCustomDocument(document: ExcalidrawDocument): Thenable<void> {
    return document.save();
  }

  async saveCustomDocumentAs(
    document: ExcalidrawDocument,
    destination: vscode.Uri
  ) {
    await document.saveAs(destination);
  }
}

export class ExcalidrawEditor {
  // Allows to pass events between editors
  private static _onDidChangeLibrary = new vscode.EventEmitter<string>();
  private static onDidChangeLibrary =
    ExcalidrawEditor._onDidChangeLibrary.event;
  private static _onLibraryImport = new vscode.EventEmitter<{
    library: string;
  }>();
  private static onLibraryImport = ExcalidrawEditor._onLibraryImport.event;
  private static _onDidChangeIconPreferences =
    new vscode.EventEmitter<IconPreferences>();
  private static onDidChangeIconPreferences =
    ExcalidrawEditor._onDidChangeIconPreferences.event;
  private static _onDidChangeCodeBlockPreferences = new vscode.EventEmitter<
    CodeBlockPreferences | undefined
  >();
  private static onDidChangeCodeBlockPreferences =
    ExcalidrawEditor._onDidChangeCodeBlockPreferences.event;
  private textDecoder = new TextDecoder();
  private codeThemeWarning: string | undefined;

  constructor(
    readonly document: ExcalidrawDocument,
    readonly webview: vscode.Webview,
    readonly context: vscode.ExtensionContext,
    readonly embedServices?: EmbedHostServices
  ) {}

  isViewOnly() {
    return (
      this.document.uri.scheme === "git" ||
      this.document.uri.scheme === "conflictResolution"
    );
  }

  public async setupWebview() {
    // Setup initial content for the webview
    // Receive message from the webview.
    this.webview.options = {
      enableScripts: true,
    };

    let libraryUri = await this.getLibraryUri();

    const onDidReceiveMessage = this.webview.onDidReceiveMessage(
      async (msg) => {
        switch (msg.type) {
          case "library-change":
            const library = msg.library;
            await this.saveLibrary(library, libraryUri);
            ExcalidrawEditor._onDidChangeLibrary.fire(library);
            break;
          case "change":
            await this.document.update(new Uint8Array(msg.content));
            break;
          case "link-open":
            await openLink(vscode.Uri.parse(msg.url), this.document.uri);
            break;
          case "error":
            vscode.window.showErrorMessage(msg.content);
            break;
          case "info":
            vscode.window.showInformationMessage(msg.content);
            break;
          case "embed-check":
            await this.handleEmbedCheck(msg.url);
            break;
          case "embed-open":
            await this.handleEmbedOpen(msg.action, msg.url);
            break;
          case "embed-map-url":
            await this.handleEmbedMapUrl(msg.url);
            break;
          case "icon-preferences-change": {
            const preferences = this.normalizeIconPreferences(msg.preferences);
            await this.context.globalState.update(
              "icons.preferences",
              preferences
            );
            ExcalidrawEditor._onDidChangeIconPreferences.fire(preferences);
            break;
          }
          case "code-block-preferences-change": {
            const preferences = this.normalizeCodeBlockPreferences(
              msg.preferences
            );
            await this.context.globalState.update(
              "codeBlock.preferences",
              preferences
            );
            ExcalidrawEditor._onDidChangeCodeBlockPreferences.fire(preferences);
            break;
          }
        }
      },
      this
    );

    const onDidChangeThemeConfiguration =
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          !e.affectsConfiguration("excalidrawStudio.theme", this.document.uri)
        ) {
          return;
        }
        this.webview.postMessage({
          type: "theme-change",
          theme: this.getTheme(),
        });
      }, this);

    const onDidChangeIconsConfiguration =
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          !e.affectsConfiguration("excalidrawStudio.icons", this.document.uri)
        ) {
          return;
        }
        this.webview.postMessage({
          type: "icons-settings-change",
          iconSettings: this.getIconSettings(),
        });
      }, this);

    let codeSettingsRequest = 0;
    const postCodeBlockSettings = async () => {
      const request = ++codeSettingsRequest;
      const settings = await this.getCodeBlockSettings();
      if (request === codeSettingsRequest) {
        this.webview.postMessage({
          type: "code-block-settings-change",
          settings,
        });
      }
    };
    const onDidChangeCodeBlockConfiguration =
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          !e.affectsConfiguration(
            "excalidrawStudio.codeBlock",
            this.document.uri
          ) &&
          !e.affectsConfiguration("workbench.colorTheme") &&
          !e.affectsConfiguration("workbench.colorCustomizations") &&
          !e.affectsConfiguration("editor.tokenColorCustomizations")
        ) {
          return;
        }
        void postCodeBlockSettings();
      }, this);
    const onDidChangeCodeBlockTheme = vscode.window.onDidChangeActiveColorTheme(
      () => void postCodeBlockSettings()
    );

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        !e.affectsConfiguration("excalidrawStudio.language", this.document.uri)
      ) {
        return;
      }
      this.webview.postMessage({
        type: "language-change",
        langCode: this.getLanguage(),
      });
    }, this);

    const onDidChangeEmbedConfiguration =
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          !e.affectsConfiguration("excalidrawStudio.image", this.document.uri)
        ) {
          return;
        }
        this.webview.postMessage({
          type: "image-params-change",
          imageParams: this.getImageParams(),
        });
      }, this);

    const onDidChangeEmbedsConfiguration =
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          !e.affectsConfiguration("excalidrawStudio.embeds", this.document.uri)
        ) {
          return;
        }
        this.webview.postMessage({
          type: "embed-settings-change",
          embedSettings: this.getEmbedSettings(),
        });
      }, this);

    const onDidChangeLibraryConfiguration =
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (
          !e.affectsConfiguration(
            "excalidrawStudio.workspaceLibraryPath",
            this.document.uri
          )
        ) {
          return;
        }

        libraryUri = await this.getLibraryUri();
        const library = await this.loadLibrary(libraryUri);
        this.webview.postMessage({
          type: "library-change",
          library,
          merge: false,
        });
      });

    const onLibraryImport = ExcalidrawEditor.onLibraryImport(
      async ({ library }) => {
        this.webview.postMessage({
          type: "library-change",
          library,
          merge: true,
        });
      }
    );

    const onDidChangeLibrary = ExcalidrawEditor.onDidChangeLibrary(
      (library) => {
        this.webview.postMessage({
          type: "library-change",
          library,
          merge: false,
        });
      }
    );
    const onDidChangeIconPreferences =
      ExcalidrawEditor.onDidChangeIconPreferences((preferences) => {
        this.webview.postMessage({
          type: "icon-preferences-change",
          preferences,
        });
      });

    const onDidChangeCodeBlockPreferences =
      ExcalidrawEditor.onDidChangeCodeBlockPreferences((preferences) => {
        this.webview.postMessage({
          type: "code-block-preferences-change",
          preferences,
        });
      });

    this.webview.html = await this.buildHtmlForWebview({
      content: Array.from(this.document.content),
      contentType: this.document.contentType,
      library: await this.loadLibrary(libraryUri),
      viewModeEnabled: this.isViewOnly() || undefined,
      embedSettings: this.getEmbedSettings(),
      embedCheckAvailable: Boolean(this.embedServices?.checkEmbed),
      remoteSession: Boolean(vscode.env.remoteName),
      iconSettings: this.getIconSettings(),
      iconPreferences: this.getIconPreferences(),
      codeBlockSettings: await this.getCodeBlockSettings(),
      codeBlockPreferences: this.getCodeBlockPreferences(),
      theme: this.getTheme(),
      imageParams: this.getImageParams(),
      langCode: this.getLanguage(),
      name: this.extractName(this.document.uri),
    });

    return new vscode.Disposable(() => {
      onDidReceiveMessage.dispose();
      onDidChangeThemeConfiguration.dispose();
      onLibraryImport.dispose();
      onDidChangeLibraryConfiguration.dispose();
      onDidChangeLibrary.dispose();
      onDidChangeEmbedConfiguration.dispose();
      onDidChangeEmbedsConfiguration.dispose();
      onDidChangeIconsConfiguration.dispose();
      onDidChangeCodeBlockConfiguration.dispose();
      onDidChangeCodeBlockTheme.dispose();
      onDidChangeIconPreferences.dispose();
      onDidChangeCodeBlockPreferences.dispose();
    });
  }

  private normalizeIconPreferences(input: unknown): IconPreferences {
    const value =
      input && typeof input === "object"
        ? (input as Partial<IconPreferences>)
        : DEFAULT_ICON_PREFERENCES;
    const normalizeReferences = (references: unknown, limit: number) => {
      if (!Array.isArray(references)) {
        return [];
      }
      const unique = new Map<string, IconReference>();
      for (const reference of references) {
        if (
          !reference ||
          typeof reference !== "object" ||
          !ICON_SET_IDS.includes((reference as IconReference).set) ||
          typeof (reference as IconReference).name !== "string" ||
          !/^[a-z0-9][a-z0-9-]*$/i.test((reference as IconReference).name)
        ) {
          continue;
        }
        const validReference = reference as IconReference;
        unique.set(
          `${validReference.set}/${validReference.name}`,
          validReference
        );
        if (unique.size >= limit) {
          break;
        }
      }
      return [...unique.values()];
    };
    return {
      recent: normalizeReferences(value.recent, 24),
      favorites: normalizeReferences(value.favorites, 500),
    };
  }

  private getIconPreferences() {
    return this.normalizeIconPreferences(
      this.context.globalState.get("icons.preferences")
    );
  }

  private normalizeCodeBlockPreferences(
    input: unknown
  ): CodeBlockPreferences | undefined {
    if (!input || typeof input !== "object") {
      return undefined;
    }
    const value = input as Partial<CodeBlockPreferences>;
    if (
      typeof value.language !== "string" ||
      typeof value.theme !== "string" ||
      !CODE_BLOCK_THEMES.includes(value.theme as CodeBlockTheme) ||
      typeof value.fontSize !== "number" ||
      !Number.isFinite(value.fontSize) ||
      value.fontSize < 6 ||
      value.fontSize > 48 ||
      typeof value.lineNumbers !== "boolean" ||
      typeof value.title !== "string" ||
      typeof value.windowControls !== "boolean" ||
      typeof value.highlightLines !== "string"
    ) {
      return undefined;
    }
    return {
      language: value.language,
      theme: value.theme as CodeBlockTheme,
      fontSize: value.fontSize,
      lineNumbers: value.lineNumbers,
      title: value.title,
      windowControls: value.windowControls,
      highlightLines: value.highlightLines,
    };
  }

  private getCodeBlockPreferences() {
    return this.normalizeCodeBlockPreferences(
      this.context.globalState.get("codeBlock.preferences")
    );
  }

  private async getCodeBlockSettings(): Promise<CodeBlockSettings> {
    const configuration = vscode.workspace.getConfiguration("excalidrawStudio");
    const dark =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
      vscode.window.activeColorTheme.kind ===
        vscode.ColorThemeKind.HighContrast;
    let vscodeTheme;
    try {
      vscodeTheme = await readVSCodeTheme();
      this.codeThemeWarning = undefined;
    } catch (error) {
      const message = `Unable to load the active VS Code code-block theme: ${
        error instanceof Error ? error.message : String(error)
      } Using the built-in VS Code ${dark ? "dark" : "light"} palette instead.`;
      if (this.codeThemeWarning !== message) {
        this.codeThemeWarning = message;
        void vscode.window.showWarningMessage(message);
      }
    }
    const configuredFontSize = configuration.get<number>(
      "codeBlock.fontSize",
      DEFAULT_CODE_BLOCK_SETTINGS.fontSize
    );
    return {
      defaultTheme: dark ? "dark-plus" : "light-plus",
      vscodeTheme,
      defaultLanguage: configuration.get(
        "codeBlock.defaultLanguage",
        DEFAULT_CODE_BLOCK_SETTINGS.defaultLanguage
      ),
      fontSize:
        Number.isFinite(configuredFontSize) &&
        configuredFontSize >= 6 &&
        configuredFontSize <= 48
          ? configuredFontSize
          : DEFAULT_CODE_BLOCK_SETTINGS.fontSize,
      showLineNumbers: configuration.get(
        "codeBlock.showLineNumbers",
        DEFAULT_CODE_BLOCK_SETTINGS.showLineNumbers
      ),
      windowControls: configuration.get(
        "codeBlock.windowControls",
        DEFAULT_CODE_BLOCK_SETTINGS.windowControls
      ),
    };
  }

  private getIconSettings(): IconSettings {
    const configuration = vscode.workspace.getConfiguration("excalidrawStudio");
    const configuredSets = configuration.get<unknown[]>("icons.enabledSets", [
      ...ICON_SET_IDS,
    ]);
    const enabledSets = (configuredSets ?? []).filter(
      (value): value is IconSetId =>
        typeof value === "string" && ICON_SET_IDS.includes(value as IconSetId)
    );
    const configuredSize = configuration.get<number>(
      "icons.defaultSize",
      DEFAULT_ICON_SETTINGS.defaultSize
    );
    const validSizes = [24, 32, 48, 64, 96];
    return {
      enabledSets,
      defaultSize: validSizes.includes(configuredSize)
        ? configuredSize
        : DEFAULT_ICON_SETTINGS.defaultSize,
    };
  }

  private getEmbedSettings(): EmbedSettings {
    const configuration = vscode.workspace.getConfiguration("excalidrawStudio");
    return {
      allowAllDomains: configuration.get("embeds.allowAllDomains", true),
      allowedDomains: configuration.get("embeds.allowedDomains", []),
      detectBlockedSites: configuration.get("embeds.detectBlockedSites", true),
    };
  }

  private async handleEmbedCheck(url: string) {
    if (!this.getEmbedSettings().detectBlockedSites || !this.embedServices) {
      return;
    }

    try {
      const result = await this.embedServices.checkEmbed?.(url);
      if (result) {
        await this.webview.postMessage({
          type: "embed-check-result",
          result,
        });
      }
    } catch (error) {
      await this.webview.postMessage({
        type: "embed-check-result",
        result: {
          url,
          blocked: false,
          title: url,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private async handleEmbedOpen(action: string, value: string) {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Only HTTP and HTTPS links can be opened from embeds.");
      }

      if (action === "simple-browser") {
        await vscode.commands.executeCommand(
          "simpleBrowser.show",
          url.toString()
        );
        return;
      }
      if (action === "external") {
        await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
        return;
      }
      throw new Error(`Unknown embed action: ${action}`);
    } catch (error) {
      await vscode.window.showErrorMessage(
        `Unable to open embedded page: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async handleEmbedMapUrl(value: string) {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Only HTTP and HTTPS embed URLs can be mapped.");
      }
      const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
      const isLoopback =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1";
      const mappedUrl =
        vscode.env.remoteName && isLoopback
          ? await vscode.env.asExternalUri(vscode.Uri.parse(url.toString()))
          : vscode.Uri.parse(url.toString());

      await this.webview.postMessage({
        type: "embed-url-result",
        url: value,
        mappedUrl: mappedUrl.toString(),
      });
    } catch (error) {
      await this.webview.postMessage({
        type: "embed-url-result",
        url: value,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private getImageParams() {
    return vscode.workspace.getConfiguration("excalidrawStudio").get("image");
  }

  private getLanguage() {
    return (
      vscode.workspace.getConfiguration("excalidrawStudio").get("language") ||
      languageMap[vscode.env.language as keyof typeof languageMap]
    );
  }

  private getTheme() {
    return vscode.workspace
      .getConfiguration("excalidrawStudio")
      .get("theme", "light");
  }

  public extractName(uri: vscode.Uri) {
    const name = path.parse(uri.fsPath).name;
    return name.endsWith(".excalidraw") ? name.slice(0, -11) : name;
  }

  public async getLibraryUri() {
    const libraryPath = await vscode.workspace
      .getConfiguration("excalidrawStudio")
      .get<string>("workspaceLibraryPath");
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!libraryPath || !workspaceFolders) {
      return;
    }

    const fileWorkspace = getFileWorkspaceFolder(
      this.document.uri,
      workspaceFolders as vscode.WorkspaceFolder[]
    );
    if (!fileWorkspace) {
      return;
    }

    return vscode.Uri.joinPath(fileWorkspace.uri, libraryPath);
  }

  public static importLibrary(library: string) {
    this._onLibraryImport.fire({ library });
  }

  public async loadLibrary(libraryUri?: vscode.Uri) {
    if (!libraryUri) {
      return this.context.globalState.get<string>("library");
    }
    try {
      const libraryContent = await vscode.workspace.fs.readFile(libraryUri);
      return this.textDecoder.decode(libraryContent);
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to load library: ${e}`);
      return this.context.globalState.get<string>("library");
    }
  }

  public async saveLibrary(library: string, libraryUri?: vscode.Uri) {
    if (!libraryUri) {
      return this.context.globalState.update("library", library);
    }
    try {
      await vscode.workspace.fs.writeFile(
        libraryUri,
        new TextEncoder().encode(library)
      );
    } catch (e) {
      await vscode.window.showErrorMessage(`Failed to save library: ${e}`);
    }
  }

  private async buildHtmlForWebview(config: any): Promise<string> {
    const webviewUri = vscode.Uri.joinPath(
      this.context.extensionUri,
      "webview",
      "dist"
    );
    const content = await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(webviewUri, "index.html")
    );
    let html = this.textDecoder.decode(content);

    html = html.replace(
      "{{data-excalidraw-config}}",
      Base64.encode(JSON.stringify(config))
    );

    html = html.replace(
      "{{excalidraw-asset-path}}",
      `${this.webview.asWebviewUri(webviewUri).toString()}/`
    );

    return this.fixLinks(html, webviewUri);
  }
  private fixLinks(document: string, documentUri: vscode.Uri): string {
    return document.replace(
      new RegExp("((?:src|href)=['\"])(.*?)(['\"])", "gmi"),
      (subString: string, p1: string, p2: string, p3: string): string => {
        const lower = p2.toLowerCase();
        if (
          p2.startsWith("#") ||
          lower.startsWith("http://") ||
          lower.startsWith("https://")
        ) {
          return subString;
        }
        const newUri = vscode.Uri.joinPath(documentUri, p2);
        const newUrl = [p1, this.webview.asWebviewUri(newUri), p3].join("");
        return newUrl;
      }
    );
  }
}

function getFileWorkspaceFolder(
  uri: vscode.Uri,
  workspaceFolders: vscode.WorkspaceFolder[]
): vscode.WorkspaceFolder | undefined {
  const parts = uri.path.split(path.sep).slice(0, -1);
  while (parts.length > 0) {
    const joined = parts.join(path.sep);
    const folder = workspaceFolders.find((f) => f.uri.path === joined);
    if (folder) {
      return folder;
    }
    parts.pop();
  }
}

async function openLink(uri: vscode.Uri, source: vscode.Uri): Promise<void> {
  if (uri.scheme !== "file") {
    await vscode.env.openExternal(uri);
    return;
  }

  const targetUri = vscode.Uri.joinPath(source, "..", uri.path);
  try {
    // Ensure the resource exists and is a file
    const stat = await vscode.workspace.fs.stat(targetUri);
    if (stat.type !== vscode.FileType.File) {
      throw new Error(`${targetUri.fsPath} is not a file`);
    }
  } catch (e) {
    // Otherwise, open it externally
    await vscode.env.openExternal(uri);
    return;
  }

  const extensions = [
    ".excalidraw",
    ".excalidraw.json",
    ".excalidraw.png",
    ".excalidraw.svg",
  ];
  for (const ext of extensions) {
    if (targetUri.fsPath.endsWith(ext)) {
      await showEditor(targetUri);
      return;
    }
  }

  await vscode.window.showTextDocument(targetUri, {
    preview: true,
  });
}
