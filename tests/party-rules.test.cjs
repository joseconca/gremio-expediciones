require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PARTY_MAX_MIEMBROS,
  leerCoordenadasBase,
  calcularFechaLlegadaTraslado,
  puedeAceptarMiembro,
  puedeGestionarVisitas,
  esTrasladoActivo,
  obtenerEstadoFinalTraslado,
} = require("../src/lib/party/reglas.ts");

test("las coordenadas de las bases se validan y normalizan", () => {
  assert.deepEqual(leerCoordenadasBase({ lat: 27.99, lng: -15.42 }), { lat: 27.99, lng: -15.42 });
  assert.equal(leerCoordenadasBase(null), null);
  assert.equal(leerCoordenadasBase([]), null);
  assert.equal(leerCoordenadasBase({ lat: 91, lng: 0 }), null);
  assert.equal(leerCoordenadasBase({ lat: 0, lng: NaN }), null);
  assert.equal(leerCoordenadasBase({ lat: "27.99", lng: 0 }), null);
});

test("el viaje tiene una duración mínima de 30 segundos y respeta distancia y velocidad", () => {
  const salida = new Date("2026-10-14T12:00:00.000Z");
  assert.equal(calcularFechaLlegadaTraslado(0, salida).getTime() - salida.getTime(), 30_000);
  assert.equal(calcularFechaLlegadaTraslado(12, salida, 6).getTime() - salida.getTime(), 3_600_000);
  assert.throws(() => calcularFechaLlegadaTraslado(-1, salida), RangeError);
  assert.throws(() => calcularFechaLlegadaTraslado(1, salida, 0), RangeError);
  assert.throws(() => calcularFechaLlegadaTraslado(1, new Date("fecha")), RangeError);
});

test("una party admite como máximo tres personas contando al líder", () => {
  assert.equal(PARTY_MAX_MIEMBROS, 3);
  assert.equal(puedeAceptarMiembro(1), true);
  assert.equal(puedeAceptarMiembro(2), true);
  assert.equal(puedeAceptarMiembro(3), false);
  assert.equal(puedeAceptarMiembro(0), false);
  assert.equal(puedeAceptarMiembro(1.5), false);
});

test("un anfitrión sin party puede aceptar la primera visita y convertirse en líder", () => {
  assert.equal(puedeGestionarVisitas(false, false), true);
});

test("solo el líder puede gestionar visitas cuando el anfitrión ya pertenece a una party", () => {
  assert.equal(puedeGestionarVisitas(true, true), true);
  assert.equal(puedeGestionarVisitas(true, false), false);
});

test("los estados de traslado activos y finales son explícitos", () => {
  assert.equal(esTrasladoActivo("en_viaje"), true);
  assert.equal(esTrasladoActivo("pendiente"), true);
  assert.equal(esTrasladoActivo("regresando"), true);
  assert.equal(esTrasladoActivo("aceptada"), false);
  assert.equal(esTrasladoActivo("rechazada"), false);
  assert.equal(obtenerEstadoFinalTraslado("rechazada"), "rechazada");
  assert.equal(obtenerEstadoFinalTraslado("salida_voluntaria"), "completada");
});
