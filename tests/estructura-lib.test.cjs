const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("./load-typescript.cjs");

const root = path.resolve(__dirname, "..");
const existen = (ruta) => fs.existsSync(path.join(root, ruta));

const trasladados = [
  ["expediciones", "combate/consumibles-combate.ts"],
  ["expediciones", "combate/recursos-combate.ts"],
  ["expediciones", "combate/presupuesto-curacion.ts"],
  ["expediciones", "viajes/tiempos.ts"],
  ["expediciones", "viajes/recompensas-regreso.ts"],
  ["progresion", "estadisticas/modificadores-estadisticas.ts"],
  ["progresion", "estadisticas/estadisticas-base-personaje.ts"],
];

test("las reglas trasladadas tienen un solo propietario y no quedan duplicados en la raíz", () => {
  for (const [dominio, archivo] of trasladados) {
    const destino = `src/lib/${dominio}/${archivo}`;
    const antiguo = `src/lib/${dominio}/${path.basename(archivo)}`;
    assert.ok(existen(destino), `No existe ${destino}`);
    assert.equal(existen(antiguo), false, `No debe quedar un archivo duplicado: ${antiguo}`);
  }
  for (const archivo of [
    "src/lib/catalogos/clases.ts",
    "src/lib/catalogos/habilidades.ts",
    "src/lib/expediciones/combate.ts",
    "src/lib/progresion/clases.ts",
  ]) assert.ok(existen(archivo), `Se ha perdido la API pública: ${archivo}`);
});

test("las reglas puras siguen importándose desde sus ubicaciones definitivas", () => {
  const { calcularRegeneracionRecursosTurno } = require("../src/lib/expediciones/combate/recursos-combate.ts");
  const { calcularPesosCuracion } = require("../src/lib/expediciones/combate/presupuesto-curacion.ts");
  const { calcularRestauracionConsumible } = require("../src/lib/expediciones/combate/consumibles-combate.ts");
  const { calcularFechasRegresoProgramadas } = require("../src/lib/expediciones/viajes/tiempos.ts");
  const { calcularRecompensaAlmacen } = require("../src/lib/expediciones/viajes/recompensas-regreso.ts");
  const { MODIFICADORES_VACIOS } = require("../src/lib/progresion/estadisticas/modificadores-estadisticas.ts");
  assert.equal(typeof calcularRegeneracionRecursosTurno, "function");
  assert.equal(typeof calcularPesosCuracion, "function");
  assert.equal(typeof calcularRestauracionConsumible, "function");
  assert.equal(typeof calcularFechasRegresoProgramadas, "function");
  assert.equal(typeof calcularRecompensaAlmacen, "function");
  assert.equal(MODIFICADORES_VACIOS.hpMaximo, 0);
});
