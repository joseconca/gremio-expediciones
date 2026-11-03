require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerAccionAutomaticaTraslado } = require("../src/components/base/party/automatismos.ts");

const ahora = Date.parse("2026-11-03T12:00:00Z");
const traslado = { id: "traslado-1", estado: "en_viaje", fechaLlegada: "2026-11-03T12:00:00Z" };

test("no completa los traslados antes de la llegada, ni un milisegundo antes", () => {
  const pendiente = { ...traslado, fechaLlegada: new Date(ahora + 1).toISOString() };
  assert.equal(obtenerAccionAutomaticaTraslado(pendiente, ahora), null);
  assert.deepEqual(obtenerAccionAutomaticaTraslado(traslado, ahora), {
    clave: "traslado-1:en_viaje", ruta: "/api/party/transfer/llegar",
  });
});

test("al completar el viaje selecciona la ruta de llegada y al regresar la de vuelta", () => {
  const regreso = { ...traslado, estado: "regresando" };
  assert.deepEqual(obtenerAccionAutomaticaTraslado(regreso, ahora + 1000), {
    clave: "traslado-1:regresando", ruta: "/api/party/transfer/completar-regreso",
  });
  assert.notEqual(obtenerAccionAutomaticaTraslado(traslado, ahora).clave,
    obtenerAccionAutomaticaTraslado(regreso, ahora).clave);
});

test("no dispara acciones para estados sin automatismo ni modifica el traslado", () => {
  for (const estado of ["pendiente", "esperando_decision", "aceptado", "rechazado", "finalizado", "cancelado", ""]) {
    assert.equal(obtenerAccionAutomaticaTraslado({ ...traslado, estado }, ahora), null);
  }
  const copia = { ...traslado };
  obtenerAccionAutomaticaTraslado(traslado, ahora);
  assert.deepEqual(traslado, copia);
});

test("no introduce reglas adicionales sobre fechas inválidas: la validación corresponde a la API", () => {
  assert.deepEqual(obtenerAccionAutomaticaTraslado({ ...traslado, fechaLlegada: "fecha-invalida" }, ahora), {
    clave: "traslado-1:en_viaje", ruta: "/api/party/transfer/llegar",
  });
});
