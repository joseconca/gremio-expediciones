require("./load-typescript.cjs");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

require.extensions[".tsx"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const CatalogoBotica = require("../src/components/botica/CatalogoBotica.tsx").default;
const MochilaBotica = require("../src/components/botica/MochilaBotica.tsx").default;
const pocion = {
  id: "pocion_vida_menor", nombre: "Poción de prueba", descripcion: "Recupera vida",
  tipo: "consumible", rareza: "basico", precio: 150, duracionTurnos: 3,
};
const elixir = {
  id: "elixir_guerrero", nombre: "Elixir de prueba", descripcion: "Otorga fuerza",
  tipo: "consumible", rareza: "raro", precio: 420,
};
const secciones = [
  { id: "pociones", titulo: "Pociones", icono: "🧪", descripcion: "Remedios", objetos: [pocion] },
  { id: "elixires", titulo: "Elixires", icono: "✨", descripcion: "Potenciadores", objetos: [elixir] },
];
const catalogo = (props = {}) => renderToStaticMarkup(React.createElement(CatalogoBotica, {
  secciones, oro: 1000, procesando: null, onComprar: async () => {}, ...props,
}));
const mochila = (props = {}) => renderToStaticMarkup(React.createElement(MochilaBotica, {
  consumibles: [], cargandoMochila: false, ...props,
}));

test("el catálogo conserva categorías, miniaturas, descripciones, duración y precio", () => {
  const html = catalogo();
  for (const texto of ["Pociones", "Elixires", "Poción de prueba", "Elixir de prueba", "Duración prevista: ", "150", "420"]) {
    assert.ok(html.includes(texto), "Falta: " + texto);
  }
  assert.match(html, /Consultar Poción de prueba/);
  assert.equal((html.match(/>Comprar<\/button>/g) || []).length, 2);
  assert.doesNotMatch(html, /disabled=""/);
});

test("el catálogo conserva los bloqueos por oro insuficiente y compra en curso", () => {
  const sinOro = catalogo({ oro: 0 });
  assert.equal((sinOro.match(/Oro insuficiente/g) || []).length, 2);
  assert.match(sinOro, /disabled=""/);
  const procesando = catalogo({ procesando: pocion.id });
  assert.match(procesando, /Comprando\.\.\./);
  assert.equal((procesando.match(/disabled=""/g) || []).length, 2);
  assert.equal(catalogo({ secciones: [{ ...secciones[0], objetos: [] }] }), "");
});

test("la mochila distingue carga, vacío, cantidades y el detalle de instancia", () => {
  assert.match(mochila({ cargandoMochila: true }), /Cargando consumibles/);
  assert.match(mochila(), /No llevas consumibles/);
  const html = mochila({ consumibles: [{
    id: "pocion-instancia", objetoId: pocion.id, nivelMejora: 0,
    cantidad: 3, bonificaciones: {}, objeto: pocion,
  }] });
  assert.match(html, /3 unidades/);
  assert.match(html, /×3/);
  assert.match(html, /Consultar Poción de prueba/);
});

test("la compra, su refresco y el catálogo desbloqueado permanecen en Botica", () => {
  const pagina = fs.readFileSync(path.join(__dirname, "../src/app/base/botica/page.tsx"), "utf8");
  const catalogoFuente = fs.readFileSync(path.join(__dirname, "../src/components/botica/CatalogoBotica.tsx"), "utf8");
  const mochilaFuente = fs.readFileSync(path.join(__dirname, "../src/components/botica/MochilaBotica.tsx"), "utf8");
  assert.match(pagina, /objeto\.vendibleEnBotica && \(objeto\.nivelBoticaRequerido \?\? 1\) <= nivelBotica/);
  assert.match(pagina, /\/api\/objetos\/comprar/);
  assert.match(pagina, /await Promise\.all\(\[cargarJugador\(\), cargarMochila\(\)\]\)/);
  assert.match(pagina, /<CatalogoBotica/);
  assert.match(pagina, /<MochilaBotica/);
  assert.doesNotMatch(catalogoFuente, /fetch\(/);
  assert.doesNotMatch(mochilaFuente, /fetch\(/);
});
