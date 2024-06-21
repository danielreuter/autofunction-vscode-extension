/**
 *
 * Compute AST on editor focus, use to find positions and contents
 * of compiler calls.
 *
 * We extract two regexes from the call arguments:
 * - `call`: used to recompute position of the call whenever
 *     the CodeLens needs to be recomputed (e.g. on file changes)
 * - `description`: used to match the compiler call to a
 *    function in .functions/cache.json.
 *
 * Desiderata:
 * - `call` should match only if the call arguments have not
 *    changed at all--conservative approach to ensure stale info
 *    is never used. So it should match the whole text chunk.
 */

import * as vscode from "vscode";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

export interface CompilerCall {
  chunk: RegExp;
  description: RegExp;
}

export function extractCompilerCalls(
  document: vscode.TextDocument,
): CompilerCall[] {
  const code = document.getText();
  return _extractCompilerCalls(code);
}

export function _extractCompilerCalls(code: string): CompilerCall[] {
  // console.log(code)
  const ast = parse(code);
  const calls: CompilerCall[] = [];

  traverse(ast, {
    CallExpression(path) {
      // Narrow down to calls whose first arg is an object
      const args = path.node.arguments;
      const line = path.node.loc?.start.line;
      if (!line) {
        return;
      }
      if (args.length === 0) {
        return;
      }
      const firstArg = args[0];
      if (firstArg.type !== "ObjectExpression") {
        return;
      }

      // Find the .do property of the object, if any
      const properties = firstArg.properties;
      for (const prop of properties) {
        if (prop.type !== "ObjectProperty") {
          continue;
        }
        if (!t.isIdentifier(prop.key)) {
          continue;
        }
        if (prop.key.name !== "do") {
          continue;
        }

        // Extract regexes if defined
        const value = prop.value;
        const chunk = Matcher.chunk(code, path.node);

        const description = t.isStringLiteral(value)
          ? Matcher.doStringLiteral(value)
          : t.isTemplateLiteral(value)
            ? Matcher.doTemplateLiteral(value)
            : null;

        if (chunk && description) {
          calls.push({ chunk, description });
        }
      }
    },
  });

  return calls;
}

/**
 *
 * Utility functions for extracting regexes from AST nodes
 * that represent compiler call code chunks + their .do values.
 */
export class Matcher {
  /**
   *
   * @param document
   * @param node
   * @returns RegEx that matches the compiler call assuming its interior is unchanged
   */
  static chunk(code: string, node: t.CallExpression): RegExp | null {
    const callStartLine = node.loc?.start.line;
    const callEndLine = node.loc?.end.line;
    if (callStartLine === undefined || callEndLine === undefined) {
      return null;
    }

    const lines = code.split("\n");
    let call = "";
    for (let i = callStartLine-1; i <= callEndLine-1; i++) {
      console.log("looping", i, lines[i])
      call += lines[i].trim() + " ";
    }

    const str = escapeRegexCharacters(call.trim());
    return new RegExp(str.replace(/\s+/g, "\\s*"), "m");
  }

  static doStringLiteral(value: t.StringLiteral): RegExp {
    const str = escapeRegexCharacters(value.value);
    return new RegExp(str);
  }

  static doTemplateLiteral(value: t.TemplateLiteral): RegExp {
    return new RegExp(
      value.quasis.map((quasi) => {
        const cooked = quasi.value.cooked ?? "";
        return escapeRegexCharacters(cooked);
      }).join(".*"),
    );
  }
}

function escapeRegexCharacters(string: string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function parse(code: string) {
  return parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
}
