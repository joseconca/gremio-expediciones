require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerAccionAutomaticaTraslado, obtenerPasoExpedicionParty } = require("../src/components/base/party/automatismos.ts");

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

const expedicionBase = {
  id: "exp-1", fase: "en_viaje", fechaLlegada: "2026-11-03T12:00:00Z",
  combate: null,
};

test("llegada de expedición solo al finalizar el trayecto y con clave estable", () => {
  assert.equal(obtenerPasoExpedicionParty(expedicionBase, ahora - 1), null);
  assert.equal(obtenerPasoExpedicionParty(expedicionBase), null);
  assert.deepEqual(obtenerPasoExpedicionParty(expedicionBase, ahora), {
    tipo: "llegar",
    clave: "expedicion-party:exp-1:llegar",
    ruta: "/api/expediciones/party/llegar",
    expedicionId: "exp-1",
  });
});

test("el combate arranca al estar preparado sin depender del reloj, pero no se duplica", () => {
  const preparada = { ...expedicionBase, fase: "lista_para_combate" };
  assert.deepEqual(obtenerPasoExpedicionParty(preparada), {
    tipo: "iniciar-combate",
    clave: "expedicion-party:exp-1:iniciar-combate",
    ruta: "/api/expediciones/party/combate/iniciar",
    expedicionId: "exp-1",
  });
  assert.equal(obtenerPasoExpedicionParty({ ...preparada, combate: { id: "combate-1" } }), null);
});

test("el regreso requiere la fecha original incluso si el combate acaba después", () => {
  const regreso = { ...expedicionBase, fase: "regresando", combate: { id: "combate-1", fase: "victoria" } };
  assert.equal(obtenerPasoExpedicionParty(regreso, ahora - 1), null);
  assert.equal(obtenerPasoExpedicionParty(regreso), null);
  assert.deepEqual(obtenerPasoExpedicionParty(regreso, ahora), {
    tipo: "regreso",
    clave: "expedicion-party:exp-1:regreso",
    ruta: "/api/expediciones/party/regreso",
    expedicionId: "exp-1",
  });
});

test("estados sin automatismo no desencadenan peticiones, sin mutar el snapshot", () => {
  for (const fase of ["combatiendo", "completada", "cancelada", "pendiente", ""]) {
    assert.equal(obtenerPasoExpedicionParty({ ...expedicionBase, fase }, ahora + 120000), null);
  }
  assert.equal(obtenerPasoExpedicionParty(null, ahora), null);
  const copia = { ...expedicionBase };
  obtenerPasoExpedicionParty(expedicionBase, ahora);
  assert.deepEqual(expedicionBase, copia);
});
