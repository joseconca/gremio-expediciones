require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { calcularFechasRegresoProgramadas } = require("../src/lib/expediciones/tiempos.ts");

test("una expedición de 30 minutos programa encuentro a los 15 y regreso a los 30", () => {
  const salida = new Date("2026-10-15T10:00:00.000Z");
  const encuentro = new Date("2026-10-15T10:15:00.000Z");
  const regreso = calcularFechasRegresoProgramadas(salida, encuentro);

  assert.equal(regreso.fechaSalida.toISOString(), "2026-10-15T10:15:00.000Z");
  assert.equal(regreso.fechaLlegada.toISOString(), "2026-10-15T10:30:00.000Z");
  assert.equal(regreso.fechaSalida.getTime() - salida.getTime(), 15 * 60_000);
  assert.equal(regreso.fechaLlegada.getTime() - salida.getTime(), 30 * 60_000);
});

test("resolver el combate a los 35 minutos no desplaza el plazo de regreso de los 30", () => {
  const salida = new Date("2026-10-15T10:00:00.000Z");
  const encuentro = new Date("2026-10-15T10:15:00.000Z");
  const ahoraResolucion = new Date("2026-10-15T10:35:00.000Z");
  const regreso = calcularFechasRegresoProgramadas(salida, encuentro);

  assert.equal(regreso.fechaLlegada.toISOString(), "2026-10-15T10:30:00.000Z");
  assert.equal(ahoraResolucion.getTime() - regreso.fechaLlegada.getTime(), 5 * 60_000);
});

test("el cálculo de vuelta rechaza fechas inválidas o un encuentro anterior a la salida", () => {
  assert.throws(
    () => calcularFechasRegresoProgramadas(new Date("inválida"), new Date()),
    RangeError,
  );
  assert.throws(
    () => calcularFechasRegresoProgramadas(
      new Date("2026-10-15T10:15:00.000Z"),
      new Date("2026-10-15T10:00:00.000Z"),
    ),
    RangeError,
  );
});
