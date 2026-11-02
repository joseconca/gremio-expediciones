require('./load-typescript.cjs');
const test = require("node:test");
const assert = require("node:assert/strict");

const { CLASES, obtenerAncestrosClase } = require("../src/lib/progresion/clases.ts");
const { FICHAS_PROFESION, obtenerFichaProfesion } = require("../src/lib/progresion/catalogos/fichas-profesion.ts");
const { obtenerFuentes, obtenerResumen } = require("../scripts/clase.cjs");

const { CLASES_BASE } = require("../src/lib/progresion/catalogos/clases-base.ts");
const { CLASES_NUEVAS } = require("../src/lib/progresion/catalogos/clases-avanzadas.ts");
const { HABILIDADES, HABILIDADES_BASE } = require("../src/lib/habilidades.ts");
const { HABILIDADES_NUEVAS } = require("../src/lib/habilidades-nuevas.ts");
const { HABILIDADES_TRONCALES } = require("../src/lib/progresion/catalogos/habilidades-troncales.ts");
const { HABILIDADES_EVOLUCIONES } = require("../src/lib/progresion/catalogos/habilidades-evoluciones.ts");

test("las definiciones de clases solo tienen un propietario y una API publica", () => {
  const originales = Object.keys(CLASES_BASE);
  const nuevas = Object.keys(CLASES_NUEVAS);
  assert.equal(new Set([...originales, ...nuevas]).size, originales.length + nuevas.length);
  assert.deepEqual(Object.keys(CLASES).sort(), [...originales, ...nuevas].sort());
  for (const id of Object.keys(CLASES)) {
    assert.equal(CLASES[id].id, id);
    assert.ok(CLASES[id].requisitos.every(r => CLASES[r.claseId]));
  }
  assert.ok(obtenerAncestrosClase("berserker").includes("espadachin"));
});

test("el catalogo base conserva los datos y el orden de cada profesion", () => {
  const conjuntos = [HABILIDADES_NUEVAS, HABILIDADES_TRONCALES, HABILIDADES_EVOLUCIONES];
  assert.equal(HABILIDADES_BASE.length, conjuntos.reduce((n, c) => n + c.length, 0));
  assert.deepEqual(
    HABILIDADES_BASE.map(h => h.id),
    conjuntos.flatMap(c => c.map(h => h.id))
  );
  assert.equal(new Set(HABILIDADES_BASE.map(h => h.id)).size, HABILIDADES_BASE.length);
});

test("la API de habilidades conserva todas las profesiones y las 367 habilidades v2", () => {
  assert.equal(HABILIDADES.length, 367);
  assert.equal(new Set(HABILIDADES.map(h => h.id)).size, HABILIDADES.length);
  for (const h of HABILIDADES) assert.ok(CLASES[h.claseId], h.id);
  assert.equal(HABILIDADES.filter(h => h.tipo === "activa").length, 245);
  assert.equal(HABILIDADES.filter(h => h.tipo === "pasiva").length, 122);
});

test("catálogos únicos y adaptadores sin definiciones duplicadas", () => {
  const { DEFINICIONES_CLASES, CLASES_BASE: base, CLASES_NUEVAS: avanzadas } = require("../src/lib/progresion/catalogos/clases.ts");
  const catalogo = require("../src/lib/progresion/catalogos/habilidades.ts");
  assert.equal(base, CLASES_BASE);
  assert.equal(avanzadas, CLASES_NUEVAS);
  assert.equal(Object.keys(DEFINICIONES_CLASES).length, Object.keys(CLASES).length);
  assert.equal(catalogo.HABILIDADES_TRONCALES, HABILIDADES_TRONCALES);
  assert.equal(catalogo.HABILIDADES_EVOLUCIONES, HABILIDADES_EVOLUCIONES);
  assert.equal(require("../src/lib/progresion/diseno-habilidades.ts").DISENO_HABILIDADES, catalogo.DISENO_HABILIDADES);
  assert.equal(require("../src/lib/progresion/nombres-redisenio.ts").NOMBRES_REDISENIO, catalogo.NOMBRES_REDISENIO);
  assert.equal(require("../src/lib/progresion/catalogo-tecnicas-adicionales.ts").CATALOGO_TECNICAS_ADICIONALES, catalogo.CATALOGO_TECNICAS_ADICIONALES);
  assert.equal(new Set(Object.keys(DEFINICIONES_CLASES)).size, Object.keys(CLASES).length);
});
