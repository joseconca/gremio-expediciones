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

const RegistroAventurero = require("../src/components/personaje/RegistroAventurero.tsx").default;
const { CLASES } = require("../src/lib/progresion/clases.ts");

const personaje = {
  nivel: 3, experiencia: 12, nivelJob: 5, experienciaJob: 8,
  profesionActivaId: "novato", puntosHabilidadDisponibles: 2,
  fuerza: 5, agilidad: 4, vitalidad: 6, inteligencia: 3, destreza: 4, suerte: 2,
  hpMaximo: 100, ataque: 14, defensa: 9, ataqueMagico: 4, defensaMagica: 6,
  velocidad: 8, capacidadCarruaje: 25, precision: 80, evasion: 0.1, probCritico: 0.05,
  danoCritico: 1.5, energiaMaxima: 100, manaMaximo: 50,
  regeneracionEnergiaPorTurno: 5, regeneracionManaPorTurno: 3,
};

test("el registro conserva progreso, atributos y estadísticas desplegables", () => {
  const html = renderToStaticMarkup(React.createElement(RegistroAventurero, { personaje }));
  for (const texto of ["Registro del aventurero", "Nivel Base 3", "Job 5", "Puntos Job disponibles:", "Atributos principales", "Fuerza", "Estadísticas de combate", "Vida máxima", "Precisión", "Energía máxima", "Desglose no disponible."]) {
    assert.ok(html.includes(texto), texto);
  }
  assert.match(html, /80\.00%/);
  assert.match(html, /Ver desglose de Vida máxima/);
});

test("el registro indica la maestría de clase al alcanzar su nivel máximo", () => {
  const html = renderToStaticMarkup(React.createElement(RegistroAventurero, {
    personaje: { ...personaje, nivelJob: CLASES.novato.nivelJobMaximo },
  }));
  assert.match(html, /Maestría alcanzada/);
  assert.match(html, /width:100%/);
});
