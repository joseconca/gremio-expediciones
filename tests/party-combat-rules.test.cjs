require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  obtenerParticipantesVivos,
  resolverResultadoCombateParty,
  calcularSiguienteTurnoParty,
  crearEstadoInicialTurnoParty,
} = require("../src/lib/party/combate-reglas.ts");

const participantes = () => [
  { usuarioId: "u2", ordenTurno: 1, jugadorHp: 100, estado: "activo" },
  { usuarioId: "u1", ordenTurno: 0, jugadorHp: 100, estado: "activo" },
  { usuarioId: "u3", ordenTurno: 2, jugadorHp: 100, estado: "activo" },
];

test("el orden inicial de turno es el orden persistido de los participantes", () => {
  const estado = crearEstadoInicialTurnoParty(participantes());
  assert.deepEqual(estado, {
    faseCombate: "activo",
    faseTurno: "jugador",
    turnoActualUsuarioId: "u1",
    ronda: 1,
  });
});

test("los aventureros actúan por orden y después actúa el enemigo", () => {
  const grupo = participantes();
  let estado = crearEstadoInicialTurnoParty(grupo);
  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.equal(estado.turnoActualUsuarioId, "u2");
  assert.equal(estado.faseTurno, "jugador");

  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.equal(estado.turnoActualUsuarioId, "u3");

  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.deepEqual(
    { faseTurno: estado.faseTurno, turnoActualUsuarioId: estado.turnoActualUsuarioId, ronda: estado.ronda },
    { faseTurno: "enemigo", turnoActualUsuarioId: null, ronda: 1 },
  );

  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.deepEqual(
    { faseTurno: estado.faseTurno, turnoActualUsuarioId: estado.turnoActualUsuarioId, ronda: estado.ronda },
    { faseTurno: "jugador", turnoActualUsuarioId: "u1", ronda: 2 },
  );
});

test("se salta a personajes caídos sin ceder dos turnos al mismo jugador", () => {
  const grupo = participantes();
  let estado = crearEstadoInicialTurnoParty(grupo);
  grupo[0].jugadorHp = 0;
  grupo[0].estado = "caido";
  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.equal(estado.turnoActualUsuarioId, "u3");

  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.equal(estado.faseTurno, "enemigo");
});

test("la derrota ocurre solo cuando no quedan personajes vivos y la victoria prioriza al enemigo derrotado", () => {
  const grupo = participantes();
  assert.equal(resolverResultadoCombateParty(10, grupo), "activo");
  assert.equal(resolverResultadoCombateParty(0, grupo), "victoria");
  grupo.forEach((personaje) => {
    personaje.jugadorHp = 0;
    personaje.estado = "caido";
  });
  assert.equal(obtenerParticipantesVivos(grupo).length, 0);
  assert.equal(resolverResultadoCombateParty(10, grupo), "derrota");
  assert.equal(resolverResultadoCombateParty(0, grupo), "victoria");
});

test("al inicio y al avanzar un turno se exigen estados coherentes", () => {
  assert.throws(() => crearEstadoInicialTurnoParty([]), RangeError);
  assert.throws(() => crearEstadoInicialTurnoParty(participantes().slice(0, 1)), RangeError);
  assert.throws(() => resolverResultadoCombateParty(Number.NaN, participantes()), RangeError);
  const terminado = { faseCombate: "victoria", faseTurno: "enemigo", turnoActualUsuarioId: null, ronda: 7 };
  assert.deepEqual(calcularSiguienteTurnoParty(terminado, participantes()), terminado);
});


test("si el enemigo tiene la iniciativa, su primer turno no salta la ronda", () => {
  const grupo = participantes();
  let estado = crearEstadoInicialTurnoParty(grupo, false);
  assert.equal(estado.faseTurno, "enemigo");
  assert.equal(estado.turnoInicialEnemigo, true);
  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.deepEqual(
    { faseTurno: estado.faseTurno, turnoActualUsuarioId: estado.turnoActualUsuarioId, ronda: estado.ronda },
    { faseTurno: "jugador", turnoActualUsuarioId: "u1", ronda: 1 },
  );

  estado = calcularSiguienteTurnoParty(estado, grupo);
  estado = calcularSiguienteTurnoParty(estado, grupo);
  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.equal(estado.faseTurno, "enemigo");
  estado = calcularSiguienteTurnoParty(estado, grupo);
  assert.equal(estado.ronda, 2);
});
