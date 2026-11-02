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
const CatalogoArmeria = require("../src/components/armeria/CatalogoArmeria.tsx").default;
const arma = {
  id: "test_espada", nombre: "Espada de prueba", descripcion: "Espada ligera",
  tipo: "arma", subtipo: "espada", rareza: "basico", manos: 2, precio: 250,
  ataqueBase: 4, puedeComprar: true, nivelHeroeNecesario: 2,
};
const casco = {
  id: "test_casco", nombre: "Casco de prueba", descripcion: "Protege la cabeza",
  tipo: "armadura", subtipo: "ligera", categoriaArmadura: "ligera", slot: "casco", rareza: "comun",
  precio: 300, defensaBase: 3, puedeComprar: true, nivelHeroeNecesario: 1,
};
const anillo = {
  id: "test_anillo", nombre: "Anillo de prueba", descripcion: "Anillo mágico",
  tipo: "accesorio", slot: "anillo", rareza: "raro", precio: 500,
  velocidadBase: 1, puedeComprar: true, nivelHeroeNecesario: 3,
};
const base = {
  enVenta: [], inventario: [], espaciosInventario: { ocupados: 0, maximo: 30 },
  oro: 5000, cargando: false, procesando: null, onComprar: async () => {},
};
const render = (props = {}) => renderToStaticMarkup(React.createElement(CatalogoArmeria, { ...base, ...props }));
const botones = (html, texto) => [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  .filter(x => x[2].includes(texto));
const deshabilitado = match => /(?:^|\s)disabled(?:=|\s|$)/.test(match[1]);

test("la Armería conserva categorías, precios y ventana de información de objetos", () => {
  const html = render({ enVenta: [arma, casco, anillo] });
  assert.match(html, /OBJETOS A LA VENTA/);
  for (const t of ["Armas", "Armaduras y escudos", "Accesorios"]) assert.match(html, new RegExp(">" + t + "<"));
  for (const t of [arma.nombre, casco.nombre, anillo.nombre]) assert.match(html, new RegExp(t));
  assert.match(html, /Dos manos/);
  assert.match(html, /Consultar Espada de prueba/);
  assert.equal(botones(html, "Comprar").length, 3);
  assert.equal(botones(html, "Comprar").some(deshabilitado), false);
});

test("la Armería diferencia estados de carga, catálogo vacío, nivel y oro", () => {
  assert.match(render({ cargando: true }), /Cargando mercancía/);
  assert.match(render(), /No hay mercancía disponible/);
  const nivel = render({ enVenta: [{ ...arma, puedeComprar: false, nivelHeroeNecesario: 10 }] });
  assert.match(nivel, /Nivel 10/);
  assert.match(nivel, /disabled=""/);
  const oro = render({ enVenta: [arma], oro: 0 });
  assert.match(oro, /Falta oro/);
  assert.match(oro, /disabled=""/);
});

test("la capacidad del inventario y las acciones en curso siguen bloqueando compras", () => {
  const lleno = render({
    enVenta: [arma], espaciosInventario: { ocupados: 30, maximo: 30 },
  });
  assert.match(lleno, /Inventario lleno/);
  assert.match(lleno, /disabled=""/);
  const comprando = render({ enVenta: [arma], procesando: "comprar:" + arma.id });
  assert.match(comprando, /Comprando/);
  assert.match(comprando, /disabled=""/);
});

test("las compras y su actualización de estado siguen exclusivamente en la página", () => {
  const pagina = fs.readFileSync(path.join(__dirname, "../src/app/base/armeria/page.tsx"), "utf8");
  const catalogo = fs.readFileSync(path.join(__dirname, "../src/components/armeria/CatalogoArmeria.tsx"), "utf8");
  assert.match(pagina, /<CatalogoArmeria/);
  assert.match(pagina, /\/api\/objetos\/comprar/);
  assert.match(pagina, /\/api\/objetos\/vender/);
  assert.match(pagina, /\/api\/objetos\/recomprar/);
  assert.doesNotMatch(catalogo, /fetch\(/);
  assert.match(catalogo, /void onComprar\(objeto\.id\)/);
});
