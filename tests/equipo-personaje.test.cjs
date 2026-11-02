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

const { default: EquipoPersonaje, RANURAS_EQUIPO } = require("../src/components/personaje/EquipoPersonaje.tsx");
const { obtenerEstadisticasNoCero, nombreRareza } = require("../src/components/objetos/resumen-objeto.ts");
const equipoVacio = Object.fromEntries(RANURAS_EQUIPO.map(({ clave }) => [clave, null]));
const casco = { id: "casco-1", nivelMejora: 0, bonificaciones: {}, cantidad: 1,
  objeto: { id: "casco_basico", nombre: "Casco de cuero", descripcion: "Protege la cabeza", tipo: "armadura", slot: "casco", precio: 100, rareza: "comun" } };
const espada = { id: "espada-1", nivelMejora: 0, bonificaciones: {}, cantidad: 1,
  objeto: { id: "espada_basica", nombre: "Espada sencilla", descripcion: "Una espada", tipo: "arma", precio: 100, rareza: "basico", manos: 1 } };
const base = {
  personaje: { clase: "Novato", sexo: "chico", profesionActivaId: "novato" },
  equipo: equipoVacio, inventario: [], objetosEquipados: new Set(),
  cargando: false, bloqueado: false, procesando: null,
  ranuraSeleccionada: null, onSeleccionarRanura() {}, onAccionObjeto: async () => {},
};
const render = (props = {}) => renderToStaticMarkup(React.createElement(EquipoPersonaje, { ...base, ...props }));

test("la ficha mantiene dos distribuciones de ranuras y el estado inicial vacío", () => {
  const html = render();
  assert.equal((html.match(/aria-label="Vista de equipamiento"/g) || []).length, 2);
  assert.match(html, /sm:grid-cols-\[minmax\(0,1fr\)_148px_minmax\(0,1fr\)\]/);
  assert.match(html, /grid-cols-\[minmax\(0,1fr\)_92px_minmax\(0,1fr\)\]/);
  assert.match(html, /Arma principal/);
  assert.match(html, /Mano secundaria/);
  assert.match(html, /Ranura vacía/);
});

test("la selección muestra solo piezas compatibles y conserva el panel de información", () => {
  const html = render({ inventario: [casco, espada], ranuraSeleccionada: "casco" });
  assert.match(html, /Casco de cuero/);
  assert.doesNotMatch(html, /Espada sencilla/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /Equipar/);
});

test("una pieza de dos manos ocupa el espacio inferior y oculta mano secundaria", () => {
  const html = render({ equipo: { ...equipoVacio, arma: { ...espada, objeto: { ...espada.objeto, manos: 2 } } }, objetosEquipados: new Set(["espada-1"]) });
  assert.match(html, /Arma principal/);
  assert.doesNotMatch(html, /Mano secundaria/);
  assert.match(html, /Espada sencilla/);
  assert.match(html, /Desequipar/);
});

test("los controles de equipo quedan bloqueados durante viaje o combate", () => {
  const html = render({ equipo: { ...equipoVacio, casco }, bloqueado: true });
  assert.match(html, /disabled=""/);
  assert.match(html, /Desequipar/);
});

test("el resumen mantiene los formatos de rarezas y las mismas estadísticas del motor", () => {
  assert.equal(nombreRareza("poco_comun"), "Poco común");
  assert.deepEqual(obtenerEstadisticasNoCero({ ...espada.objeto, ataqueBase: 6, ataquePorMejora: 2 }, 2, {}).filter(x => x.clave === "ataque").map(x => x.valor), [10]);
});
