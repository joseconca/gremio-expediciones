require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ESTADOS_EXPEDICION_PARTY_ACTIVOS,
  esMisionPveCompartida,
  calcularVelocidadMinimaParty,
  calcularFechaLlegadaParty,
} = require("../src/lib/party/expedicion-reglas.ts");

test("las expediciones compartidas solo permiten misiones PvE normales y de élite", () => {
  assert.equal(esMisionPveCompartida("mision-h123-i2-d4-o0"), true);
  assert.equal(esMisionPveCompartida("elite-2026-10-14-jefe"), true);
  assert.equal(esMisionPveCompartida("comercio-u1"), false);
  assert.equal(esMisionPveCompartida("asedio-u2"), false);
});

test("la party viaja a la velocidad del aventurero más lento", () => {
  assert.equal(calcularVelocidadMinimaParty([7, 4.5, 6]), 4.5);
  assert.equal(calcularVelocidadMinimaParty([5, 8]), 5);
  assert.throws(() => calcularVelocidadMinimaParty([]), RangeError);
  assert.throws(() => calcularVelocidadMinimaParty([5]), RangeError);
  assert.throws(() => calcularVelocidadMinimaParty([2, 3, 4, 5]), RangeError);
  assert.throws(() => calcularVelocidadMinimaParty([5, 0]), RangeError);
});

test("la llegada usa una única fecha, tiempo mínimo de 30 segundos y clima", () => {
  const salida = new Date("2026-10-14T12:00:00.000Z");
  const llegada = calcularFechaLlegadaParty(12, [8, 4], 1, salida);
  assert.equal(llegada.getTime() - salida.getTime(), 90 * 60 * 1000);
  assert.equal(
    calcularFechaLlegadaParty(0, [8, 4], 1, salida).getTime() - salida.getTime(),
    30_000,
  );
  assert.equal(
    calcularFechaLlegadaParty(12, [8, 4], 1.5, salida).getTime() - salida.getTime(),
    135 * 60 * 1000,
  );
  assert.throws(() => calcularFechaLlegadaParty(-1, [8, 4]), RangeError);
  assert.throws(() => calcularFechaLlegadaParty(1, [0, 4]), RangeError);
  assert.throws(() => calcularFechaLlegadaParty(1, [8, 4], 0), RangeError);
  assert.throws(() => calcularFechaLlegadaParty(1, [8, 4], 1, new Date("fecha")), RangeError);
});

test("los estados de una expedición activa se explicitan para impedir salidas dobles", () => {
  assert.deepEqual(ESTADOS_EXPEDICION_PARTY_ACTIVOS, [
    "en_viaje", "lista_para_combate", "combatiendo", "regresando",
  ]);
});
