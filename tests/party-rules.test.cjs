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

const {
  leerRecompensaParty,
  repartirCantidadEntera,
  crearRngDeterminista,
  registrarObjetoRecompensa,
} = require("../src/lib/party/recompensas.ts");

test("las recompensas compartidas se leen sin cantidades negativas ni objetos inválidos", () => {
  assert.deepEqual(leerRecompensaParty(null), { oro: 0, madera: 0, piedra: 0, metal: 0, objetos: [] });
  assert.deepEqual(leerRecompensaParty({
    oro: 10.9, madera: -5, piedra: "4", metal: 3,
    objetos: [{ objetoId: "pocion", cantidad: 2.9 }, { objetoId: "", cantidad: 8 }, { objetoId: "espada", cantidad: -2 }],
  }), { oro: 10, madera: 0, piedra: 0, metal: 3, objetos: [{ objetoId: "pocion", cantidad: 2 }] });
});

test("el reparto de oro y recursos no crea ni pierde unidades", () => {
  for (const total of [0, 1, 2, 7, 99, 100]) for (const miembros of [2, 3]) {
    const repartos = Array.from({ length: miembros }, (_, i) => repartirCantidadEntera(total, miembros, i));
    assert.equal(repartos.reduce((sum, n) => sum + n, 0), total);
    assert.ok(Math.max(...repartos) - Math.min(...repartos) <= 1);
  }
  assert.equal(repartirCantidadEntera(8, 0, 0), 0);
});

test("el RNG de botín compartido es reproducible y los objetos se agrupan", () => {
  const a = crearRngDeterminista("combate-1:jugador-1");
  const b = crearRngDeterminista("combate-1:jugador-1");
  const tiradasA = Array.from({ length: 5 }, () => a());
  const tiradasB = Array.from({ length: 5 }, () => b());
  assert.deepEqual(tiradasA, tiradasB);
  assert.ok(tiradasA.every(v => v >= 0 && v < 1));
  const objetos = [];
  registrarObjetoRecompensa(objetos, "pocion", 2);
  registrarObjetoRecompensa(objetos, "pocion", 3);
  registrarObjetoRecompensa(objetos, "espada", 1);
  registrarObjetoRecompensa(objetos, "espada", 0);
  assert.deepEqual(objetos, [{ objetoId: "pocion", cantidad: 5 }, { objetoId: "espada", cantidad: 1 }]);
});

test("la vista de combate de party mapea todos los participantes sin ejecutar acciones", () => {
  const { crearModoCombateParty } = require("../src/components/base/party/vista-combate.ts");
  const jugador = {
    id: "p1", usuarioId: "u1", estado: "activo",
    ordenTurno: 1, jugadorPosicion: "centro", jugadorHp: 61, jugadorHpMaximo: 90,
    jugadorAtaque: 17, jugadorAtaqueMagico: 4, jugadorDefensa: 8,
    jugadorDefensaMagica: 5, jugadorVelocidad: 12, jugadorProbCritico: 0.14,
    jugadorDanoCritico: 1.8, jugadorPrecision: 74, jugadorEvasion: 0.09, jugadorNivel: 7,
    profesionActivaId: "espadachin", armaSpriteId: "espada_hierro", escudoSpriteId: null,
    jugadorEnergiaActual: 25, jugadorEnergiaMaxima: 45,
    jugadorManaActual: 10, jugadorManaMaximo: 20,
    efectos: [{ tipo: "bonus_defensa" }], comidaActiva: "guiso", pasivas: [],
    usuario: { nombre: "Base Uno", personaje: { nombre: "Heroína", clase: "Espadachín", sexo: "chica" } },
  };
  const aliado = {
    ...jugador, id: "p2", usuarioId: "u2", estado: "huyo",
    usuario: { nombre: "Base Dos", personaje: { nombre: "Aliado", clase: "Mago", sexo: "chico" } },
  };
  const ultimaAccion = { actor: "enemigo", tipo: "ataque" };
  const combateParty = {
    participantes: [jugador, aliado], faseTurno: "jugador",
    turnoActualUsuarioId: "u1", ultimaAccion,
  };
  const estado = { usuarioId: "u1", party: { liderUsuarioId: "u1" } };
  const enviar = async () => null;
  const resultado = crearModoCombateParty(estado, { nombre: "Cueva helada" }, combateParty, jugador, enviar);

  assert.equal(resultado.nombreExpedicion, "Cueva helada");
  assert.equal(resultado.faseTurno, "jugador");
  assert.equal(resultado.estadoJugador, "activo");
  assert.equal(resultado.participantes.length, 2);
  assert.deepEqual(resultado.participantes.map((p) => [p.nombre, p.sexo, p.esLider]), [
    ["Heroína", "chica", true], ["Aliado", "chico", false],
  ]);
  assert.equal(resultado.participantes[0].armaSpriteId, "espada_hierro");
  assert.equal(resultado.participantes[0].jugadorEnergiaActual, 25);
  assert.equal(resultado.participantes[1].estado, "huyo");
  assert.equal(resultado.ultimaAccion, ultimaAccion);
  assert.equal(resultado.onAccionParty, enviar);
  assert.equal(crearModoCombateParty(estado, null, { ...combateParty, ultimaAccion: null }, undefined, enviar).estadoJugador, "activo");
});
