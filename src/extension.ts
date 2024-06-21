import * as vscode from "vscode";
import { createLens } from "./lens";
import { createRepositoryListener } from "./listener";
import { FnDisk } from "autofunction";

export function activate(context: vscode.ExtensionContext) {
  const lens = createLens();
  context.subscriptions.push(lens.subscription);

  createRepositoryListener({
    onUpdate: (disk) => {
      lens.provider.updateDisk(disk);
    },
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.debug", (message: string) => {
      vscode.window.showInformationMessage(message);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.pasteCode",
      async (
        document: vscode.TextDocument,
        position: vscode.Position,
        code: string,
      ) => {
        try {
          const edit = new vscode.WorkspaceEdit();
          edit.insert(document.uri, position, code);
          await vscode.workspace.applyEdit(edit);
        } catch (error) {
          vscode.window.showErrorMessage(
            "Failed to paste code. Please report this. Error: " +
              (error as any).message,
          );
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.copyErrorToClipboard",
      async (
        error: string
      ) => {
        try {
          await vscode.env.clipboard.writeText(error);
          vscode.window.showInformationMessage('Error copied to clipboard!');
        } catch (err) {
          vscode.window.showErrorMessage('Failed to copy error to clipboard: ' + (err as any).message);
        }
      },
    ),
  );
}

export function deactivate() {}
