require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

  assert.deepEqual(secuencia.map((paso) => paso.actorId), ["C", "B", "C", "A", "C", "B"]);
  assert.equal(secuencia.filter((paso) => paso.actorId === "A").length, 1);
  assert.equal(secuencia.filter((paso) => paso.actorId === "B").length, 2);
  assert.equal(secuencia.filter((paso) => paso.actorId === "C").length, 3);
});

test("la proporción no se limita a tres acciones cuando la diferencia de velocidad es mayor", () => {
  const secuencia = crearSecuenciaTurnosVelocidad([
    { actorId: "lento", equipo: "jugador", velocidad: 10 },
    { actorId: "rapido", equipo: "enemigo", velocidad: 100 },
  ], "diferencia-grande");
  assert.equal(secuencia.filter((paso) => paso.actorId === "lento").length, 1);
  assert.equal(secuencia.filter((paso) => paso.actorId === "rapido").length, 10);
  assert.equal(secuencia[0].actorId, "rapido");
  assert.equal(secuencia.indexOf(secuencia.find((paso) => paso.actorId === "lento")), 4);
});

test("los empates son reproducibles con la misma semilla y pueden cambiar con otra", () => {
  const actores = [
    { actorId: "uno", equipo: "jugador", velocidad: 10 },
    { actorId: "dos", equipo: "enemigo", velocidad: 10 },
    { actorId: "tres", equipo: "jugador", velocidad: 10 },
  ];
  const primera = crearSecuenciaTurnosVelocidad(actores, "misma-semilla");
  const repetida = crearSecuenciaTurnosVelocidad(actores, "misma-semilla");
  const otraSemilla = crearSecuenciaTurnosVelocidad(actores, "otra-semilla");

  assert.deepEqual(repetida, primera);
  assert.notDeepEqual(otraSemilla, primera);
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

test("PvE y party consumen la cola persistida y procesan un enemigo por acción", () => {
  const leer = (archivo) => fs.readFileSync(path.resolve(__dirname, archivo), "utf8");
  const pve = leer("../src/server/services/combate/pve.ts");
  const party = leer("../src/server/services/party/combate-party-actions.ts");
  const iniciarPve = leer("../src/server/services/expediciones/llegar-expedicion.ts");
  const iniciarParty = leer("../src/server/services/party/combate-party-service.ts");
  const esquema = leer("../prisma/schema.prisma");
  const migracion = leer("../prisma/migrations/20261018170000_iniciativa_por_velocidad/migration.sql");

  assert.match(pve, /turnoEnemigoActual\.actorId/);
  assert.match(pve, /turnosPendientes: avanceTurnos\.turnosPendientes/);
  assert.match(party, /turnoEnemigoActual\.actorId/);
  assert.match(party, /turnosPendientes: turnosPendientes/);
  assert.match(iniciarPve, /turnosPendientes: turnosPendientes/);
  assert.match(iniciarParty, /turnosPendientes: turnosPendientes/);
  assert.match(esquema, /model CombateActivo[\s\S]*?turnosPendientes\s+Json/);
  assert.match(esquema, /model CombateParty[\s\S]*?turnosPendientes\s+Json/);
  assert.match(migracion, /ALTER TABLE "CombateActivo"[\s\S]*?"turnosPendientes"/);
  assert.match(migracion, /ALTER TABLE "CombateParty"[\s\S]*?"turnosPendientes"/);
});

test("PvE registra cada ataque enemigo una sola vez y resuelve la victoria antes de avanzar la cola", () => {
  const pve = fs.readFileSync(path.resolve(__dirname, "../src/server/services/combate/pve.ts"), "utf8");
  assert.doesNotMatch(pve, /log\\.push\\(accionDelEnemigo\\.texto\\)/);

  const indiceVictoria = pve.indexOf("if (enemigoHp <= 0)");
  const indiceAvanceCola = pve.indexOf("const avanceTurnos = avanzarSecuenciaTurnosVelocidad");
  assert.ok(indiceVictoria >= 0, "debe comprobar la derrota de todos los enemigos");
  assert.ok(indiceAvanceCola > indiceVictoria, "la victoria se resuelve antes de consumir otra acción");
  const bloqueVictoria = pve.slice(indiceVictoria, indiceAvanceCola);
  assert.match(bloqueVictoria, /fase: "victoria"/);
  assert.match(bloqueVictoria, /terminado: true/);
});
