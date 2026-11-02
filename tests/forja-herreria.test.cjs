require("./load-typescript.cjs");
const fs = require("node:fs");
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
const ForjaHerreria = require("../src/components/herreria/ForjaHerreria.tsx").default;
const espada = {
  id: "espada-1", objetoId: "espada_madera", cantidad: 1, nivelMejora: 0, bonificaciones: {},
  objeto: { id: "espada_madera", nombre: "Espada de prueba", descripcion: "Hoja de madera",
    tipo: "arma", subtipo: "espada", rareza: "basico", ataqueBase: 3, ataquePorMejora: 2, precio: 150 },
};
const casco = {
  id: "casco-1", objetoId: "casco_prueba", cantidad: 1, nivelMejora: 0, bonificaciones: {},
  objeto: { id: "casco_prueba", nombre: "Casco de prueba", descripcion: "Protección",
    tipo: "armadura", subtipo: "ligera", categoriaArmadura: "ligera", rareza: "comun", defensaBase: 4, defensaPorMejora: 1, precio: 200 },
};
const anillo = {
  id: "anillo-1", objetoId: "anillo_prueba", cantidad: 1, nivelMejora: 0, bonificaciones: {},
  objeto: { id: "anillo_prueba", nombre: "Anillo de prueba", descripcion: "Accesorio",
    tipo: "accesorio", rareza: "raro", velocidadBase: 1, precio: 300 },
};
const base = {
  nivelHerreria: 1, inventarioArmas: [], inventarioArmaduras: [], inventarioAccesorios: [],
  estaObjetoEquipado: () => false, oro: 10000, madera: 1000, piedra: 1000, metal: 1000,
  procesando: null, onMejorar: async () => {},
};
const render = (props = {}) => renderToStaticMarkup(React.createElement(ForjaHerreria, { ...base, ...props }));

test("la forja conserva las tres categorías y los mensajes de inventario vacío", () => {
  const html = render();
  assert.match(html, />Forja</);
  for (const nombre of ["Armas", "Armaduras", "Accesorios"]) assert.match(html, new RegExp(">" + nombre + "<"));
  assert.match(html, /No tienes armas en el/);
  assert.match(html, /No tienes armaduras en el/);
  assert.match(html, /No tienes accesorios en el/);
});

test("solo las piezas equipadas y mejorables ofrecen el botón de mejora", () => {
  const items = { inventarioArmas: [espada], inventarioArmaduras: [casco], inventarioAccesorios: [anillo] };
  const sinEquipar = render(items);
  assert.match(sinEquipar, /Espada de prueba/);
  assert.match(sinEquipar, /Casco de prueba/);
  assert.match(sinEquipar, /Equípalo para mejorar/);
  assert.match(sinEquipar, /No se mejora aquí/);
  const equipado = render({ ...items, estaObjetoEquipado: id => id === espada.id });
  assert.match(equipado, /Mejorar \+1/);
  assert.match(equipado, /Coste en materiales/);
  assert.match(equipado, /SIG\.:/);
  assert.match(equipado, /Equipado/);
});

test("el nivel máximo de forja y los recursos siguen limitando las acciones", () => {
  const limite = render({
    inventarioArmas: [{ ...espada, nivelMejora: 3 }],
    estaObjetoEquipado: () => true,
  });
  assert.match(limite, /Mejora máxima/);
  assert.doesNotMatch(limite, /Mejorar \+1/);
  const sinRecursos = render({
    inventarioArmas: [espada],
    estaObjetoEquipado: () => true, madera: 0, piedra: 0, metal: 0,
  });
  assert.match(sinRecursos, /Materiales insuficientes/);
  assert.match(sinRecursos, /disabled=""/);
  const sinOro = render({
    inventarioArmas: [espada],
    estaObjetoEquipado: () => true, oro: 0,
  });
  assert.match(sinOro, /Oro insuficiente/);
  assert.match(sinOro, /disabled=""/);
});

test("la operación HTTP permanece en la página, el componente solo notifica el objeto elegido", () => {
  const path = require("node:path");
  const pagina = fs.readFileSync(path.join(__dirname, "../src/app/base/herreria/page.tsx"), "utf8");
  const componente = fs.readFileSync(path.join(__dirname, "../src/components/herreria/ForjaHerreria.tsx"), "utf8");
  assert.match(pagina, /<ForjaHerreria/);
  assert.match(pagina, /\/api\/objetos\/mejorar/);
  assert.doesNotMatch(componente, /fetch\(/);
  assert.match(componente, /void onMejorar\(objetoInventario\.id\)/);
});
