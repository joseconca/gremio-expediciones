require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerAccionAutomaticaTraslado, obtenerPasoExpedicionParty, obtenerTurnoEnemigoPendiente } = require("../src/components/base/party/automatismos.ts");

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

test("solo solicita el turno del enemigo cuando el combate sigue activo y es su turno", () => {
  const combate = { id: "combate-1", version: 7, fase: "activo", faseTurno: "enemigo" };
  const activa = { ...expedicionBase, fase: "combatiendo", combate };
  assert.deepEqual(obtenerTurnoEnemigoPendiente(activa), {
    clave: "combate-party:combate-1:v7:enemigo",
    expedicionId: "exp-1",
  });
  assert.equal(obtenerTurnoEnemigoPendiente(null), null);
  assert.equal(obtenerTurnoEnemigoPendiente({ ...activa, combate: null }), null);
  assert.equal(obtenerTurnoEnemigoPendiente({ ...activa, fase: "regresando" }), null);
  assert.equal(obtenerTurnoEnemigoPendiente({ ...activa, combate: { ...combate, faseTurno: "jugador" } }), null);
  for (const fase of ["victoria", "derrota", "huida"]) {
    assert.equal(obtenerTurnoEnemigoPendiente({ ...activa, combate: { ...combate, fase } }), null);
  }
});

test("la clave de iniciativa distingue versiones sin mutar el snapshot", () => {
  const combate = { id: "c1", version: 3, fase: "activo", faseTurno: "enemigo" };
  const activa = { ...expedicionBase, fase: "combatiendo", combate };
  const primera = obtenerTurnoEnemigoPendiente(activa);
  const segunda = obtenerTurnoEnemigoPendiente({ ...activa, combate: { ...combate, version: 4 } });
  assert.notEqual(primera.clave, segunda.clave);
  assert.equal(primera.expedicionId, segunda.expedicionId);
  assert.deepEqual(combate, { id: "c1", version: 3, fase: "activo", faseTurno: "enemigo" });
});

const fs = require("node:fs");
const path = require("node:path");
const leer = (ruta) => fs.readFileSync(path.join(__dirname, "..", ruta), "utf8");

test("el panel delega los cinco automatismos a un único hook y conserva el sondeo separado", () => {
  const panel = leer("src/components/base/PanelParty.tsx");
  const hook = leer("src/components/base/party/useAutomatismosParty.ts");
  assert.match(panel, /useAutomatismosParty\(\{/);
  assert.match(panel, /intervaloConsultaParty\(estado, ahora\)/);
  assert.doesNotMatch(panel, /procesandoAutomatico|siguienteIntentoTraslado/);
  assert.equal((hook.match(/useEffect\(\(\) => \{/g) || []).length, 5);
});

test("el hook conserva la deduplicación, los reintentos y la pausa del turno enemigo", () => {
  const hook = leer("src/components/base/party/useAutomatismosParty.ts");
  assert.match(hook, /procesandoAutomatico\.current\.has\(clave\)/);
  assert.match(hook, /procesandoAutomatico\.current\.delete\(clave\)/);
  assert.match(hook, /siguienteIntentoTraslado\.current\.set\(clave, Date\.now\(\) \+ 5000\)/);
  assert.match(hook, /const tiempoEsperaEnemigo = Math\.random\(\) \* 1200 \+ 300/);
  assert.match(hook, /window\.setTimeout\(resolve, tiempoEsperaEnemigo\)/);
  assert.match(hook, /guardarResultadoCombate\(turnoPendiente\.expedicionId, datosTurno\)/);
  assert.match(hook, /enviarAccionParty\(/);
  assert.match(hook, /enviarTurnoEnemigoParty\(/);
});
