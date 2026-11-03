require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calcularFechasRegresoProgramadas,
  calcularFechaEncuentroProgramada,
  calcularRegresoComercioProgramado,
  clasificarClimaExpedicion,
} = require("../src/lib/expediciones/viajes/tiempos.ts");

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

test("el inicio programa el encuentro exactamente a mitad de la duración total", () => {
  const salida = new Date("2026-11-03T10:00:00.000Z");
  const mediaHora = calcularFechaEncuentroProgramada(salida, 0.5);
  const regreso = calcularFechasRegresoProgramadas(salida, mediaHora);
  assert.equal(mediaHora.toISOString(), "2026-11-03T10:15:00.000Z");
  assert.equal(regreso.fechaLlegada.toISOString(), "2026-11-03T10:30:00.000Z");

  const conTormenta = calcularFechaEncuentroProgramada(salida, 0.5 * 1.8);
  assert.equal(conTormenta.toISOString(), "2026-11-03T10:27:00.000Z");
  assert.equal(calcularFechasRegresoProgramadas(salida, conTormenta).fechaLlegada.toISOString(),
    "2026-11-03T10:54:00.000Z");
  assert.equal(salida.toISOString(), "2026-11-03T10:00:00.000Z");
});

test("las penalizaciones meteorológicas conservan los rangos y los textos previos", () => {
  const normal = { multiplicadorTiempo: 1, climaReporte: "Despejado / Buen tiempo" };
  for (const codigo of [undefined, null, "95", 0, 50, 68, 70, 78, 94]) {
    assert.deepEqual(clasificarClimaExpedicion(codigo), normal, String(codigo));
  }
  for (const codigo of [51, 60, 67]) {
    assert.deepEqual(clasificarClimaExpedicion(codigo),
      { multiplicadorTiempo: 1.2, climaReporte: "Lluvia y barro en los caminos" });
  }
  for (const codigo of [71, 74, 77]) {
    assert.deepEqual(clasificarClimaExpedicion(codigo),
      { multiplicadorTiempo: 1.5, climaReporte: "Fuertes nevadas" });
  }
  for (const codigo of [95, 96, 99]) {
    assert.deepEqual(clasificarClimaExpedicion(codigo),
      { multiplicadorTiempo: 1.8, climaReporte: "Tormenta eléctrica peligrosa" });
  }
});

test("el regreso comercial usa la fecha prevista, con un mínimo de un minuto", () => {
  const salida = new Date("2026-11-03T10:00:00.000Z");
  const encuentro = new Date("2026-11-03T10:15:00.000Z");
  const tarde = new Date("2026-11-03T10:35:00.000Z");
  const regreso = calcularRegresoComercioProgramado(salida, encuentro);
  assert.equal(regreso.duracionIda, 15 * 60_000);
  assert.strictEqual(regreso.fechaSalidaRegreso, encuentro);
  assert.equal(regreso.fechaLlegadaRegreso.toISOString(), "2026-11-03T10:30:00.000Z");
  assert.equal(tarde.getTime() - regreso.fechaLlegadaRegreso.getTime(), 5 * 60_000);
  assert.equal(Math.max(0, Math.round(regreso.duracionIda * 2 / 1000)), 1800);

  const proximo = new Date("2026-11-03T10:00:20.000Z");
  const minimo = calcularRegresoComercioProgramado(salida, proximo);
  assert.equal(minimo.duracionIda, 60_000);
  assert.equal(minimo.fechaLlegadaRegreso.toISOString(), "2026-11-03T10:01:20.000Z");
  assert.equal(Math.round(minimo.duracionIda * 2 / 1000), 120);
});
