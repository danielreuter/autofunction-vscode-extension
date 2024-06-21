import * as vscode from "vscode";
import { createLens } from "./lens";

export function activate(context: vscode.ExtensionContext) {
  const lens = createLens();
  context.subscriptions.push(lens.subscription);
}

export function deactivate() {}
