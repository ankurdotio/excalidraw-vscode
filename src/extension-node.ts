import * as vscode from "vscode";

import { checkEmbed } from "./embedCheck.node";
import { activateExtension } from "./extension";

export async function activate(context: vscode.ExtensionContext) {
  await activateExtension(context, { checkEmbed });
}
