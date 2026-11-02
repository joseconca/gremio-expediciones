require("./load-typescript.cjs");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const test = require("node:test");
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
const VentaArmeria = require("../src/components/armeria/VentaArmeria.tsx").default;
const espada = {
  id: "espada-1", objetoId: "test_espada", cantidad: 1, nivelMejora: 2, bonificaciones: {},
  objeto: { id: "test_espada", nombre: "Espada de prueba", descripcion: "Hoja de acero", tipo: "arma", rareza: "comun", precio: 300 },
};
const ventaAnterior = { nombreObjeto: "Casco de cuero", precioRecompra: 100, vendidoEn: "armeria" };
const base = {
  ventaAnterior: null, objetosInventarioVendibles: [], idsEquipados: new Set(),
  espaciosInventario: { ocupados: 1, maximo: 30 }, oro: 1000,
  bloqueadoPorEstado: false, cargando: false, procesando: null, mensaje: null,
  onVender: async () => {}, onRecomprar: async () => {},
};
const render = (props = {}) => renderToStaticMarkup(React.createElement(VentaArmeria, { ...base, ...props }));
const botones = (html, texto) => [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  .filter(x => x[2].includes(texto));
const deshabilitado = match => /(?:^|\s)disabled(?:=|\s|$)/.test(match[1]);

test("conserva los estados de carga, inventario vacío y mensajes de venta", () => {
  assert.match(render({ cargando: true }), /Cargando tu equipo/);
  assert.match(render(), /No tienes armas ni armaduras/);
  const html = render({ mensaje: "Objeto vendido." });
  assert.match(html, /Objeto vendido/);
  assert.match(html, /role="status"/);
});

test("una instancia sin equipar se puede vender y abre la información de objeto", () => {
  const html = render({ objetosInventarioVendibles: [espada] });
  assert.match(html, /Espada de prueba/);
  assert.match(html, /Consultar Espada de prueba/);
  assert.match(html, /\+2/);
  const vender = botones(html, "Vender");
  assert.equal(vender.length, 1);
  assert.equal(deshabilitado(vender[0]), false);
});

test("los objetos equipados y los personajes de viaje no pueden vender", () => {
  const equipado = render({
    objetosInventarioVendibles: [espada], idsEquipados: new Set([espada.id]),
  });
  assert.match(equipado, /Desequipar primero/);
  assert.ok(deshabilitado(botones(equipado, "Desequipar primero")[0]));
  const bloqueado = render({ objetosInventarioVendibles: [espada], bloqueadoPorEstado: true });
  assert.ok(deshabilitado(botones(bloqueado, "Vender")[0]));
});

test("la recompra exige oro, espacio y ausencia de otras operaciones", () => {
  const disponible = render({ ventaAnterior });
  const recompra = botones(disponible, "Recomprar ");
  assert.equal(recompra.length, 1);
  assert.equal(deshabilitado(recompra[0]), false);
  const sinOro = render({ ventaAnterior, oro: 0 });
  assert.equal(deshabilitado(botones(sinOro, "Recomprar ")[0]), true);
  const lleno = render({ ventaAnterior, espaciosInventario: { ocupados: 30, maximo: 30 } });
  assert.equal(deshabilitado(botones(lleno, "Recomprar ")[0]), true);
  const procesando = render({ ventaAnterior, procesando: "vender:" + espada.id });
  assert.equal(deshabilitado(botones(procesando, "Recomprar ")[0]), true);
});

test("la página mantiene las operaciones API y el componente solo recibe callbacks", () => {
  const pagina = fs.readFileSync(path.join(__dirname, "../src/app/base/armeria/page.tsx"), "utf8");
  const componente = fs.readFileSync(path.join(__dirname, "../src/components/armeria/VentaArmeria.tsx"), "utf8");
  assert.match(pagina, /<VentaArmeria/);
  assert.match(pagina, /\/api\/objetos\/vender/);
  assert.match(pagina, /\/api\/objetos\/recomprar/);
  assert.match(componente, /window\.confirm/);
  assert.match(componente, /onVender\(item\.id\)/);
  assert.match(componente, /onRecomprar\(\)/);
  assert.doesNotMatch(componente, /fetch\(/);
});
