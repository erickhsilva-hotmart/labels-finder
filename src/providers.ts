import {
  CompletionItem,
  CompletionItemKind,
  languages,
  Position,
  TextDocument,
} from "vscode";
import { LabelTree, LabelTreeNode } from "./types";

const { registerCompletionItemProvider } = languages;

const getProvider = (sourceFile: LabelTree, documentSelector: string | string[]) => {
  return registerCompletionItemProvider(documentSelector, {
    provideCompletionItems() {
      let completionItems: CompletionItem[] = [];

      for (let key in sourceFile) {
        let completionItem = new CompletionItem(key);
        completionItem.commitCharacters = ["."];
        completionItems.push(completionItem);
      }

      return [...completionItems];
    },
  });
};

const getChildrenProvider = (
  sourceFile: LabelTree,
  documentSelector: string | string[]
) => {
  return registerCompletionItemProvider(
    documentSelector,
    {
      provideCompletionItems(document: TextDocument, position: Position) {
        let isNodeFound = false;
        let completionItems: CompletionItem[] = [];
        let linePrefix = document
          .lineAt(position)
          .text.substr(0, position.character);

        const searchNode = (currentNode: LabelTree, JSONPath: string) => {
          if (isNodeFound) {
            return;
          }

          if (linePrefix.endsWith(`${JSONPath}.`)) {
            isNodeFound = true;

            if (typeof currentNode === "object") {
              for (let key in currentNode) {
                let completionItem = new CompletionItem(key);
                let childrenValue = currentNode[key];

                if (typeof childrenValue === "object") {
                  completionItem.commitCharacters = ["."];
                  completionItem.kind = CompletionItemKind.Property;
                } else {
                  completionItem.detail = childrenValue;
                  completionItem.kind = CompletionItemKind.Field;
                }
                completionItems.push(completionItem);
              }
            }
          } else if (typeof currentNode === "object") {
            for (let key in currentNode) {
              searchNode((currentNode as LabelTreeNode)[key], `${JSONPath}.${key}`);
            }
          }
        };

        for (let key in sourceFile) {
          searchNode(sourceFile[key] as LabelTree, key);
        }

        return isNodeFound ? completionItems : undefined;
      },
    },
    "."
  );
};

const getTextProvider = (
  sourceFile: LabelTree,
  documentSelector: string | string[]
) => {
  return registerCompletionItemProvider(documentSelector, {
    provideCompletionItems() {
      let completionItems: CompletionItem[] = [];

      const searchNode = (currentNode: LabelTree, JSONPath: string) => {
        if (typeof currentNode === "object") {
          for (let key in currentNode) {
            searchNode(currentNode[key] as LabelTree, `${JSONPath}.${key}`);
          }
        } else {
          let completionItem = new CompletionItem(currentNode);

          completionItem.detail = `${JSONPath}: ${currentNode}`;
          completionItem.kind = CompletionItemKind.Field;
          completionItem.insertText = JSONPath;

          completionItems.push(completionItem);
        }
      };

      for (let key in sourceFile) {
        searchNode(sourceFile[key] as LabelTree, key);
      }

      return [...completionItems];
    },
  });
};

export { getProvider, getChildrenProvider, getTextProvider };
