require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const reglas = require("../src/lib/party/combate-reglas.ts");
const {
  obtenerParticipantesVivos,
  resolverResultadoCombateParty,
} = reglas;

const participantes = () => [
  { usuarioId: "u2", ordenTurno: 1, jugadorHp: 100, estado: "activo" },
  { usuarioId: "u1", ordenTurno: 0, jugadorHp: 100, estado: "activo" },
  { usuarioId: "u3", ordenTurno: 2, jugadorHp: 100, estado: "activo" },
];

test("la lista viva respeta el orden congelado e ignora caídos", () => {
  const grupo = participantes();
  assert.deepEqual(obtenerParticipantesVivos(grupo).map(p => p.usuarioId), ["u1", "u2", "u3"]);
  grupo[0].jugadorHp = 0;
  assert.deepEqual(obtenerParticipantesVivos(grupo).map(p => p.usuarioId), ["u1", "u3"]);
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

test("la huida se distingue de una derrota y el HP enemigo debe ser finito", () => {
  const grupo = participantes();
  grupo[0].estado = "huyo";
  grupo[1].estado = "caido";
  grupo[2].estado = "huyo";
  assert.equal(resolverResultadoCombateParty(10, grupo), "huida");
  assert.equal(resolverResultadoCombateParty(0, grupo), "victoria");
  assert.throws(() => resolverResultadoCombateParty(Number.NaN, participantes()), RangeError);
  const derrota = participantes().map(p => ({ ...p, estado: "caido", jugadorHp: 0 }));
  assert.equal(resolverResultadoCombateParty(10, derrota), "derrota");
});

test("la iniciativa utiliza un solo planificador actual, basado en velocidad", () => {
  assert.equal("calcularSiguienteTurnoParty" in reglas, false);
  assert.equal("crearEstadoInicialTurnoParty" in reglas, false);
  assert.equal("EstadoTurnoParty" in reglas, false);
});

const {
  construirActoresVivosParty,
  obtenerColaActualParty,
  prepararSiguienteTurnoVelocidad,
} = require("../src/lib/party/iniciativa.ts");

test("la iniciativa de party excluye caídos y enemigos derrotados", () => {
  const participantes = [
    { usuarioId: "u1", ordenTurno: 0, estado: "activo", jugadorHp: 100, jugadorVelocidad: 30 },
    { usuarioId: "u2", ordenTurno: 1, estado: "activo", jugadorHp: 60, jugadorVelocidad: 10 },
    { usuarioId: "u3", ordenTurno: 2, estado: "huyo", jugadorHp: 80, jugadorVelocidad: 50 },
  ];
  const enemigos = [
    { id: "e1", hp: 40, velocidad: 15 },
    { id: "e2", hp: 0, velocidad: 100 },
  ];
  const activos = construirActoresVivosParty(participantes, enemigos);
  assert.deepEqual(activos.map(x => x.actorId), ["u1", "u2", "e1"]);
  const herido = construirActoresVivosParty(participantes, enemigos, [
    { usuarioId: "u2", ordenTurno: 1, estado: "caido", jugadorHp: 0 },
  ]);
  assert.deepEqual(herido.map(x => x.actorId), ["u1", "e1"]);
});

test("la iniciativa de party mantiene la cola válida y reconstruye turnos pendientes", () => {
  const participantes = [
    { usuarioId: "u1", ordenTurno: 0, estado: "activo", jugadorHp: 100, jugadorVelocidad: 20 },
    { usuarioId: "u2", ordenTurno: 1, estado: "activo", jugadorHp: 100, jugadorVelocidad: 10 },
  ];
  const enemigos = [{ id: "e1", hp: 30, velocidad: 10 }];
  const guardada = [
    { actorId: "u1", equipo: "jugador" },
    { actorId: "e1", equipo: "enemigo" },
  ];
  const combate = { id: "combate-1", faseTurno: "jugador", turnoActualUsuarioId: "u1", ronda: 2, turnosPendientes: guardada };
  assert.deepEqual(obtenerColaActualParty(combate, participantes, enemigos), guardada);
  const avance = prepararSiguienteTurnoVelocidad(combate, participantes, enemigos);
  assert.equal(avance.faseTurno, "enemigo");
  assert.equal(avance.turnoActualUsuarioId, null);
  assert.equal(avance.ronda, 3);
  const sinCola = { ...combate, turnosPendientes: [] };
  const colaReconstruida = obtenerColaActualParty(sinCola, participantes, enemigos);
  assert.equal(colaReconstruida[0].actorId, "u1");
  assert.deepEqual(colaReconstruida, obtenerColaActualParty(sinCola, participantes, enemigos));
});


test("el log compartido de party conserva el filtro y el límite de 120 entradas", () => {
  const { obtenerLogCombateParty } = require("../src/lib/party/combate-reglas.ts");
  assert.deepEqual(obtenerLogCombateParty(null), []);
  assert.deepEqual(obtenerLogCombateParty({ mensaje: "incorrecto" }), []);
  assert.deepEqual(obtenerLogCombateParty(["primero", null, 0, "segundo"]), ["primero", "segundo"]);
  const historial = Array.from({ length: 140 }, (_, indice) => "entrada-" + indice);
  assert.deepEqual(obtenerLogCombateParty(historial), historial.slice(-120));
});
