require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const expedicionRules = require("../src/lib/party/expedicion-reglas.ts");
const partyRules = require("../src/lib/party/reglas.ts");

class MockPartyError extends Error {
  constructor(message, status = 409, code = "PARTY_CONFLICT") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const mission = {
  id: "mision-test",
  tipo: "normal",
  lat: 28.0,
  lng: -15.4,
  nombre: "El tesoro de prueba",
  dificultad: 2,
  recompensa: { oro: 150, madera: 1, piedra: 0, metal: 0 },
  duracionObjetivoHoras: 0.5,
  descripcion: "Misión de prueba",
};

function loadService(prisma, misionPrueba = mission) {
  const filename = path.resolve(__dirname, "../src/server/services/party/expedicion-party-service.ts");
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const stats = (personaje) => ({
    total: {
      velocidad: personaje.velocidadPrueba ?? 1,
      hpMaximo: 100 + personaje.nivel,
      energiaMaxima: 30,
      manaMaximo: 20,
    },
  });
  const dependencies = {
    "@prisma/client": { Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } } },
    "@/lib/prisma": { prisma },
    "@/lib/estadisticasPersonaje": {
      calcularEstadisticasPersonaje: stats,
      calcularModificadoresEquipo: () => ({}),
    },
    "@/lib/inventario": { obtenerEquipoDesdePersonaje: () => ({}) },
    "@/lib/utils": { calcularDistanciaKm: () => 12 },
    "@/lib/generadorMisiones": { generarMisionesDisponibles: () => [misionPrueba] },
    "@/lib/progresion/clases": { obtenerDefinicionClase: () => null },
    "@/lib/enemigos": {
      obtenerEnemigoPorId: (id) => id === "enemigo-test" ? {
        id: "enemigo-test",
        nombre: "Enemigo de prueba",
        hp: 90,
        ataque: 12,
        defensa: 5,
        velocidad: 8,
        botin: 20,
        difMin: 2,
        rareza: "comun",
      } : undefined,
    },
    "@/lib/party/combate-reglas": {
      crearEstadoInicialTurnoParty: () => ({
        faseCombate: "activo",
        faseTurno: "jugador",
        turnoActualUsuarioId: "leader",
        ronda: 1,
      }),
    },
    "@/lib/party/reglas": {
      ...partyRules,
      leerCoordenadasBase: (value) =>
        value && typeof value.lat === "number" && typeof value.lng === "number" ? value : null,
    },
    "@/lib/party/expedicion-reglas": expedicionRules,
    "@/server/services/party/party-service": { PartyServiceError: MockPartyError },
    "../../../lib/expediciones/dificultad": {
      esModoDificultad: (value) => ["facil", "normal", "dificil"].includes(value),
    },
  };
  const loaded = { exports: {} };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function makePersonaje(id, velocidadPrueba = 1) {
  return {
    id: "char-" + id,
    usuarioId: id,
    nombre: "Aventurero " + id,
    clase: "Novato",
    profesionActivaId: "novato",
    nivel: 2,
    rangosAmenazaCompletados: [],
    habilidades: [],
    inventario: { objetos: [] },
    equipoEquipado: null,
    progresosClase: [],
    fuerza: 1,
    agilidad: 1,
    vitalidad: 1,
    inteligencia: 1,
    destreza: 1,
    suerte: 1,
    hpActual: 20,
    energiaActual: 5,
    manaActual: 5,
    comidaPreparada: null,
    estado: "ocioso",
    velocidadPrueba,
  };
}

function makeUser(id, { leaderId = "leader", estado = "ocioso", speed = 1, baseCoords = { lat: 27.9, lng: -15.4 } } = {}) {
  return {
    id,
    nombre: "Gremio " + id,
    baseCoords,
    ultimaMisionElite: null,
    personaje: { ...makePersonaje(id, speed), estado },
    expedicionActiva: null,
    trasladosComoVisitante: [],
    partyMembresia: {
      partyId: "party-1",
      party: { id: "party-1", liderUsuarioId: leaderId },
    },
  };
}

