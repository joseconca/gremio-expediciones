require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const reglas = require("../src/lib/party/combate-reglas.ts");
const reglasExpedicion = require("../src/lib/party/expedicion-reglas.ts");

class MockPartyError extends Error {
  constructor(message, status = 409, code = "PARTY_CONFLICT") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function loadService(prisma) {
  const filename = path.resolve(__dirname, "../src/server/services/party/combate-party-actions.ts");
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const dependencies = {
    "@prisma/client": { Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } } },
    "@/lib/prisma": { prisma },
    "@/lib/expediciones/combate": {
      resolverAtaqueJugador: () => ({ actor: "jugador", tipo: "ataque", animacion: "ofensiva", dano: 12, critico: false, texto: "El aventurero inflige 12 de daño." }),
      resolverAtaqueEnemigo: () => ({ actor: "enemigo", tipo: "ataque", animacion: "ofensiva", dano: 10, critico: false, texto: "El enemigo inflige 10 de daño." }),
    },
    "@/lib/expediciones/estados-combate": {
      calcularAtaqueModificado: (value) => value,
      calcularEvasionModificada: (value) => value,
      calcularPrecisionModificada: (value) => value,
      leerEfectosCombate: (value) => Array.isArray(value) ? value : [],
      procesarTicksPeriodicos: (_effects, hp) => ({ hp, mensajes: [], danoAplicado: 0, curacionAplicada: 0 }),
      avanzarEfectosCombate: (effects, defensa) => ({ efectos: effects, defensa, mensajes: [] }),
    },
    "@/lib/party/combate-reglas": reglas,
    "@/lib/party/expedicion-reglas": {
      ...reglasExpedicion,
      calcularFechaLlegadaParty: (_distance, velocidades, _multiplicador, salida) =>
        new Date(salida.getTime() + Math.max(30_000, 1000 / Math.min(...velocidades))),
    },
    "@/lib/party/reglas": {
      leerCoordenadasBase: (value) => value && typeof value.lat === "number" && typeof value.lng === "number" ? value : null,
    },
    "@/lib/utils": { calcularDistanciaKm: () => 12 },
    "@/server/services/party/party-service": { PartyServiceError: MockPartyError },
  };
  const loaded = { exports: {} };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function mkParticipant(id, order, hp = 100, hpMax = 100, status = "activo") {
  return {
    id: "cp-" + id,
    combatePartyId: "combat-1",
    usuarioId: id,
    personajeId: "personaje-" + id,
    ordenTurno: order,
    estado: status,
    jugadorHp: hp,
    jugadorHpMaximo: hpMax,
    jugadorAtaque: 20,
    jugadorAtaqueMagico: 15,
    jugadorDefensa: 5,
    jugadorDefensaMagica: 4,
    jugadorVelocidad: 8,
    jugadorProbCritico: 0.1,
    jugadorDanoCritico: 1.5,
    jugadorPrecision: 75,
    jugadorEvasion: 0,
    jugadorNivel: 3,
    cooldowns: {},
    efectos: [],
  };
}

function mkCombat(overrides = {}) {
  return {
    id: "combat-1",
    expedicionPartyId: "expedition-1",
    version: 0,
    fase: "activo",
    ronda: 1,
    faseTurno: "jugador",
    turnoInicialEnemigo: false,
    turnoActualUsuarioId: "u1",
    enemigoId: "slime",
    enemigoNombre: "Slime",
    enemigoHp: 40,
    enemigoHpMaximo: 40,
    enemigoAtaque: 12,
    enemigoAtaqueMagico: 8,
    enemigoDefensa: 4,
    enemigoDefensaMagica: 3,
    enemigoVelocidad: 5,
    enemigoProbCritico: 0.1,
    enemigoDanoCritico: 1.5,
    enemigoPrecision: 75,
    enemigoEvasion: 0,
    enemigoNivel: 3,
    efectosEnemigo: [],
    log: [],
    participantes: [mkParticipant("u1", 0), mkParticipant("u2", 1)],
    ...overrides,
  };
}

