/**
 *
 * CodeLens provider for each TS/JS file in the workspace.
 *
 * Exposes an EventEmitter that the Store will use to trigger
 * CodeLens updates.
 */
import * as vscode from "vscode";
import { extractCompilerCalls } from "./ast";
import { FnDisk, FnSnapshot } from "autofunction";

export function createLens() {
  const provider = new CodeLensProvider();
  const subscription = vscode.languages.registerCodeLensProvider(
    [
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "javascript" },
      { scheme: "file", language: "javascriptreact" },
      { scheme: "file", language: "typescriptreact" },
    ],
    provider,
  );
  return { provider, subscription };
}

class CodeLensProvider implements vscode.CodeLensProvider {
  onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  refreshLenses() {
    this.onDidChangeCodeLensesEmitter.fire();
    vscode.commands.executeCommand("editor.action.codelens.refresh");
  }

  disk: FnDisk;

  constructor() {
    this.disk = {
      data: {},
      metadata: { lastUpdated: Date.now() },
    };
  }

  updateDisk(disk: FnDisk) {
    this.disk = disk;
    this.refreshLenses();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    // Find all compiler calls in the file
    const calls = extractCompilerCalls(document);
    return calls.flatMap((call) => {
      // Find the position of the call in the file
      const code = document.getText();
      const chunkMatch = code.match(call.chunk);
      if (!chunkMatch?.index) {
        return [];
      }

      // Get range of the call chunk
      const startPosition = document.positionAt(chunkMatch.index);
      const endPosition = document.positionAt(
        chunkMatch.index + chunkMatch[0].length,
      );
      const range = new vscode.Range(startPosition, endPosition);

      // Find matching snapshots in the disk
      const entries = Object.entries(this.disk.data);
      const candidates: FnSnapshot[] = [];
      for (const [id, snapshot] of entries) {
        if (snapshot.do.match(call.description)) {
          candidates.push(snapshot);
        }
      }

      // Pick the last one if updated since last save
      const { lastUpdated } = this.disk.metadata;
      candidates.sort((a, b) => b.timestamp - a.timestamp);
      const snapshot = candidates[0];

      if (!snapshot || snapshot.timestamp < lastUpdated) {
        // Todo add an on-click info message
        // -> it's stale
        return [
          new vscode.CodeLens(range, {
            title: `Not called yet`,
            command: "",
            arguments: [],
          }),
        ];
      }

      switch (snapshot.status) {
        case "success":
          try {
            const position = findInsertPosition(document, range);
            const arrowFn = convertToArrowFn(snapshot.code.fn);
            const newCode = ", " + arrowFn;
            return [
              new vscode.CodeLens(range, {
                title: `Compiled`,
                command: "",
                arguments: [],
              }),
              new vscode.CodeLens(range, {
                title: `Paste code`,
                command: "extension.pasteCode",
                arguments: [document, position, newCode],
              }),
            ];
          } catch (error) {
            return [];
          }

        case "failure":
          return [
            new vscode.CodeLens(range, {
              title: `Failed to compile`,
              command: "",
              arguments: [],
            }),
            new vscode.CodeLens(range, {
              title: `Copy error to clipboard`,
              command: "extension.copyErrorToClipboard",
              arguments: [snapshot.error],
            }),
          ];
        case "compiling":
          return [
            new vscode.CodeLens(range, {
              title: `Compiling...`,
              command: "",
              arguments: [],
            }),
          ];
      }
    });
  }
}

function convertToArrowFn(fn: string): string {
  // Regular expression to match the async function declaration
  const asyncFuncRegex =
    /async function\s*([a-zA-Z_$][0-9a-zA-Z_$]*)?\s*\(([^)]*)\)\s*{\s*([\s\S]*?)\s*}/;
  const match = fn.match(asyncFuncRegex);

  if (!match) {
    throw new Error("Invalid async function string");
  }

  const args = match[2];
  const body = match[3];

  // Create the arrow function string
  const arrowFuncStr = `async (${args}) => { ${body} }`;
  return arrowFuncStr;
}

// todo - fails if called right away
function findInsertPosition(
  document: vscode.TextDocument,
  range: vscode.Range,
): vscode.Position {
  const code = document.getText(range);
  const closingBracketIndex = code.lastIndexOf("}");
  if (closingBracketIndex === -1) {
    throw new Error("Could not find the closing bracket for insertion");
  }
  const offset = closingBracketIndex + 1;
  return document.positionAt(document.offsetAt(range.start) + offset);
}