function transactionPrisma(tx, leader, members) {
  return {
    usuario: { findUnique: async () => leader },
    partyMember: { findMany: async () => members },
    $transaction: async (callback, options) => {
      assert.equal(options?.isolationLevel, "Serializable");
      return callback(tx);
    },
  };
}

function memberRecord(usuario, unidoEn = new Date()) {
  return { id: "membership-" + usuario.id, partyId: "party-1", usuarioId: usuario.id, unidoEn, usuario };
}

test("solo el líder puede iniciar la expedición compartida", async () => {
  const user = makeUser("guest", { leaderId: "leader" });
  const prisma = { usuario: { findUnique: async () => user } };
  const service = loadService(prisma);
  await assert.rejects(
    service.iniciarExpedicionParty("guest", "mision-test", "normal"),
    (error) => error.status === 403 && error.code === "NO_ES_LIDER",
  );
});

test("iniciar una party registra a todos con destino, llegada y estado comunes", async () => {
  const leader = makeUser("leader", { speed: 12, baseCoords: { lat: 27.9, lng: -15.4 } });
  const guest = makeUser("guest", { speed: 3, baseCoords: { lat: 28.4, lng: -15.9 } });
  const members = [memberRecord(leader), memberRecord(guest)];
  let createdExpedition = null;
  let createdParticipants = [];
  const tx = {
    party: {
      findUnique: async () => ({
        id: "party-1",
        liderUsuarioId: "leader",
        miembros: members.map((member) => ({
          ...member,
          usuario: { ...member.usuario, partyMembresia: undefined },
        })),
      }),
    },
    expedicionParty: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdExpedition = {
          id: "exp-party-1",
          ...data,
        };
        return createdExpedition;
      },
    },
    expedicionPartyParticipante: {
      createMany: async ({ data }) => {
        createdParticipants = data;
        return { count: data.length };
      },
    },
    personaje: {
      updateMany: async ({ where, data }) => {
        const target = members.find((member) => member.usuario.personaje.id === where.id);
        assert.ok(target);
        assert.equal(where.estado, "ocioso");
        target.usuario.personaje.estado = data.estado;
        target.usuario.personaje.hpActual = data.hpActual;
        return { count: 1 };
      },
    },
  };
  const prisma = transactionPrisma(tx, leader, members);
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ current_weather: { weathercode: 0 } }) });
  try {
    const service = loadService(prisma);
    const result = await service.iniciarExpedicionParty("leader", "mision-test", "normal");
    assert.equal(result.expedicionPartyId, "exp-party-1");
    assert.equal(result.numeroParticipantes, 2);
    assert.equal(createdExpedition.fase, "en_viaje");
    assert.equal(createdExpedition.tipo, "normal");
    assert.deepEqual(createdExpedition.origenCoords, leader.baseCoords, "el origen y futuro regreso son la base del líder");
    assert.deepEqual(createdExpedition.destinoCoords, { lat: mission.lat, lng: mission.lng });
    assert.equal(createdParticipants.length, 2);
    assert.deepEqual(createdParticipants.map((p) => p.usuarioId).sort(), ["guest", "leader"]);
    assert.ok(createdParticipants.every((p) => p.expedicionPartyId === "exp-party-1" && p.estado === "en_viaje"));
    assert.ok(members.every((m) => m.usuario.personaje.estado === "de_viaje"));
    assert.equal(createdExpedition.fechaLlegada.getTime(), new Date(result.fechaLlegada).getTime());
  } finally {
    global.fetch = originalFetch;
  }
});

test("la llegada compartida rechaza llegar antes de la fecha común", async () => {
  const tx = {
    expedicionParty: {
      findUnique: async () => ({
        id: "exp-party-1",
        fase: "en_viaje",
        fechaLlegada: new Date(Date.now() + 60_000),
        participantes: [{ id: "participant-1", usuarioId: "guest", estado: "en_viaje" }],
      }),
    },
  };
  const service = loadService(transactionPrisma(tx, null, []));
  await assert.rejects(
    service.llegarExpedicionParty("guest", "exp-party-1"),
    (error) => error.status === 409 && error.code === "EXPEDICION_PARTY_NO_LLEGADA",
  );
});

