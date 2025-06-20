import { ExtensionContext, window, workspace, Disposable, Uri } from "vscode";
import { promises } from "fs";
import * as path from "path";

import { getProvider, getChildrenProvider, getTextProvider } from "./providers";
import { LabelTree } from "./types";

export async function activate(context: ExtensionContext) {
  const { showWarningMessage } = window;

  const configFileName = "labelsFinder.json";
  const rootPath = workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!rootPath) {
    showWarningMessage("No workspace folder found.");
    return;
  }
  const configFilePath = path.join(rootPath as string, configFileName);

  let sourceFile: LabelTree = {};
  let provider: Disposable | undefined;
  let childrenProvider: Disposable | undefined;
  let textProvider: Disposable | undefined;
  let documentSelector: string | string[] = [];
  let configFile: { labelsPath: string; documentSelector: string[] } = { labelsPath: '', documentSelector: [] };
  let sourceFilePath: string = '';

  async function loadConfig() {
    try {
      const configContent = await promises.readFile(configFilePath, "utf8");
      configFile = JSON.parse(configContent);
    } catch {
      showWarningMessage(
        `Configuration file "${configFileName}" not found on root of your project.`
      );
      return false;
    }
    return true;
  }

  async function loadSourceFile() {
    sourceFilePath = path.join(rootPath as string, configFile.labelsPath);
    try {
      const sourceContent = await promises.readFile(sourceFilePath, "utf8");
      sourceFile = JSON.parse(sourceContent);
    } catch {
      showWarningMessage('Source file not found on specified "labelsPath".');
      return false;
    }
    return true;
  }

  if (!(await loadConfig())) return;
  if (!(await loadSourceFile())) return;

  try {
    documentSelector = configFile.documentSelector;
  } catch {
    showWarningMessage(
      `"documentSelector" not found on config file "${configFileName}"`
    );
    return;
  }

  const refreshProviders = () => {
    provider?.dispose();
    childrenProvider?.dispose();
    textProvider?.dispose();

    provider = getProvider(sourceFile, documentSelector);
    childrenProvider = getChildrenProvider(sourceFile, documentSelector);
    textProvider = getTextProvider(sourceFile, documentSelector);

    context.subscriptions.push(provider, childrenProvider, textProvider);
  };

  // Watch for changes in the source file
  const sourceWatcher = workspace.createFileSystemWatcher(
    sourceFilePath
  );
  sourceWatcher.onDidChange(async () => {
    if (await loadSourceFile()) {
      refreshProviders();
    }
  });
  context.subscriptions.push(sourceWatcher);

  // Watch for changes in the config file
  const configWatcher = workspace.createFileSystemWatcher(
    configFilePath
  );
  configWatcher.onDidChange(async () => {
    if (await loadConfig() && await loadSourceFile()) {
      documentSelector = configFile.documentSelector;
      refreshProviders();
    }
  });
  context.subscriptions.push(configWatcher);

  provider = getProvider(sourceFile, documentSelector);
  childrenProvider = getChildrenProvider(sourceFile, documentSelector);
  textProvider = getTextProvider(sourceFile, documentSelector);

  context.subscriptions.push(provider, childrenProvider, textProvider);
}
