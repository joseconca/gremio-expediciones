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
      resolverHabilidadJugador: (_habilidad, combate) => ({
        accion: { actor: "jugador", tipo: "habilidad", animacion: "ofensiva", dano: 20, critico: false, texto: "Habilidad de prueba." },
        jugadorHp: combate.jugadorHp,
        jugadorDefensa: combate.jugadorDefensa,
        enemigoDefensa: combate.enemigoDefensa,
        efectos: [{ habilidadId: "golpe_arcano", tipo: "bonus_defensa", valor: 2, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" }],
      }),
    },
    "@/lib/expediciones/estados-combate": {
      calcularAtaqueModificado: (value) => value,
      calcularEvasionModificada: (value) => value,
      calcularPrecisionModificada: (value) => value,
      leerEfectosCombate: (value) => Array.isArray(value) ? value : [],
      procesarTicksPeriodicos: (_effects, hp) => ({ hp, mensajes: [], danoAplicado: 0, curacionAplicada: 0 }),
      avanzarEfectosCombate: (effects, defensa) => ({ efectos: effects, defensa, mensajes: [] }),
      procesarEfectosTurno: (effects, hp, hpMax, defensa, nombre) => ({
        efectos: effects,
        hp,
        defensa,
        mensajes: [],
        danoAplicado: 0,
        curacionAplicada: 0,
      }),
    },
    "@/lib/party/combate-reglas": reglas,
    "@/lib/habilidades": {
      obtenerHabilidadPorId: (id) => id === "golpe_arcano" ? {
        id: "golpe_arcano", claseId: "novato", nombre: "Golpe arcano", descripcion: "Habilidad de test.",
        tipo: "activa", efecto: "dano", costeEnergia: 5, costeMana: 0, cooldownTurnos: 2, multiplicadorDano: 1.5,
      } : undefined,
    },
    "@/lib/objetos": {
      obtenerObjetoPorId: (id) => id === "pocion" ? {
        id: "pocion", nombre: "Poción", tipo: "consumible", curacion: 30,
      } : undefined,
    },
    "@/lib/progresion/niveles-habilidad": {
      ajustarHabilidadPorNivel: (habilidad, nivel) => ({ ...habilidad, nivel }),
    },
    "@/lib/progresion/clases": {
      puedeUsarHabilidadDeClase: () => true,
    },
    "@/server/services/combate/accion-combate": {
      reducirCooldowns: (cooldowns) => cooldowns,
      obtenerCooldowns: (valor) => valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {},
      otorgarExperienciaJob: async () => null,
    },
    "@/lib/enemigos": { obtenerEnemigoPorId: () => ({ id: "slime", botin: 10, difMin: 1 }) },
    "@/lib/configuracionJuego": { experienciaParaNivel: () => 500 },
    "@/lib/expediciones/dificultad": {
      esModoDificultad: (value) => ["facil", "normal", "dificil"].includes(value),
      calcularExperienciaBaseGanada: () => 45,
      calcularOroEnemigo: () => 10,
      aplicarMultiplicadorRecompensa: (value) => value,
      registrarVictoriaRangoNormal: (prev, nivel) => [...(Array.isArray(prev) ? prev : []), nivel],
    },
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
  const calls = {
    combatWrites: [], participantWrites: [], characterWrites: [], expeditionWrites: [],
    expeditionParticipantWrites: [], resourceWrites: [], inventoryWrites: [], userWrites: [],
    inventoryCreates: [], inventoryStackWrites: [], progressionWrites: [],
  };
  const character = {
    id: "personaje-u1",
    usuarioId: "u1",
    nivel: 3,
    experiencia: 0,
    rangosAmenazaCompletados: [],
    profesionActivaId: "novato",
    energiaActual: options.energiaActual ?? 20,
    manaActual: options.manaActual ?? 10,
    habilidades: options.habilidades ?? [],
    inventario: options.inventario ?? { id: "inventario-u1", objetos: [{ id: "inv-pocion-1", objetoId: "pocion", cantidad: 1 }] },
  };
  let faseExpedicion = "combatiendo";
  const tx = {
    combateParty: {
      findUnique: async ({ select } = {}) => select?.recompensasResueltas !== undefined
        ? { recompensasResueltas: Boolean(combat.recompensasResueltas) }
        : combat,
      updateMany: async ({ where, data }) => {
        calls.combatWrites.push({ where, data });
        if (options.rejectCombatUpdate) return { count: 0 };
        if (where.version !== undefined && where.version !== combat.version) return { count: 0 };
        if (where.fase !== undefined && where.fase !== combat.fase) return { count: 0 };
        if (where.faseTurno !== undefined && where.faseTurno !== combat.faseTurno) return { count: 0 };
        if (where.turnoActualUsuarioId !== undefined && where.turnoActualUsuarioId !== combat.turnoActualUsuarioId) return { count: 0 };
        if (where.recompensasResueltas === false && combat.recompensasResueltas === true) return { count: 0 };
        if (where.fase === "victoria" && combat.fase !== "victoria") return { count: 0 };
        if (data.recompensasResueltas === true) combat.recompensasResueltas = true;
        Object.assign(combat, data, { version: combat.version + 1 });
        return { count: 1 };
      },
    },
    expedicionParty: {
      findUnique: async ({ select, include } = {}) => {
        if (select?.fase) return { fase: faseExpedicion };
        if (include?.participantes?.include?.usuario && !include.participantes.include.personaje) {
          return { id: "expedition-1", fase: faseExpedicion, participantes: combat.participantes.map((p) => ({
            id: "exp-part-" + p.usuarioId,
            usuarioId: p.usuarioId,
            personajeId: p.personajeId,
            estado: p.estado,
            velocidadViajeKmh: 6,
            usuario: { id: p.usuarioId, baseCoords: { lat: 27.9, lng: -15.4 }, personaje: { estado: "combatiendo" } },
          })) };
        }
        return {
          id: "expedition-1",
          fase: faseExpedicion,
          tipo: "normal",
          dificultad: 3,
          modoDificultad: "normal",
          recompensa: options.recompensa ?? { oro: 11, madera: 4, piedra: 2, metal: 1, objetos: [{ objetoId: "pocion", cantidad: 2 }] },
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
            personaje: p.usuarioId === "u1" ? { ...character, id: p.personajeId } : {
              id: p.personajeId,
              usuarioId: p.usuarioId,
              nivel: 3,
              experiencia: 0,
              profesionActivaId: "novato",
              rangosAmenazaCompletados: [],
              inventario: { id: "inventario-" + p.usuarioId },
            },
          })),
        };
      },
      updateMany: async ({ where, data }) => {
        calls.expeditionWrites.push({ where, data });
        if (options.rejectExpeditionUpdate) return { count: 0 };
        if (where.fase && where.fase !== faseExpedicion) return { count: 0 };
        if (data.fase) faseExpedicion = data.fase;
        return { count: 1 };
      },
    },
    usuario: {
      update: async ({ where, data }) => {
        calls.userWrites.push({ where, data });
        return { id: where.id, ...data };
      },
    },
    progresoClase: {
      findUnique: async () => null,
      update: async (args) => {
        calls.progressionWrites.push(args);
        return args.data;
      },
    },
    inventario: {
      findUnique: async ({ where }) => ({ id: "inventario-" + where.personajeId }),
      create: async ({ data }) => {
        calls.inventoryCreates.push(data);
        return { id: "inventario-" + data.personajeId };
      },
    },
    inventarioObjeto: {
      findFirst: async () => null,
      create: async ({ data }) => {
        calls.inventoryStackWrites.push(data);
        return data;
      },
      update: async ({ where, data }) => {
        calls.inventoryStackWrites.push({ where, data });
        return data;
      },
      updateMany: async ({ where, data }) => {
        calls.inventoryWrites.push({ where, data });
        return { count: 1 };
      },
      deleteMany: async () => ({ count: 0 }),
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
    inventarioObjeto: {
      updateMany: async ({ where, data }) => {
        calls.inventoryWrites = calls.inventoryWrites || [];
        calls.inventoryWrites.push({ where, data });
        return { count: 1 };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    personaje: {
      findUnique: async () => character,
      updateMany: async ({ where, data }) => {
        calls.characterWrites.push({ where, data });
        if (data.energiaActual?.decrement !== undefined || data.manaActual?.decrement !== undefined) {
          calls.resourceWrites.push({ where, data });
          character.energiaActual -= data.energiaActual?.decrement ?? 0;
          character.manaActual -= data.manaActual?.decrement ?? 0;
        }
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


test("una habilidad activa equipada aplica daño, gasta recursos y guarda cooldown y efectos individuales", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "golpe_arcano", nivel: 1, slot: "activa_1" }],
    energiaActual: 20,
    manaActual: 10,
  });
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: "golpe_arcano" });
  assert.equal(result.accion.texto, "Habilidad de prueba.");
  assert.equal(result.enemigoHp, 0);
  assert.equal(combat.participantes[0].cooldowns.golpe_arcano, 2);
  assert.equal(calls.participantWrites.some((c) => c.data.efectos), true);
  assert.equal(calls.resourceWrites.some((c) => c.data.energiaActual?.decrement === 5), true);
  assert.equal(calls.resourceWrites.some((c) => c.data.manaActual?.decrement === 0), true);
});