test("la llegada compartida es atómica y mueve a la party a lista para combate", async () => {
  let fase = "en_viaje";
  let participantesActualizados = 0;
  const tx = {
    expedicionParty: {
      findUnique: async () => ({
        id: "exp-party-1",
        fase,
        fechaLlegada: new Date(Date.now() - 60_000),
        participantes: [{ id: "p1", usuarioId: "leader", estado: "en_viaje" }, { id: "p2", usuarioId: "guest", estado: "en_viaje" }],
      }),
      updateMany: async ({ where, data }) => {
        assert.equal(where.fase, "en_viaje");
        fase = data.fase;
        return { count: 1 };
      },
    },
    expedicionPartyParticipante: {
      updateMany: async ({ where, data }) => {
        assert.equal(where.estado, "en_viaje");
        assert.equal(data.estado, "en_destino");
        participantesActualizados = 2;
        return { count: 2 };
      },
    },
  };
  const service = loadService(transactionPrisma(tx, null, []));
  const result = await service.llegarExpedicionParty("guest", "exp-party-1");
  assert.equal(result.fase, "lista_para_combate");
  assert.equal(participantesActualizados, 2);
});


test("el inicializador del combate compartido rechaza expediciones que aún no han llegado", async () => {
  const tx = {
    expedicionParty: {
      findUnique: async () => ({
        id: "exp-party-1",
        fase: "en_viaje",
        participantes: [],
        combate: null,
      }),
    },
  };
  const service = loadService({
    $transaction: async (callback, options) => {
      assert.equal(options?.isolationLevel, "Serializable");
      return callback(tx);
    },
  });
  await assert.rejects(
    service.crearCombatePartySiProcede("exp-party-1"),
    (error) => error.status === 409 && error.code === "EXPEDICION_PARTY_NO_LISTA",
  );
});

test("el inicializador devuelve el combate existente en vez de crear otro", async () => {
  let creaciones = 0;
  const tx = {
    expedicionParty: {
      findUnique: async () => ({
        id: "exp-party-1",
        fase: "combatiendo",
        participantes: [],
        combate: { id: "combate-existente", fase: "activo" },
      }),
      combate: null,
    },
    combateParty: {
      create: async () => {
        creaciones += 1;
        throw new Error("No debe crear un segundo combate.");
      },
    },
  };
  const service = loadService({
    $transaction: async (callback, options) => {
      assert.equal(options?.isolationLevel, "Serializable");
      return callback(tx);
    },
  });
  const resultado = await service.crearCombatePartySiProcede("exp-party-1");
  assert.deepEqual(resultado, { combatePartyId: "combate-existente", fase: "activo" });
  assert.equal(creaciones, 0);
});

test("el inicializador requiere un enemigo válido antes de crear el combate", async () => {
  const participantes = [
    { id: "p1", usuarioId: "leader", estado: "en_destino", personaje: makePersonaje("leader", 1) },
    { id: "p2", usuarioId: "guest", estado: "en_destino", personaje: makePersonaje("guest", 1) },
  ];
  const tx = {
    expedicionParty: {
      findUnique: async () => ({
        id: "exp-party-1",
        fase: "lista_para_combate",
        dificultad: 2,
        enemigoId: "enemy-inexistente",
        participantes,
        combate: null,
      }),
    },
  };
  const service = loadService({
    $transaction: async (callback, options) => {
      assert.equal(options?.isolationLevel, "Serializable");
      return callback(tx);
    },
  });
  await assert.rejects(
    service.crearCombatePartySiProcede("exp-party-1"),
    (error) => error.status === 409 && error.code === "ENEMIGO_NO_ENCONTRADO",
  );
});


