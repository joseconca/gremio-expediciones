require("./load-typescript.cjs");
const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

require.extensions[".css"] = (module) => { module.exports = { commands: "commands" }; };
require.extensions[".tsx"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const ControlesAsedio = require("../src/components/combate/ControlesAsedio.tsx").default;

const base = {
  mostrarHabilidades: false, accionesDeshabilitadas: false,
  hayHabilidades: true, miTurno: true,
  onAtacar() {}, onAlternarHabilidades() {},
};

function botones(html) {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(match => ({
    atributos: match[1],
    texto: match[2],
  }));
}

test("el asedio muestra los mismos comandos y conserva objetos bloqueados", () => {
  const html = renderToStaticMarkup(React.createElement(ControlesAsedio, base));
  const controles = botones(html);
  assert.equal(controles.length, 3);
  assert.match(controles[0].texto, /ATACAR/);
  assert.match(controles[1].texto, /HABILIDADES/);
  assert.match(controles[2].texto, /OBJETOS/);
  assert.doesNotMatch(controles[0].atributos, /disabled/);
  assert.doesNotMatch(controles[1].atributos, /disabled/);
  assert.match(controles[2].atributos, /disabled/);
  assert.match(html, /TU TURNO/);
});

test("el asedio bloquea acciones fuera de turno y cuando no hay habilidades", () => {
  const html = renderToStaticMarkup(React.createElement(ControlesAsedio, {
    ...base, accionesDeshabilitadas: true, miTurno: false, hayHabilidades: false,
  }));
  assert.ok(botones(html).every(boton => boton.atributos.includes("disabled")));
  assert.match(html, /ESPERANDO AL RIVAL/);
});