function mockPrisma(combat, options = {}) {
  const calls = { combatWrites: [], participantWrites: [], characterWrites: [], expeditionWrites: [], expeditionParticipantWrites: [] };
  const tx = {
    combateParty: {
      findUnique: async () => combat,
      updateMany: async ({ where, data }) => {
        calls.combatWrites.push({ where, data });
        if (options.rejectCombatUpdate) return { count: 0 };
        if (where.version !== combat.version || where.fase !== combat.fase || where.faseTurno !== combat.faseTurno) return { count: 0 };
        if (where.turnoActualUsuarioId && where.turnoActualUsuarioId !== combat.turnoActualUsuarioId) return { count: 0 };
        Object.assign(combat, data, { version: combat.version + 1 });
        return { count: 1 };
      },
    },
    expedicionParty: {
      findUnique: async () => ({
        id: "expedition-1",
        fase: "combatiendo",
        resultadoFinal: null,
        origenCoords: { lat: 27.9, lng: -15.4 },
        destinoCoords: { lat: 28.0, lng: -15.5 },
        participantes: combat.participantes.map((p) => ({
          id: "exp-part-" + p.usuarioId,
          usuarioId: p.usuarioId,
          personajeId: p.personajeId,
          estado: p.estado,
          velocidadViajeKmh: 6,
          usuario: { id: p.usuarioId, baseCoords: { lat: 27.9, lng: -15.4 }, personaje: { estado: "combatiendo" } },
        })),
      }),
      updateMany: async ({ where, data }) => {
        calls.expeditionWrites.push({ where, data });
        if (options.rejectExpeditionUpdate) return { count: 0 };
        return { count: 1 };
      },
    },
    expedicionPartyParticipante: {
      updateMany: async ({ where, data }) => {
        calls.expeditionParticipantWrites.push({ where, data });
        return { count: combat.participantes.length };
      },
    },
    combatePartyParticipante: {
      updateMany: async ({ where, data }) => {
        calls.participantWrites.push({ where, data });
        if (options.rejectParticipantUpdate) return { count: 0 };
        const target = combat.participantes.find((p) =>
          p.id === where.id && (where.jugadorHp === undefined || p.jugadorHp === where.jugadorHp)
        );
        if (!target) return { count: 0 };
        Object.assign(target, data);
        return { count: 1 };
      },
    },
    personaje: {
      updateMany: async ({ where, data }) => {
        calls.characterWrites.push({ where, data });
        if (options.rejectCharacterUpdate) return { count: 0 };
        return { count: 1 };
      },
    },
  };
  return {
    prisma: {
      $transaction: async (callback, txOptions) => {
        assert.equal(txOptions?.isolationLevel, "Serializable");
        return callback(tx);
      },
    },
    calls,
  };
}

test("solo el aventurero que tiene el turno puede atacar", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  await assert.rejects(
    service.ejecutarAccionCombateParty("u2", "expedition-1", "atacar"),
    (error) => error.status === 409 && error.code === "NO_ES_TU_TURNO",
  );
  assert.equal(calls.combatWrites.length, 0);
});

test("un ataque básico reduce al enemigo y avanza al siguiente miembro", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.enemigoHp, 28);
  assert.equal(result.fase, "activo");
  assert.equal(result.faseTurno, "jugador");
  assert.equal(result.turnoActualUsuarioId, "u2");
  assert.equal(combat.version, 1);
  assert.equal(calls.combatWrites.length, 1);
  assert.equal(calls.combatWrites[0].data.enemigoHp, 28);
});

test("un ataque que vacía el HP del enemigo marca victoria en vez de ceder otro turno", async () => {
  const combat = mkCombat({ enemigoHp: 10 });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.fase, "victoria");
  assert.equal(combat.fase, "victoria");
  assert.equal(combat.enemigoHp, 0);
  assert.equal(calls.expeditionWrites[0].data.fase, "regresando");
});

test("el turno del enemigo apunta al aventurero con menor porcentaje de vida", async () => {
  const combat = mkCombat({
    faseTurno: "enemigo",
    turnoActualUsuarioId: null,
    participantes: [mkParticipant("u1", 0, 80, 100), mkParticipant("u2", 1, 20, 50)],
  });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(result.objetivoUsuarioId, "u2");
  assert.equal(combat.participantes[1].jugadorHp, 10);
  assert.equal(combat.turnoActualUsuarioId, "u1");
  assert.equal(combat.ronda, 2);
  assert.equal(calls.characterWrites.length, 1);
  assert.equal(calls.characterWrites[0].data.hpActual, 10);
});

test("si falla el control de versión, no se puede completar dos veces el turno", async () => {
  const combat = mkCombat();
  const { prisma } = mockPrisma(combat, { rejectCombatUpdate: true });
  const service = loadService(prisma);
  await assert.rejects(
    service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar"),
    (error) => error.status === 409 && error.code === "COMBATE_PARTY_MODIFICADO",
  );
});
