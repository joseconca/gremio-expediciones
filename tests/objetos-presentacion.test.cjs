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

const { obtenerDetallesObjeto } = require("../src/components/objetos/detalles-objeto.ts");
const MiniaturaObjeto = require("../src/components/objetos/MiniaturaObjeto.tsx").default;
const EquipoFichaPersonaje = require("../src/components/personaje/EquipoFichaPersonaje.tsx").default;
const HabilidadesFichaPersonaje = require("../src/components/personaje/HabilidadesFichaPersonaje.tsx").default;

const arma = {
  id: "espada_hierro", nombre: "Espada de hierro", tipo: "arma",
  subtipo: "espada", manos: 2, descripcion: "Arma de prueba", rareza: "comun",
  precio: 100, vendibleEnArmeria: true,
  ataqueBase: 6, ataquePorMejora: 2, precisionBase: 10,
};
const consumible = {
  id: "pocion_menor", nombre: "Poción menor", tipo: "consumible",
  descripcion: "Restaura energía vital", rareza: "basico",
  precio: 150, vendibleEnArmeria: false,
  curacion: 15, curacionPorcentaje: 0.15, restauracionManaPorcentaje: 0.4,
};

test("la descripción compartida usa las mismas estadísticas mejoradas del catálogo", () => {
  const detalles = obtenerDetallesObjeto(arma, 3, { ataque: 4 });
  assert.ok(detalles.includes("Rareza: Común."));
  assert.ok(detalles.includes("Tipo: arma · espada."));
  assert.ok(detalles.includes("Nivel de mejora: +3."));
  assert.ok(detalles.some((linea) => linea.includes("ocupa mano principal y secundaria")));
  assert.ok(detalles.includes("Ataque: +16"));
  assert.ok(detalles.includes("Precisión: +10 %"));
});

test("la descripción de pociones muestra valores fijos y porcentajes sin inventar estadísticas", () => {
  const detalles = obtenerDetallesObjeto(consumible);
  assert.ok(detalles.includes("Restaura vida: 15 + 15 % del máximo."));
  assert.ok(detalles.includes("Restaura maná: 40 % del máximo."));
  assert.ok(!detalles.some((linea) => linea.startsWith("Ataque:")));
});

test("la misma miniatura ofrece acceso táctil y teclado al detalle en cualquier pantalla", () => {
  const html = renderToStaticMarkup(React.createElement(MiniaturaObjeto, {
    objeto: arma, instancia: { nivelMejora: 2, bonificaciones: {}, cantidad: 1 },
  }));
  assert.match(html, /aria-label="Consultar Espada de hierro"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /<img/);
  assert.match(html, /espada_hierro\.png/);

  const sinSprite = renderToStaticMarkup(React.createElement(MiniaturaObjeto, {
    objeto: { ...arma, id: "collar_cobre", nombre: "Collar de cobre", tipo: "accesorio" },
    iconoAlternativo: "📿",
  }));
  assert.match(sinSprite, /aria-label="Consultar Collar de cobre"/);
  assert.match(sinSprite, /📿/);
});

test("la ficha rápida distingue ranuras vacías y equipo con acceso a detalles", () => {
  const equipo = { arma: {
    id: "instancia-1", objetoId: arma.id, cantidad: 1,
    nivelMejora: 2, sufijoId: null, bonificaciones: {}, objeto: arma,
  } };
  const html = renderToStaticMarkup(React.createElement(EquipoFichaPersonaje, { equipo }));
  assert.match(html, /10 ranuras ocupadas|1 \/ 10 ranuras ocupadas/);
  assert.match(html, /Espada de hierro/);
  assert.match(html, /aria-label="Consultar Espada de hierro"/);
  assert.match(html, /Sin equipar/);
});

test("las habilidades de la ficha distinguen las listas de activas y pasivas", () => {
  const html = renderToStaticMarkup(React.createElement(HabilidadesFichaPersonaje, { habilidades: [] }));
  assert.match(html, /Activas/);
  assert.match(html, /Pasivas/);
  assert.match(html, /Sin habilidades activas equipadas/);
  assert.match(html, /Sin dones pasivos aprendidos/);
});
