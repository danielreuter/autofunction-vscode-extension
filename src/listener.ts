/**
 *
 * Need to listen to changes in .functions/cache.json to update
 * the extension's global state---the state of all functions in the
 * application.
 *
 *
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FnDisk, readRepositoryDisk } from "autofunction";

export async function createRepositoryListener({
  onUpdate,
}: {
  onUpdate: (disk: FnDisk) => void;
}) {
  // Find /.functions/cache.json
  const diskPath = await poll(findDiskPath);

  // Watch for changes
  const watcher = vscode.workspace.createFileSystemWatcher(diskPath);

  async function updateDisk() {
    try {
      const repoDir = path.dirname(diskPath);
      const disk = await readRepositoryDisk(repoDir);
      onUpdate(disk);
    } catch (error) {
      console.error(error);
    }
  }

  updateDisk();
  watcher.onDidChange(updateDisk);
  watcher.onDidCreate(updateDisk);
  watcher.onDidDelete(() => {
    watcher.dispose();
    createRepositoryListener({ onUpdate });
  });
}

async function poll<T>(fn: () => Promise<T>, wait: number = 5000): Promise<T> {
  try {
    console.log("polling");
    return await fn();
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, wait));
    return await poll(fn, wait);
  }
}

async function findDiskPath() {
  const diskPaths = await vscode.workspace.findFiles(
    "**/.functions/cache.json",
  );
  if (diskPaths.length > 1) {
    const paths = diskPaths.map((uri) => uri.fsPath).join("\n");
    vscode.window.showErrorMessage(
      `Multiple Autofunction repositories found:\n${paths}\nYou should only have one.`,
    );
    throw new Error("Multiple repositories found");
  } else if (diskPaths.length === 1) {
    console.log("Found repository at", diskPaths[0].fsPath);
    return diskPaths[0].fsPath;
  } else {
    console.log("No repositories found");
    throw new Error("No repositories found");
  }
}
