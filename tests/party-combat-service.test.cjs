require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const reglasCombate = require("../src/lib/party/combate-reglas.ts");

class MockPartyError extends Error {
  constructor(message, status = 409, code = "PARTY_CONFLICT") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const enemy = {
  id: "slime_acido",
  nombre: "Slime Ácido",
  hp: 40,
  ataque: 8,
  ataqueMagico: 7,
  defensa: 4,
  defensaMagica: 3,
  velocidad: 5,
  botin: 10,
  difMin: 1,
  rareza: "comun",
};

function makePersonaje(id, velocidad) {
  return {
    id: "char-" + id,
    usuarioId: id,
    nombre: "Aventurero " + id,
    clase: "Novato",
    profesionActivaId: "novato",
    nivel: 3,
    estado: "de_viaje",
    posicionCombate: "centro",
    habilidades: [],
    progresosClase: [],
    inventario: { objetos: [] },
    equipoEquipado: null,
    fuerza: 1, agilidad: 1, vitalidad: 1, inteligencia: 1, destreza: 1, suerte: 1,
    velocidadPrueba: velocidad,
    hpActual: 50,
  };
}

function participante(id, velocidad, orden = 0, comida = null) {
  return {
    id: "exp-part-" + id,
    expedicionPartyId: "exp1",
    usuarioId: id,
    personajeId: "char-" + id,
    estado: "en_destino",
    efectoComida: comida,
    creado: new Date(Date.now() + orden),
    personaje: makePersonaje(id, velocidad),
  };
}

function loadService(prisma, opciones = {}) {
  const filename = path.resolve(__dirname, "../src/server/services/party/combate-party-service.ts");
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const dependencies = {
    "@prisma/client": { Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } } },
    "@/lib/prisma": { prisma },
    "@/lib/estadisticasPersonaje": {
      calcularEstadisticasPersonaje: (personaje) => ({
        total: {
          hpMaximo: 100 + personaje.nivel,
          ataque: 20,
          ataqueMagico: 15,
          defensa: 5,
          defensaMagica: 4,
          velocidad: personaje.velocidadPrueba,
          probCritico: 0.1,
          danoCritico: 1.5,
          precision: 75,
          evasion: 0.05,
        },
      }),
      calcularModificadoresEquipo: () => ({}),
    },
    "@/lib/inventario": { obtenerEquipoDesdePersonaje: () => ({}) },
    "@/lib/expediciones/normal": { seleccionarEnemigosNormales: () => [enemy] },
    "@/lib/expediciones/enemigos-combate": {
      crearEnemigosEnCombate: (definiciones) => definiciones.map((enemigo, indice) => ({
        id: "enemigo-" + (indice + 1),
        enemigoId: enemigo.id,
        nombre: enemigo.nombre,
        difMin: enemigo.difMin,
        casilla: definiciones.length === 1 ? 4 : indice,
        posicion: definiciones.length === 1 ? "centro" : ["mele", "centro", "retaguardia"][Math.min(2, indice)],
        columna: definiciones.length === 1 ? 1 : indice % 3,
        hp: enemigo.hp,
        hpMaximo: enemigo.hp,
        ataque: enemigo.ataque,
        ataqueMagico: enemigo.ataqueMagico ?? enemigo.ataque,
        defensa: enemigo.defensa,
        defensaMagica: enemigo.defensaMagica ?? enemigo.defensa,
        velocidad: enemigo.velocidad,
        probCritico: 0.1,
        danoCritico: 2,
        precision: 75,
        evasion: 0,
        nivel: enemigo.difMin,
        efectos: [],
      })),
    },
    "@/lib/expediciones/elite": { seleccionarJefeElite: () => enemy },
    "@/lib/comidasTaberna": {
      aplicarEfectoComida: (stats) => stats,
      comidaOtorgaIniciativa: (comida) => comida === "iniciativa",
      obtenerComidaTaberna: (comida) => comida ? { nombre: "Ración de prueba", descripcion: "Asegura iniciativa" } : null,
    },
    "@/lib/expediciones/posicion-combate": {
      normalizarPosicionCombate: (value) => ["mele", "centro", "retaguardia"].includes(value) ? value : "centro",
      aplicarModificadoresPosicion: (stats) => stats,
    },
    "@/lib/expediciones/dificultad": {
      esModoDificultad: (value) => ["facil", "normal", "dificil"].includes(value),
      calcularMultiplicadoresEnemigo: () => ({ vida: 1, ataque: 1, defensa: 1 }),
    },
    "@/lib/party/combate-reglas": reglasCombate,
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

function makePrisma(tx, expedition) {
  return {
    $transaction: async (callback, options) => {
      assert.equal(options?.isolationLevel, "Serializable");
      return callback(tx);
    },
    _expedition: expedition,
  };
}

function makeExpedition(participantes, overrides = {}) {
  return {
    id: "exp1",
    partyId: "party1",
    liderUsuarioId: "leader",
    tipo: "normal",
    misionId: "mision-1",
    enemigoId: null,
    nombre: "Prueba de expedición",
    recompensa: { oro: 100, madera: 0, piedra: 0, metal: 0 },
    dificultad: 3,
    modoDificultad: "normal",
    fase: "lista_para_combate",
    fechaLlegada: new Date(Date.now() - 1000),
    participantes,
    combate: null,
    ...overrides,
  };
}

test("solo los participantes de la expedición pueden iniciar el combate", async () => {
  const exp = makeExpedition([participante("leader", 8), participante("guest", 6, 1)]);
  const tx = { expedicionParty: { findUnique: async () => exp } };
  const service = loadService(makePrisma(tx, exp));
  await assert.rejects(
    service.iniciarCombateParty("intruso", "exp1"),
    (error) => error.status === 403 && error.code === "NO_ES_PARTICIPANTE",
  );
});

test("iniciar combate crea un único enemigo común y snapshots independientes por aventurero", async () => {
  const parts = [participante("leader", 8), participante("guest", 6, 1), participante("guest2", 4, 2)];
  const exp = makeExpedition(parts);
  let combatCreated = null;
  let rowsCreated = [];
  let phaseUpdated = null;
  let participantState = null;
  const characterUpdates = [];
  const tx = {
    expedicionParty: {
      findUnique: async () => exp,
      updateMany: async ({ where, data }) => {
        assert.equal(where.fase, "lista_para_combate");
        phaseUpdated = data.fase;
        return { count: 1 };
      },
    },
    combateParty: {
      create: async ({ data }) => {
        combatCreated = { id: "combat1", ...data };
        return combatCreated;
      },
    },
    combatePartyParticipante: {
      createMany: async ({ data }) => {
        rowsCreated = data;
        return { count: data.length };
      },
    },
    expedicionPartyParticipante: {
      updateMany: async ({ where, data }) => {
        assert.equal(where.estado, "en_destino");
        participantState = data.estado;
        return { count: 3 };
      },
    },
    personaje: {
      updateMany: async ({ where, data }) => {
        characterUpdates.push({ where, data });
        return { count: 1 };
      },
    },
  };
  const service = loadService(makePrisma(tx, exp));
  const result = await service.iniciarCombateParty("leader", "exp1");
  assert.equal(result.combatePartyId, "combat1");
  assert.equal(result.yaExistia, false);
  assert.equal(combatCreated.enemigoNombre, "Slime Ácido");
  assert.equal(combatCreated.enemigoHp, 40);
  assert.equal(combatCreated.faseTurno, "jugador");
  assert.equal(rowsCreated.length, 3);
  assert.deepEqual(rowsCreated.map((p) => p.usuarioId), ["leader", "guest", "guest2"]);
  assert.ok(rowsCreated.every((p) => p.jugadorHp === 103 && p.estado === "activo"));
  assert.equal(phaseUpdated, "combatiendo");
  assert.equal(participantState, "activo");
  assert.equal(characterUpdates.length, 3);
  assert.ok(characterUpdates.every((x) => x.where.estado === "de_viaje" && x.data.estado === "combatiendo"));
});

test("la iniciativa por comida de cualquier compañero da el primer turno al grupo", async () => {
  const parts = [participante("leader", 2), participante("guest", 3, 1, "iniciativa")];
  const exp = makeExpedition(parts);
  const tx = {
    expedicionParty: {
      findUnique: async () => exp,
      updateMany: async () => ({ count: 1 }),
    },
    combateParty: { create: async ({ data }) => ({ id: "combat2", ...data }) },
    combatePartyParticipante: { createMany: async () => ({ count: 2 }) },
    expedicionPartyParticipante: { updateMany: async () => ({ count: 2 }) },
    personaje: { updateMany: async () => ({ count: 1 }) },
  };
  const service = loadService(makePrisma(tx, exp));
  const result = await service.iniciarCombateParty("guest", "exp1");
  assert.equal(result.faseTurno, "jugador");
  assert.equal(result.turnoActualUsuarioId, "guest");
});

test("no se puede iniciar el combate antes de que el viaje finalice", async () => {
  const exp = makeExpedition(
    [participante("leader", 8), participante("guest", 6, 1)],
    { fechaLlegada: new Date(Date.now() + 60_000) },
  );
  const tx = { expedicionParty: { findUnique: async () => exp } };
  const service = loadService(makePrisma(tx, exp));
  await assert.rejects(
    service.iniciarCombateParty("leader", "exp1"),
    (error) => error.status === 409 && error.code === "EXPEDICION_PARTY_NO_LLEGADA",
  );
});

test("una petición repetida devuelve el combate ya creado sin duplicarlo", async () => {
  const existingCombat = {
    id: "combat1",
    fase: "activo",
    ronda: 1,
    faseTurno: "jugador",
    turnoActualUsuarioId: "leader",
  };
  const exp = makeExpedition(
    [participante("leader", 8), participante("guest", 6, 1)],
    { fase: "combatiendo", combate: existingCombat },
  );
  const tx = { expedicionParty: { findUnique: async () => exp } };
  const service = loadService(makePrisma(tx, exp));
  const result = await service.iniciarCombateParty("guest", "exp1");
  assert.equal(result.combatePartyId, "combat1");
  assert.equal(result.yaExistia, true);
});
