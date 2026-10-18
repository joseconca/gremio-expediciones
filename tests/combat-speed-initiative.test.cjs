require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  crearSecuenciaTurnosVelocidad,
  avanzarSecuenciaTurnosVelocidad,
} = require("../src/lib/expediciones/iniciativa-combate.ts");

test("la velocidad reparte acciones 10/15/30 en proporción 1/2/3 y por orden descendente", () => {
  const actores = [
    { actorId: "A", equipo: "jugador", velocidad: 10 },
    { actorId: "B", equipo: "jugador", velocidad: 15 },
    { actorId: "C", equipo: "jugador", velocidad: 30 },
  ];
  const secuencia = crearSecuenciaTurnosVelocidad(actores, "combate-test");

  assert.deepEqual(secuencia.map((paso) => paso.actorId), ["C", "B", "A", "C", "B", "C"]);
  assert.equal(secuencia.filter((paso) => paso.actorId === "A").length, 1);
  assert.equal(secuencia.filter((paso) => paso.actorId === "B").length, 2);
  assert.equal(secuencia.filter((paso) => paso.actorId === "C").length, 3);
});

test("los empates son reproducibles con la misma semilla y pueden cambiar con otra", () => {
  const actores = [
    { actorId: "uno", equipo: "jugador", velocidad: 10 },
    { actorId: "dos", equipo: "enemigo", velocidad: 10 },
    { actorId: "tres", equipo: "jugador", velocidad: 10 },
  ];
  const primera = crearSecuenciaTurnosVelocidad(actores, "misma-semilla");
  const repetida = crearSecuenciaTurnosVelocidad(actores, "misma-semilla");

  assert.deepEqual(repetida, primera);
  assert.deepEqual(primera.map((paso) => paso.actorId).sort(), ["dos", "tres", "uno"]);
});

test("al avanzar se saltan las acciones pendientes de actores caídos", () => {
  const secuencia = crearSecuenciaTurnosVelocidad([
    { actorId: "A", equipo: "jugador", velocidad: 10 },
    { actorId: "B", equipo: "jugador", velocidad: 15 },
    { actorId: "C", equipo: "enemigo", velocidad: 30 },
  ], "caidos");
  assert.equal(secuencia[0].actorId, "C");

  const siguiente = avanzarSecuenciaTurnosVelocidad({
    turnosPendientes: secuencia,
    actoresVivos: [
      { actorId: "A", equipo: "jugador", velocidad: 10 },
      { actorId: "B", equipo: "jugador", velocidad: 15 },
    ],
    ronda: 1,
    semilla: "caidos",
  });

  assert.equal(siguiente.turnoActual.actorId, "B");
  assert.deepEqual(siguiente.turnosPendientes.map((paso) => paso.actorId), ["B", "A", "B"]);
  assert.equal(siguiente.ronda, 1);
  assert.equal(siguiente.nuevaRonda, false);
});

test("si se agota el ciclo se genera el siguiente con la ronda incrementada", () => {
  const siguiente = avanzarSecuenciaTurnosVelocidad({
    turnosPendientes: [{ actorId: "C", equipo: "enemigo" }],
    actoresVivos: [{ actorId: "jugador", equipo: "jugador", velocidad: 20 }],
    ronda: 7,
    semilla: "reinicio",
  });
  assert.equal(siguiente.ronda, 8);
  assert.equal(siguiente.nuevaRonda, true);
  assert.equal(siguiente.turnoActual.actorId, "jugador");
  assert.deepEqual(siguiente.turnosPendientes.map((paso) => paso.actorId), ["jugador"]);
});
