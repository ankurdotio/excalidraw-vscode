import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { ExcalidrawEditorProvider } from "./editor";
import { ExcalidrawStudioUriHandler } from "./uri-handler";
import type { EmbedHostServices } from "./embedTypes";

export async function activate(context: vscode.ExtensionContext) {
  await activateExtension(context);
}

export async function activateExtension(
  context: vscode.ExtensionContext,
  embedServices?: EmbedHostServices
) {
  // Register our custom editor providers
  context.subscriptions.push(
    await ExcalidrawEditorProvider.register(context, embedServices)
  );
  context.subscriptions.push(ExcalidrawStudioUriHandler.register());
  registerCommands(context);
}
