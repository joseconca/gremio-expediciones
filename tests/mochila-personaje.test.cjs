require("./load-typescript.cjs");
const fs = require("node:fs");
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
const MochilaPersonaje = require("../src/components/personaje/MochilaPersonaje.tsx").default;
const { RANURAS_EQUIPO } = require("../src/components/personaje/EquipoPersonaje.tsx");
const equipoVacio = Object.fromEntries(RANURAS_EQUIPO.map(({ clave }) => [clave, null]));
const objeto = (id, nombre, tipo, slot) => ({
  id: "instancia-" + id, cantidad: 1, nivelMejora: 0, bonificaciones: {},
  objeto: { id, nombre, descripcion: "Descripción de " + nombre, tipo, slot, rareza: "comun", precio: 100 },
});
const espada = objeto("espada_larga", "Espada larga", "arma", "arma");
const casco = objeto("casco_cuero", "Casco de cuero", "armadura", "casco");
const anillo = objeto("anillo_simple", "Anillo sencillo", "accesorio", "anillo");
const pocion = objeto("pocion_roja", "Poción roja", "consumible", undefined);
const material = objeto("escama_dragon", "Escama de dragón", "material", undefined);

const datosBase = {
  inventario: [], equipo: equipoVacio, oro: 300,
  espaciosInventario: { ocupados: 0, maximo: 30 },
  ultimaVenta: null,
};
const base = {
  datos: datosBase, inventario: [], objetosEquipados: new Set(),
  categoria: "todo", onCategoria() {}, cargando: false,
  bloqueado: false, procesando: null, onAccionObjeto: async () => {},
};
function render(props = {}) {
  return renderToStaticMarkup(React.createElement(MochilaPersonaje, { ...base, ...props }));
}
function botones(html, texto) {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .filter((match) => match[2].includes(texto))
    .map((match) => ({ atributos: match[1], contenido: match[2] }));
}
function deshabilitado(atributos) {
  return /(?:^|\s)disabled(?:=|\s|$)/.test(atributos);
}

test("la mochila conserva seis categorías, capacidad, oro y el estado vacío", () => {
  const html = render();
  assert.match(html, /Mochila e inventario/);
  assert.match(html, /Espacios: 0\/30/);
  assert.match(html, /Oro: 300/);
  for (const categoria of ["Todo", "Armas", "Armaduras", "Accesorios", "Consumibles", "Varios"]) {
    assert.ok(html.includes(categoria), categoria);
  }
  assert.match(html, /Mochila vacía/);
  assert.match(html, /Visitar la Armería/);
  assert.match(html, /Espacio para futuros materiales y drops/);
});

test("el filtro solo muestra los objetos de su categoría sin perder el agrupado de armaduras", () => {
  const inventario = [espada, casco, anillo, pocion, material];
  const armas = render({ inventario, categoria: "armas" });
  assert.match(armas, /Espada larga/);
  for (const nombre of ["Casco de cuero", "Anillo sencillo", "Poción roja", "Escama de dragón"]) {
    assert.ok(!armas.includes(nombre), nombre);
  }
  const armaduras = render({ inventario, categoria: "armaduras" });
  assert.match(armaduras, /Armaduras por ranura/);
  assert.match(armaduras, /Cascos/);
  assert.match(armaduras, /Casco de cuero/);
  assert.doesNotMatch(armaduras, /Espada larga/);
});

test("cada anillo conserva las dos ranuras de equipamiento", () => {
  const html = render({ inventario: [anillo], categoria: "accesorios" });
  assert.match(html, /Anillo sencillo/);
  assert.equal(botones(html, "Equipar anillo I").length, 2); // I es subcadena de II
  assert.equal(botones(html, "Equipar anillo II").length, 1);
  assert.equal(botones(html, "Vender ·").length, 1);
});

test("una pieza equipada permite retirarse pero no venderse", () => {
  const html = render({
    inventario: [espada], categoria: "armas",
    datos: { ...datosBase, equipo: { ...equipoVacio, arma: espada } },
    objetosEquipados: new Set([espada.id]),
  });
  assert.match(html, /Espada larga/);
  assert.match(html, /Equipado/);
  assert.equal(botones(html, "Desequipar").length, 1);
  assert.equal(botones(html, "Vender ·").length, 0);
});

test("la venta y la recompra se bloquean cuando corresponde", () => {
  const oferta = { nombreObjeto: "Espada larga", precioRecompra: 450, vendidoEn: "armeria" };
  const html = render({
    inventario: [espada], categoria: "armas", bloqueado: true,
    datos: { ...datosBase, ultimaVenta: oferta },
  });
  assert.equal(botones(html, "Equipar").length, 1);
  assert.ok(deshabilitado(botones(html, "Equipar")[0].atributos));
  assert.ok(deshabilitado(botones(html, "Vender ·")[0].atributos));
  assert.ok(deshabilitado(botones(html, "Recomprar última venta")[0].atributos));

  const disponible = render({ datos: { ...datosBase, ultimaVenta: { ...oferta, precioRecompra: 200 } } });
  assert.equal(deshabilitado(botones(disponible, "Recomprar última venta")[0].atributos), false);

  const llena = render({ datos: { ...datosBase, ultimaVenta: { ...oferta, precioRecompra: 200 }, espaciosInventario: { ocupados: 30, maximo: 30 } } });
  assert.equal(deshabilitado(botones(llena, "Recomprar última venta")[0].atributos), true);
});

test("los datos en carga muestran el indicador sin presentar objetos de inventario", () => {
  const html = render({ inventario: [espada], cargando: true });
  assert.match(html, /Preparando la mochila/);
  assert.doesNotMatch(html, /Espada larga/);
});