test("una habilidad sin Energía suficiente se rechaza sin avanzar el turno", async () => {
  const combat = mkCombat();
  const { prisma, calls } = mockPrisma(combat, {
    habilidades: [{ habilidadId: "golpe_arcano", nivel: 1, slot: "activa_1" }],
    energiaActual: 0,
  });
  const service = loadService(prisma);
  await assert.rejects(
    service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_habilidad", { habilidadId: "golpe_arcano" }),
    (error) => error.code === "ENERGIA_INSUFICIENTE",
  );
  assert.equal(calls.combatWrites.length, 0);
});

test("usar una poción cura al aventurero y consume una unidad de inventario", async () => {
  const combat = mkCombat({ participantes: [mkParticipant("u1", 0, 50, 100), mkParticipant("u2", 1)] });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "usar_objeto", { objetoInventarioId: "inv-pocion-1" });
  assert.equal(result.jugadorHp, 80);
  assert.equal(combat.participantes[0].jugadorHp, 80);
  assert.equal(calls.characterWrites.some((c) => c.data.hpActual === 80), true);
  assert.equal(calls.inventoryWrites.some((c) => c.data.cantidad?.decrement === 1), true);
});


test("los efectos del aventurero se procesan al empezar su turno", async () => {
  const combat = mkCombat({
    participantes: [
      {
        ...mkParticipant("u1", 0, 30, 100),
        efectos: [{ habilidadId: "sangrado", tipo: "dano_progresivo", valor: 10, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" }],
      },
      mkParticipant("u2", 1),
    ],
  });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.jugadorHp, 30);
  assert.equal(calls.participantWrites.some((c) => Array.isArray(c.data.efectos)), true);
});

test("el turno enemigo procesa los efectos periódicos del enemigo antes de atacar", async () => {
  const combat = mkCombat({
    faseTurno: "enemigo",
    turnoActualUsuarioId: null,
    efectosEnemigo: [{ habilidadId: "quemadura", tipo: "dano_progresivo", valor: 5, duracionTurnos: 2, turnosRestantes: 2, objetivo: "enemigo" }],
  });
  const { prisma } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarTurnoEnemigoParty("u1", "expedition-1");
  assert.equal(result.enemigoHp, 40);
});


test("la victoria reparte oro, recursos y objetos de misión sin generar unidades", async () => {
  const combat = mkCombat({ enemigoHp: 10 });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  const result = await service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar");
  assert.equal(result.fase, "victoria");
  assert.equal(combat.recompensasResueltas, true);
  assert.equal(calls.userWrites.length, 2);
  assert.equal(calls.userWrites.reduce((s, w) => s + w.data.oro.increment, 0), 31);
  assert.equal(calls.userWrites.reduce((s, w) => s + w.data.madera.increment, 0), 4);
  assert.equal(calls.userWrites.reduce((s, w) => s + w.data.piedra.increment, 0), 2);
  assert.equal(calls.userWrites.reduce((s, w) => s + w.data.metal.increment, 0), 1);
  assert.equal(calls.inventoryStackWrites.reduce((s, w) => s + (w.cantidad ?? 0), 0), 2);
  assert.equal(result.recompensas.recompensas.length, 2);
});

test("una liquidación persistida impide volver a otorgar la recompensa", async () => {
  const combat = mkCombat({ fase: "victoria", enemigoHp: 0, recompensasResueltas: true });
  const { prisma, calls } = mockPrisma(combat);
  const service = loadService(prisma);
  await assert.rejects(
    service.ejecutarAccionCombateParty("u1", "expedition-1", "atacar"),
    (error) => error.code === "COMBATE_PARTY_TERMINADO",
  );
  assert.equal(calls.userWrites.length, 0);
});
