require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  ESTADISTICAS_OBJETO,
  obtenerEstadisticasNoCero,
  obtenerEstadisticasNoCeroTienda,
  formatearEstadistica,
} = require("../src/components/objetos/resumen-objeto.ts");
const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

test("el catálogo de resumen conserva las 16 estadísticas y el orden original de las tiendas", () => {
  assert.deepEqual(ESTADISTICAS_OBJETO.map(({ clave }) => clave), [
    "ataque", "ataqueMagico", "defensa", "defensaMagica", "velocidad",
    "hpMaximo", "energiaMaxima", "manaMaximo", "precision", "evasion",
    "regeneracionVidaPorTurno", "regeneracionEnergiaPorTurno",
    "regeneracionManaPorTurno", "capacidadCarruaje", "probCritico", "danoCritico",
  ]);
  assert.equal(ESTADISTICAS_OBJETO.find(x => x.clave === "capacidadCarruaje").nombre, "Capacidad");
});

test("la hoja de personaje oculta Capacidad y las tiendas la conservan con sus bonificaciones", () => {
  const objeto = {
    id: "objeto_prueba", tipo: "arma", rareza: "basico",
    ataqueBase: 3, ataquePorMejora: 2,
    capacidadCarruajeBase: 7, capacidadCarruajePorMejora: 1,
    probCriticoBase: 0.03,
  };
  const bonificaciones = { ataque: 5, velocidad: 2, capacidadCarruaje: -2 };
  const personaje = obtenerEstadisticasNoCero(objeto, 2, bonificaciones);
  const tienda = obtenerEstadisticasNoCeroTienda(objeto, 2, bonificaciones);
  assert.deepEqual(personaje.map(x => x.clave), ["ataque", "velocidad", "probCritico"]);
  assert.deepEqual(tienda.map(x => x.clave), ["ataque", "velocidad", "capacidadCarruaje", "probCritico"]);
  assert.deepEqual(tienda.map(x => x.valor), [12, 2, 7, 0.03]);
  assert.deepEqual(tienda, obtenerEstadisticasNoCero(objeto, 2, bonificaciones, { incluirCapacidad: true }));
});

test("el formato de números, críticos y valores negativos permanece idéntico", () => {
  assert.equal(formatearEstadistica("ataque", 3), "+3");
  assert.equal(formatearEstadistica("defensa", -2), "-2");
  assert.equal(formatearEstadistica("probCritico", 0.045), "+4,5%");
  assert.equal(formatearEstadistica("danoCritico", 1.75), "+1,75×");
  assert.equal(formatearEstadistica("velocidad", 0), "0");
});

test("las dos tiendas utilizan el resumen común pero conservan sus propios cálculos de costes", () => {
  for (const ruta of ["src/components/armeria/CatalogoArmeria.tsx", "src/components/herreria/ForjaHerreria.tsx"]) {
    const codigo = read(ruta);
    assert.match(codigo, /obtenerEstadisticasNoCeroTienda as obtenerEstadisticasNoCero/);
    assert.match(codigo, /formatearEstadistica as formatearValorEstadistica/);
    if (ruta.includes("ForjaHerreria")) assert.match(codigo, /ESTADISTICAS_OBJETO as ESTADISTICAS/);
    assert.doesNotMatch(codigo, /function obtenerEstadisticasNoCero\(/);
    assert.doesNotMatch(codigo, /function formatearValorEstadistica\(/);
  }
  assert.match(read("src/components/herreria/ForjaHerreria.tsx"), /function obtenerDiferenciasMejora\(/);
  assert.match(read("src/components/herreria/ForjaHerreria.tsx"), /calcularCosteMejoraObjeto/);
  assert.match(read("src/components/armeria/VentaArmeria.tsx"), /calcularPrecioVentaObjeto/);
});
