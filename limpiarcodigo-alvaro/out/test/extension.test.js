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
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = __importStar(require("vscode"));
// import * as myExtension from '../../extension';
suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');
    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
        assert.strictEqual(-1, [1, 2, 3].indexOf(0));
    });
    test('limpiarCodigo command quita console.log, comentarios e imports no usados', async () => {
        const contenidoOriginal = [
            "import React from 'react';",
            "import { useState } from 'react';",
            "import Unused from './unused';",
            '',
            '// comentario de prueba',
            'function Hola(props) {',
            '\tconst noUsada = 42;',
            "\tconsole.log('debug', props);",
            '\tconst [count] = useState(0);',
            '\treturn <div>Hola {count}</div>;',
            '}',
            '',
            'export default Hola;',
            '',
        ].join('\n');
        const tmpFile = path.join(os.tmpdir(), `limpiar-test-${Date.now()}.jsx`);
        fs.writeFileSync(tmpFile, contenidoOriginal, 'utf8');
        try {
            const document = await vscode.workspace.openTextDocument(tmpFile);
            const editor = await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand('limpiarcodigo-alvaro.limpiarCodigo');
            const resultado = editor.document.getText();
            assert.ok(!resultado.includes('console.log'), 'no debería quedar console.log');
            assert.ok(!resultado.includes('// comentario de prueba'), 'no debería quedar el comentario');
            assert.ok(!resultado.includes('noUsada'), 'no debería quedar la variable no usada');
            assert.ok(!resultado.includes("./unused"), 'no debería quedar el import no usado');
            assert.ok(resultado.includes('useState'), 'debe conservar lo que sí se usa');
            assert.ok(resultado.includes('Hola {count}'), 'debe conservar el JSX');
        }
        finally {
            await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
            fs.unlinkSync(tmpFile);
        }
    }).timeout(10000);
});
//# sourceMappingURL=extension.test.js.map