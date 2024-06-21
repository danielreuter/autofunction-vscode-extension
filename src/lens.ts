/**
 *
 * CodeLens provider for each TS/JS file in the workspace.
 *
 * Exposes an EventEmitter that the Store will use to trigger
 * CodeLens updates.
 */
import * as vscode from "vscode";
import { extractCompilerCalls } from "./ast";

export function createLens() {
  const provider = new CodeLensProvider();
  const subscription = vscode.languages.registerCodeLensProvider(
    { scheme: "file", language: "typescript" }, // todo
    provider,
  );
  return { provider, subscription };
}

class CodeLensProvider implements vscode.CodeLensProvider {
  onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const calls = extractCompilerCalls(document);
    const lenses: vscode.CodeLens[] = [];
    for (const call of calls) {
      const match = document.getText().match(call.chunk);
      if (match && match.index) {
        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position);
        lenses.push(
          new vscode.CodeLens(range, {
            title: `test`,
            command: "",
            arguments: [],
          }),
          new vscode.CodeLens(range, {
            title: "Paste code",
            command: "extension.pasteCode",
            arguments: [],
          }),
        );
      }
    }

    return lenses;
  }
}
