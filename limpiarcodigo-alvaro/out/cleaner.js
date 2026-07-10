"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.limpiarCodigo = limpiarCodigo;
const ts = __importStar(require("typescript"));
function scriptKindForFile(fileName) {
    if (fileName.endsWith('.ts')) {
        return ts.ScriptKind.TS;
    }
    // .js, .jsx, .tsx todos se parsean como TSX para soportar JSX.
    return ts.ScriptKind.TSX;
}
function applyDeletions(text, ranges) {
    const sorted = [...ranges].sort((a, b) => b[0] - a[0]);
    let result = text;
    for (const [start, end] of sorted) {
        result = result.slice(0, start) + result.slice(end);
    }
    return result;
}
function removeComments(text, fileName) {
    const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKindForFile(fileName));
    const fullText = sourceFile.getFullText();
    const ranges = new Map();
    const collect = (commentRanges) => {
        if (!commentRanges) {
            return;
        }
        for (const r of commentRanges) {
            ranges.set(r.pos, r.end);
        }
    };
    const visit = (node) => {
        collect(ts.getLeadingCommentRanges(fullText, node.getFullStart()));
        collect(ts.getTrailingCommentRanges(fullText, node.getEnd()));
        node.forEachChild(visit);
    };
    visit(sourceFile);
    collect(ts.getLeadingCommentRanges(fullText, sourceFile.endOfFileToken.getFullStart()));
    return applyDeletions(text, Array.from(ranges.entries()));
}
const CONSOLE_METHODS = new Set(['log', 'warn', 'error', 'info', 'debug', 'trace']);
function isConsoleCallStatement(node) {
    if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression)) {
        return false;
    }
    const callee = node.expression.expression;
    if (!ts.isPropertyAccessExpression(callee)) {
        return false;
    }
    return ts.isIdentifier(callee.expression) && callee.expression.text === 'console' && CONSOLE_METHODS.has(callee.name.text);
}
function removeConsoleLogs(text, fileName) {
    const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKindForFile(fileName));
    const ranges = [];
    const visit = (node) => {
        if (isConsoleCallStatement(node)) {
            ranges.push([node.getStart(sourceFile), node.getEnd()]);
            return;
        }
        node.forEachChild(visit);
    };
    visit(sourceFile);
    return applyDeletions(text, ranges);
}
function isDeclarationName(identifier) {
    const parent = identifier.parent;
    if (!parent) {
        return false;
    }
    if (ts.isImportSpecifier(parent) && parent.name === identifier) {
        return true;
    }
    if (ts.isImportClause(parent) && parent.name === identifier) {
        return true;
    }
    if (ts.isNamespaceImport(parent) && parent.name === identifier) {
        return true;
    }
    if (ts.isVariableDeclaration(parent) && parent.name === identifier) {
        return true;
    }
    if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
        return true;
    }
    if ((ts.isPropertyAssignment(parent) || ts.isShorthandPropertyAssignment(parent)) && parent.name === identifier) {
        return true;
    }
    if (ts.isJsxAttribute(parent) && parent.name === identifier) {
        return true;
    }
    if (ts.isFunctionDeclaration(parent) && parent.name === identifier) {
        return true;
    }
    if (ts.isClassDeclaration(parent) && parent.name === identifier) {
        return true;
    }
    if (ts.isParameter(parent) && parent.name === identifier) {
        return true;
    }
    if (ts.isBindingElement(parent) && parent.name === identifier) {
        return true;
    }
    return false;
}
function countUsages(sourceFile) {
    const usages = new Map();
    const visit = (node) => {
        if (ts.isIdentifier(node) && !isDeclarationName(node)) {
            usages.set(node.text, (usages.get(node.text) ?? 0) + 1);
        }
        node.forEachChild(visit);
    };
    visit(sourceFile);
    return usages;
}
function removeUnusedImportsAndVars(text, fileName) {
    const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKindForFile(fileName));
    const usages = countUsages(sourceFile);
    const ranges = [];
    const isUnused = (name) => !usages.has(name);
    for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement) && statement.importClause) {
            const clause = statement.importClause;
            let removeWholeStatement = true;
            if (clause.name) {
                if (!isUnused(clause.name.text)) {
                    removeWholeStatement = false;
                }
            }
            if (clause.namedBindings) {
                if (ts.isNamespaceImport(clause.namedBindings)) {
                    if (!isUnused(clause.namedBindings.name.text)) {
                        removeWholeStatement = false;
                    }
                }
                else if (ts.isNamedImports(clause.namedBindings)) {
                    const usedSpecifiers = clause.namedBindings.elements.filter((el) => !isUnused(el.name.text));
                    if (usedSpecifiers.length > 0) {
                        removeWholeStatement = false;
                    }
                    if (usedSpecifiers.length > 0 && usedSpecifiers.length < clause.namedBindings.elements.length) {
                        for (const el of clause.namedBindings.elements) {
                            if (isUnused(el.name.text)) {
                                ranges.push(specifierRangeWithComma(el, clause.namedBindings.elements));
                            }
                        }
                    }
                }
            }
            if (removeWholeStatement) {
                ranges.push([statement.getStart(sourceFile), statement.getEnd()]);
            }
        }
    }
    const visitVariableStatements = (node) => {
        if (ts.isVariableStatement(node)) {
            const declarations = node.declarationList.declarations;
            const unusedDeclarators = declarations.filter((d) => ts.isIdentifier(d.name) && isUnused(d.name.text));
            if (unusedDeclarators.length === declarations.length) {
                ranges.push([node.getStart(sourceFile), node.getEnd()]);
            }
            else {
                for (const d of unusedDeclarators) {
                    ranges.push(specifierRangeWithComma(d, declarations));
                }
            }
        }
        node.forEachChild(visitVariableStatements);
    };
    visitVariableStatements(sourceFile);
    return applyDeletions(text, ranges);
}
function specifierRangeWithComma(node, siblings) {
    const index = siblings.indexOf(node);
    const isLast = index === siblings.length - 1;
    if (!isLast) {
        return [node.getStart(), siblings[index + 1].getStart()];
    }
    const prev = siblings[index - 1];
    return [prev ? prev.getEnd() : node.getStart(), node.getEnd()];
}
function limpiarCodigo(text, fileName, options) {
    let result = text;
    if (options.removeComments) {
        result = removeComments(result, fileName);
    }
    if (options.removeConsoleLogs) {
        result = removeConsoleLogs(result, fileName);
    }
    if (options.removeUnusedImportsAndVars) {
        result = removeUnusedImportsAndVars(result, fileName);
    }
    // TODO: agregar aquí nuevas reglas de limpieza (nueva función tipo removeX(result, fileName) + su opción en CleanOptions)
    return result.replace(/\n{3,}/g, '\n\n');
}
//# sourceMappingURL=cleaner.js.map