test("completar regreso de party rechaza una llegada anticipada", async () => {
  const { prisma } = makeExpeditionReturnPrisma();
  const servicio = loadService(prisma);
  await assert.rejects(
    servicio.completarRegresoExpedicionParty("leader", "exp-party-regreso"),
    (error) => error.status === 409 && error.code === "REGRESO_PARTY_NO_LLEGADO",
  );
});

test("al completar el regreso, todos quedan disponibles y la membresía se mantiene intacta", async () => {
  const { prisma, calls } = makeExpeditionReturnPrisma(new Date(Date.now() - 1_000));
  const servicio = loadService(prisma);
  const resultado = await servicio.completarRegresoExpedicionParty("leader", "exp-party-regreso");

  assert.equal(resultado.fase, "completada");
  assert.equal(resultado.llegadaProcesada, true);
  assert.equal(calls.expeditionWrites[0].data.fase, "completada");
  assert.equal(calls.participantWrites[0].data.estado, "completado");
  assert.deepEqual(calls.characterWrites.map((write) => write.data.estado), ["ocioso", "ocioso"]);
  assert.ok(calls.characterWrites.every((write) => write.where.estado === "de_viaje"));
});

function makeExpeditionReturnPrisma(fechaLlegada = new Date(Date.now() + 60_000)) {
  let fase = "regresando";
  const fechas = { salida: new Date(Date.now() - 60_000), llegada: fechaLlegada };
  const expedicion = {
    id: "exp-party-regreso",
    fase,
    fechaSalida: fechas.salida,
    fechaLlegada: fechas.llegada,
    origenCoords: { lat: 27.9, lng: -15.4 },
    destinoCoords: { lat: 28.0, lng: -15.5 },
    participantes: [
      { id: "ep1", usuarioId: "leader", personajeId: "char-leader", estado: "regresando", velocidadViajeKmh: 6 },
      { id: "ep2", usuarioId: "guest", personajeId: "char-guest", estado: "regresando", velocidadViajeKmh: 4 },
    ],
  };
  const calls = { expeditionWrites: [], participantWrites: [], characterWrites: [] };
  const tx = {
    expedicionParty: {
      findUnique: async ({ select } = {}) => select ? { fase } : { ...expedicion, fase },
      updateMany: async ({ where, data }) => {
        calls.expeditionWrites.push({ where, data });
        if (fase !== where.fase) return { count: 0 };
        fase = data.fase;
        return { count: 1 };
      },
    },
    expedicionPartyParticipante: {
      updateMany: async ({ where, data }) => {
        calls.participantWrites.push({ where, data });
        return { count: 2 };
      },
    },
    personaje: {
      updateMany: async ({ where, data }) => {
        calls.characterWrites.push({ where, data });
        return { count: 1 };
      },
    },
  };
  return {
    calls,
    prisma: {
      $transaction: async (callback, options) => {
        assert.equal(options?.isolationLevel, "Serializable");
        return callback(tx);
      },
    },
  };
}


test("cambiar de líder no permite que un miembro repita el boss antes de 23 horas", async () => {
  const leader = makeUser("leader");
  const guest = makeUser("guest");
  guest.ultimaMisionElite = new Date(Date.now() - 60_000);
  const members = [memberRecord(leader), memberRecord(guest)];
  const tx = {
    party: { findUnique: async () => ({ id: "party-1", liderUsuarioId: "leader", miembros: members }) },
    expedicionParty: { findFirst: async () => null },
  };
  const prisma = transactionPrisma(tx, leader, members);
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ current_weather: { weathercode: 0 } }) });
  try {
    const service = loadService(prisma, { ...mission, id: "elite-test", tipo: "elite", enemigoId: "enemigo-test" });
    await assert.rejects(service.iniciarExpedicionParty("leader", "elite-test", "normal"), error => error.code === "BOSS_DIARIO_EN_ESPERA");
  } finally { global.fetch = originalFetch; }
});
