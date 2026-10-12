const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function makeCombatConsumableRoute({
  authenticated = true,
  initialHp = 40,
  maxHp = 100,
  initialQuantity = 2,
  itemId = "pocion",
} = {}) {
  let state = {
    user: {
      id: "u1",
      oro: 0,
      personaje: {
        id: "p1",
        usuarioId: "u1",
        estado: "combatiendo",
        nombre: "Aventurero",
        clase: "Novato",
        profesionActivaId: "novato",
        nivel: 1,
        experiencia: 0,
        puntosAtributoDisponibles: 0,
        fuerza: 1,
        agilidad: 1,
        vitalidad: 1,
        inteligencia: 1,
        destreza: 1,
        suerte: 1,
        energiaActual: 10,
        manaActual: 5,
        hpActual: initialHp,
        habilidades: [],
        inventario: {
          id: "inv1",
          objetos: [{
            id: "item-consumible",
            inventarioId: "inv1",
            objetoId: itemId,
            cantidad: initialQuantity,
            nivelMejora: 0,
            sufijoId: null,
            bonificaciones: {},
          }],
        },
      },
      expedicionActiva: {
        id: "exp1",
        tipo: "normal",
        fase: "combatiendo",
        dificultad: 1,
        recompensa: { oro: 0, madera: 0, piedra: 0, metal: 0 },
        combateActivo: {
          id: "combat1",
          version: 0,
          tipo: "pve",
          fase: "activo",
          ronda: 1,
          turno: "jugador",
          jugadorHp: initialHp,
          jugadorHpMaximo: maxHp,
          jugadorAtaque: 5,
          jugadorAtaqueMagico: 1,
          jugadorDefensa: 2,
          jugadorDefensaMagica: 0,
          jugadorVelocidad: 5,
          jugadorProbCritico: 0,
          jugadorDanoCritico: 1.5,
          jugadorNivel: 1,
          enemigoHp: 100,
          enemigoHpMaximo: 100,
          enemigoAtaque: 5,
          enemigoAtaqueMagico: 1,
          enemigoDefensa: 2,
          enemigoDefensaMagica: 0,
          enemigoVelocidad: 3,
          enemigoProbCritico: 0,
          enemigoDanoCritico: 1.5,
          enemigoNivel: 1,
          enemigoId: "slime_verde",
          enemigoNombre: "Slime",
          cooldowns: {},
          efectos: [],
          log: [],
        },
      },
    },
    item: {
      id: "item-consumible",
      inventarioId: "inv1",
      objetoId: itemId,
      cantidad: initialQuantity,
      nivelMejora: 0,
      sufijoId: null,
      bonificaciones: {},
    },
    combate: {
      id: "combat1",
      version: 0,
      tipo: "pve",
      fase: "activo",
      ronda: 1,
      turno: "jugador",
      jugadorHp: initialHp,
      jugadorHpMaximo: maxHp,
      jugadorDefensa: 2,
      enemigoHp: 100,
      enemigoDefensa: 2,
      cooldowns: {},
      efectos: [],
      log: [],
    },
    expediente: { id: "exp1", fase: "combatiendo" },
  };
  const clone = (value) => value == null ? value : structuredClone(value);
  const tx = {
    personaje: {
      findUnique: async () => ({
        id: "p1", nivel: 1, profesionActivaId: "novato",
        fuerza: 1, agilidad: 1, vitalidad: 1, inteligencia: 1, destreza: 1, suerte: 1,
        energiaActual: 10, manaActual: 5, equipoEquipado: null,
      }),
      updateMany: async () => ({ count: 1 }),
    },
    inventarioObjeto: {
      updateMany: async ({ where, data }) => {
        if (!state.item) return { count: 0 };
        if (state.item.id !== where.id || state.item.inventarioId !== where.inventarioId ||
            state.item.objetoId !== where.objetoId || state.item.cantidad < (where.cantidad?.gte ?? 0)) {
          return { count: 0 };
        }
        applyData(state.item, data);
        state.user.personaje.inventario.objetos[0].cantidad = state.item.cantidad;
        return { count: 1 };
      },
      deleteMany: async ({ where }) => {
        if (!state.item) return { count: 0 };
        if (state.item.id === where.id && state.item.cantidad <= (where.cantidad?.lte ?? -1)) {
          state.user.personaje.inventario.objetos = [];
          state.item = null;
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
    combateActivo: {
      updateMany: async ({ where, data }) => {
        if (where.id !== state.combate.id || where.version !== state.combate.version) return { count: 0 };
        applyData(state.combate, data);
        return { count: 1 };
      },
      findUniqueOrThrow: async () => clone(state.combate),
    },
    expedicionActiva: { update: async ({ data }) => { applyData(state.expediente, data); return clone(state.expediente); } },
    progresoClase: { findUnique: async () => null },
    $queryRaw: async () => [],
    usuario: {
      findUnique: async () => clone(state.user),
      updateMany: async () => ({ count: 1 }),
    },
  };
  const prisma = {
    usuario: { findUnique: async () => clone(state.user) },
    combateActivo: { findFirst: async () => null },
    $transaction: async (work) => {
      const snapshot = clone(state);
      try { return await work(tx); }
      catch (error) { state = snapshot; throw error; }
    },
  };
  const { POST } = loadSource("src/app/api/combate/accion/route.ts", {
    "next/server": { NextResponse },
    "@prisma/client": {
      Prisma: {
        ...PrismaStub,
        TransactionIsolationLevel: { Serializable: "Serializable" },
      },
    },
    "@/lib/auth": { getAuthenticatedUser: async () => authenticated ? { id: "u1" } : null },
    "@/lib/prisma": { prisma },
    "@/lib/progresion/experiencia": { aplicarExperienciaJob: (p) => p, PUNTOS_ATRIBUTO_POR_NIVEL_BASE: 3 },
    "@/lib/progresion/estadisticas": { calcularEstadisticasDerivadasRpg: () => ({
      energiaMaxima: 20, manaMaximo: 10, regeneracionEnergiaPorTurno: 1, regeneracionManaPorTurno: 1,
    }) },
    "@/lib/progresion/atributos-clase": { calcularAtributosClase: () => ({ fuerza: 1, agilidad: 1, vitalidad: 1, inteligencia: 1, destreza: 1, suerte: 1 }) },
    "@/lib/progresion/bonificaciones-equipo": { mapearBonificacionesEquipoRpg: () => ({}) },
    "@/lib/estadisticasPersonaje": { calcularModificadoresEquipo: () => ({}) },
    "@/lib/inventario": { obtenerEquipoDesdePersonaje: () => ({}) },
    "@/lib/configuracionJuego": { experienciaParaNivel: () => 100 },
    "@/lib/enemigos": {
      obtenerEnemigoPorId: () => ({ id: "slime_verde", nombre: "Slime", botin: 0, difMin: 0 }),
    },
    "@/lib/objetos": {
      obtenerObjetoPorId: (id) => ({
        id, nombre: id === "pocion" ? "Poción" : "Espada",
        tipo: id === "pocion" ? "consumible" : "arma", curacion: id === "pocion" ? 30 : undefined,
      }),
    },
    "@/lib/progresion/clases": { CLASES: {}, puedeUsarHabilidadDeClase: () => true },
    "@/lib/sufijosObjetos": { obtenerNombreObjetoConSufijo: (name) => name },
    "@/lib/habilidades": { obtenerHabilidadPorId: () => null },
    "@/lib/expediciones/combate": {
      calcularBonusDefensaMuralla: () => 0,
      resolverAtaqueJugador: () => ({ actor: "jugador", tipo: "ataque", animacion: "ofensiva", dano: 5, critico: false, texto: "Atacas." }),
      resolverAtaqueEnemigo: () => ({ actor: "enemigo", tipo: "ataque", animacion: "ofensiva", dano: 5, critico: false, texto: "Te golpea." }),
      resolverHabilidadJugador: () => ({ accion: { actor: "jugador", tipo: "habilidad", animacion: "curacion", dano: 0, critico: false, texto: "Habilidad." }, jugadorHp: initialHp, jugadorDefensa: 2 }),
    },
    "@/lib/expediciones/asedio": {
      determinarGanadorAsedio: () => null,
      determinarPrimerTurnoAsedio: () => "atacante",
      siguienteTurnoAsedio: () => "defensor",
      finalizarAsedio: async () => ({}),
    },
    "../../../../lib/expediciones/dificultad": {
      aplicarMultiplicadorRecompensa: (cantidad) => cantidad,
      calcularExperienciaBaseGanada: () => 0,
      calcularExperienciaJobGanada: () => 0,
      calcularOroEnemigo: () => 0,
      CONFIGURACION_DIFICULTAD: {
        facil: { multiplicadorRecompensa: 0.85 },
        normal: { multiplicadorRecompensa: 1 },
        dificil: { multiplicadorRecompensa: 1.25 },
      },
      esModoDificultad: (valor) => ["facil", "normal", "dificil"].includes(valor),
      registrarVictoriaRangoNormal: (_rangos, _nivel) => ["I"],
    },
  });
  return { POST, getState: () => state };
}


class PrismaClientKnownRequestError extends Error {
  constructor(message, { code }) {
    super(message);
    this.code = code;
  }
}

const PrismaStub = {
  PrismaClientKnownRequestError,
  TransactionIsolationLevel: { Serializable: "Serializable" },
};
const NextResponse = {
  json(body, init = {}) {
    return {
      body,
      status: init.status ?? 200,
      headers: init.headers ?? {},
    };
  },
};

function loadSource(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  const loaded = { exports: {} };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", {
    filename,
  })(
    (name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name === "@/lib/progresion/atributos-clase") {
        return {
          calcularAtributosClase: () => ({
            fuerza: 1, agilidad: 1, vitalidad: 1,
            inteligencia: 1, destreza: 1, suerte: 1,
          }),
        };
      }
      if (name === "@/lib/sufijosObjetos") {
        return {
          obtenerNombreObjetoConSufijo: (nombre) => nombre,
          sanitizarBonificacionesObjeto: (valor) =>
            valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {},
        };
      }
      return require(name);
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function request(body) {
  return { json: async () => body };
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function matches(record, where) {
  if (!record) return false;
  for (const [key, expected] of Object.entries(where ?? {})) {
    const actual = record[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if (Object.hasOwn(expected, "gte") && !(actual >= expected.gte)) return false;
      if (Object.hasOwn(expected, "lte") && !(actual <= expected.lte)) return false;
      if (Object.hasOwn(expected, "not") && actual === expected.not) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

function applyData(record, data) {
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (Object.hasOwn(value, "decrement")) record[key] -= value.decrement;
      else if (Object.hasOwn(value, "increment")) record[key] += value.increment;
      else record[key] = clone(value);
    } else {
      record[key] = value;
    }
  }
}

function createTransactionRunner(getState, setState, makeTx) {
  let tail = Promise.resolve();
  return async function transaction(work) {
    let release;
    const previous = tail;
    tail = new Promise((resolve) => { release = resolve; });
    await previous;
    const snapshot = clone(getState());
    try {
      return await work(makeTx());
    } catch (error) {
      setState(snapshot);
      throw error;
    } finally {
      release();
    }
  };
}

function makeMarketRoute({ authenticated = true, initialUser = {} } = {}) {
  let state = {
    user: {
      id: "u1",
      oro: 1000,
      madera: 0,
      piedra: 0,
      metal: 0,
      edificios: { mercado: 1 },
      ...clone(initialUser),
    },
  };
  const getState = () => state;
  const prisma = {
    usuario: {
      findUnique: async ({ where }) =>
        state.user?.id === where.id ? clone(state.user) : null,
      findUniqueOrThrow: async ({ where }) => {
        if (state.user?.id !== where.id) throw new Error("Usuario no encontrado");
        return clone(state.user);
      },
      updateMany: async ({ where, data }) => {
        if (!matches(state.user, where)) return { count: 0 };
        applyData(state.user, data);
        return { count: 1 };
      },
    },
  };
  const route = loadSource("src/app/api/mercado/comprar/route.ts", {
    "next/server": { NextResponse },
    "@/lib/auth": { getAuthenticatedUser: async () => authenticated ? { id: "u1" } : null },
    "@/lib/prisma": { prisma },
  });
  return { POST: route.POST, getState };
}

function makeObjectRoute({ authenticated = true, initialUser = {}, initialItems = [] } = {}) {
  let state = {
    user: {
      id: "u1",
      oro: 1000,
      edificios: { armeria: 1 },
      personaje: { id: "p1", nivel: 1, inventario: { id: "inv1" } },
      ...clone(initialUser),
    },
    items: clone(initialItems),
    nextItemId: 1,
  };
  const getState = () => state;
  const setState = (next) => { state = next; };
  const findInventoryItem = (inventarioId, objetoId) =>
    state.items.find((item) => item.inventarioId === inventarioId && item.objetoId === objetoId) ?? null;
  const tx = {
    usuario: {
      updateMany: async ({ where, data }) => {
        if (!matches(state.user, where)) return { count: 0 };
        applyData(state.user, data);
        return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }) => {
        if (state.user?.id !== where.id) throw new Error("Usuario no encontrado");
        return clone(state.user);
      },
    },
    inventarioObjeto: {
      count: async ({ where }) =>
        state.items.filter((item) => item.inventarioId === where.inventarioId).length,
      create: async ({ data }) => {
        const item = { id: "item-" + state.nextItemId++, ...clone(data) };
        state.items.push(item);
        return clone(item);
      },
    },
  };
  const transaction = createTransactionRunner(getState, setState, () => tx);
  const prisma = {
    usuario: {
      findUnique: async ({ where }) =>
        state.user?.id === where.id ? clone(state.user) : null,
    },
    inventarioObjeto: {
      findUnique: async ({ where }) => {
        const key = where.inventarioId_objetoId;
        return clone(findInventoryItem(key.inventarioId, key.objetoId));
      },
    },
    $transaction: transaction,
  };
  const objeto = {
    id: "espada_prueba",
    nombre: "Espada de prueba",
    tipo: "arma",
    rareza: "basico",
    precio: 100,
  };
  const route = loadSource("src/app/api/objetos/comprar/route.ts", {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => authenticated ? { id: "u1" } : null },
    "@/lib/prisma": { prisma },
    "@/lib/objetos": { obtenerObjetoPorId: (id) => id === objeto.id ? objeto : null },
    "@/lib/sufijosObjetos": { obtenerNombreObjetoConSufijo: (nombre) => nombre },
    "@/lib/inventario": { LIMITE_INVENTARIO_OBJETOS: 30 },
    "@/lib/tiendaObjetos": {
      puedeComprarObjeto: () => true,
      obtenerRequisitosRareza: () => ({ nivelArmeria: 1, nivelHeroe: 1 }),
    },
  });
  return { POST: route.POST, getState };
}


function makeObjectUpgradeRoute({ authenticated = true, initialGold = 500, initialState = "ocioso", transactionState = initialState } = {}) {
  let state = {
    user: {
      id: "u1",
      oro: initialGold,
      edificios: { herreria: 1 },
      personaje: {
        id: "p1",
        estado: initialState,
        inventario: { id: "inv1" },
        equipoEquipado: {
          armaInventarioId: "item1",
          armaduraInventarioId: null,
        },
      },
    },
    items: [{
      id: "item1",
      inventarioId: "inv1",
      objetoId: "espada_prueba",
      nivelMejora: 0,
      cantidad: 1,
    }],
  };
  const getState = () => state;
  const setState = (next) => { state = next; };
  const tx = {
    personaje: {
      findUnique: async () => ({ estado: transactionState }),
    },
    equipoEquipado: {
      findUnique: async () => clone(state.user.personaje.equipoEquipado),
    },
    usuario: {
      updateMany: async ({ where, data }) => {
        if (!matches(state.user, where)) return { count: 0 };
        applyData(state.user, data);
        return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }) => {
        if (state.user?.id !== where.id) throw new Error("Usuario no encontrado");
        return { oro: state.user.oro };
      },
    },
    inventarioObjeto: {
      updateMany: async ({ where, data }) => {
        const item = state.items.find((candidate) => matches(candidate, where));
        if (!item) return { count: 0 };
        applyData(item, data);
        return { count: 1 };
      },
    },
  };
  const prisma = {
    usuario: {
      findUnique: async ({ where }) =>
        state.user?.id === where.id ? clone(state.user) : null,
    },
    inventarioObjeto: {
      findFirst: async ({ where }) =>
        clone(state.items.find((item) => matches(item, where)) ?? null),
    },
    $transaction: createTransactionRunner(getState, setState, () => tx),
  };
  const objeto = {
    id: "espada_prueba",
    nombre: "Espada de prueba",
    tipo: "arma",
    precio: 100,
  };
  const route = loadSource("src/app/api/objetos/mejorar/route.ts", {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => authenticated ? { id: "u1" } : null },
    "@/lib/prisma": { prisma },
    "@/lib/objetos": {
      obtenerObjetoPorId: (id) => id === objeto.id ? objeto : null,
      calcularCosteMejoraObjeto: () => 100,
    },
  });
  return { POST: route.POST, getState };
}

function makeActionsRoute({ authenticated = true, initialUser = {} } = {}) {
  let state = {
    user: {
      id: "u1",
      password: "test-secret",
      oro: 1000,
      madera: 100,
      piedra: 100,
      metal: 100,
      edificios: { taberna: 1 },
      baseCoords: null,
      expedicionActiva: null,
      personaje: {
        id: "p1",
        usuarioId: "u1",
        nombre: "Héroe",
        clase: "Guerrero",
        sexo: "chico",
        nivel: 1,
        hpActual: 20,
        regeneracionDeVida: 0.3,
        estado: "ocioso",
        velocidadMejoras: 0,
        habilidades: [],
        inventario: { id: "inv1", objetos: [] },
        equipoEquipado: null,
      },
      ...clone(initialUser),
    },
  };
  const getState = () => state;
  const setState = (next) => { state = next; };
  const updateUserMany = async ({ where, data }) => {
    if (!matches(state.user, where)) return { count: 0 };
    applyData(state.user, data);
    return { count: 1 };
  };
  const updateCharacterMany = async ({ where, data }) => {
    const character = state.user?.personaje;
    if (!matches(character, where)) return { count: 0 };
    applyData(character, data);
    return { count: 1 };
  };
  const tx = {
    usuario: {
      findUnique: async ({ where }) =>
        state.user?.id === where.id ? clone(state.user) : null,
      findUniqueOrThrow: async ({ where }) => {
        if (state.user?.id !== where.id) throw new Error("Usuario no encontrado");
        return clone(state.user);
      },
      updateMany: updateUserMany,
      update: async ({ where, data }) => {
        if (state.user?.id !== where.id) throw new Error("Usuario no encontrado");
        const nestedCreate = data.personaje && data.personaje.create;
        if (nestedCreate) {
          if (state.user.personaje) {
            throw new PrismaClientKnownRequestError("Unique constraint", { code: "P2002" });
          }
          state.user.personaje = {
            id: "p1",
            usuarioId: state.user.id,
            ...clone(nestedCreate),
            habilidades: [],
            inventario: null,
            equipoEquipado: null,
          };
        }
        const scalarData = { ...data };
        delete scalarData.personaje;
        applyData(state.user, scalarData);
        return clone(state.user);
      },
    },
    personaje: { updateMany: updateCharacterMany },
    expedicionActiva: {
      findUnique: async ({ where }) =>
        state.user?.id === where.usuarioId ? clone(state.user.expedicionActiva) : null,
    },
  };
  const transaction = createTransactionRunner(getState, setState, () => tx);
  const prisma = {
    usuario: {
      findUnique: async ({ where }) =>
        state.user?.id === where.id ? clone(state.user) : null,
      update: async ({ where, data }) => {
        if (state.user?.id !== where.id) throw new Error("Usuario no encontrado");
        applyData(state.user, data);
        return clone(state.user);
      },
      updateMany: updateUserMany,
    },
    personaje: {
      findUnique: async ({ where }) =>
        state.user?.personaje?.usuarioId === where.usuarioId ? clone(state.user.personaje) : null,
      updateMany: updateCharacterMany,
    },
    expedicionActiva: tx.expedicionActiva,
    $transaction: transaction,
  };
  const configEdificios = {
    mercado: { nombre: "Mercado", nivelMax: 3 },
    escuelaCombate: { nombre: "Escuela de combate", nivelMax: 3 },
  };
  const route = loadSource("src/app/api/jugador/acciones/route.ts", {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => authenticated ? { id: "u1" } : null },
    "@/lib/prisma": { prisma },
    "@/lib/regeneracion": { sincronizarRegeneracion: async (personaje) => personaje },
    "@/lib/configuracionJuego": {
      CONFIGURACION_ATRIBUTOS: {
        velocidad: { campo: "velocidadMejoras", edificio: "mercado", limitePorNivel: 5 },
      },
      REQUISITOS_EDIFICIOS: {},
      calcularCosteAtributo: () => 10,
      calcularCosteEdificio: () => ({ oro: 100, madera: 10, piedra: 10, metal: 5 }),
      calcularEstadisticasBase: () => ({ hpMaximo: 40 }),
    },
    "@/lib/tiposJuego": { CONFIGURACION_EDIFICIOS: configEdificios },
    "@/lib/estadisticasPersonaje": {
      calcularEstadisticasPersonaje: () => ({ total: { hpMaximo: 40 } }),
    },
    "@/lib/progresion/estadisticas": {
      calcularEstadisticasDerivadasRpg: () => ({
        hpMaximo: 40,
        energiaMaxima: 20,
        manaMaximo: 10,
        regeneracionEnergiaPorTurno: 1,
        regeneracionManaPorTurno: 1,
      }),
    },
    "@/lib/inventario": { asegurarInventarioYEquipo: async () => {} },
  });
  return { POST: route.POST, getState };
}

function makeExpeditionRoutes({ authenticated = true, initialUser = null } = {}) {
  const user = initialUser ?? {
    id: "u1",
    baseCoords: { lat: 28.0, lng: -15.5 },
    ultimaMisionElite: null,
    edificios: { embajada: 1 },
    expedicionActiva: null,
    personaje: {
      id: "p1",
      nivel: 1,
      hpActual: 20,
      habilidades: [],
      inventario: { id: "inv1", objetos: [] },
      equipoEquipado: null,
    },
  };
  let createdExpedition = false;
  const prisma = {
    usuario: {
      findUnique: async () => clone(user),
    },
    expedicionActiva: {
      create: async () => { createdExpedition = true; throw new Error("No debería crear expedición en este test"); },
    },
    $transaction: async (work) => work(prisma),
  };
  const common = {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => authenticated ? { id: "u1" } : null },
    "@/lib/prisma": { prisma },
    "@/lib/regeneracion": { sincronizarRegeneracion: async (personaje) => personaje },
    "@/lib/estadisticasPersonaje": {
      calcularEstadisticasPersonaje: () => ({ total: { hpMaximo: 40, ataque: 5, defensa: 2, velocidad: 5 } }),
      calcularModificadoresEquipo: () => ({}),
    },
    "@/lib/inventario": { obtenerEquipoDesdePersonaje: () => ({}) },
    "@/lib/utils": { calcularDistanciaKm: () => 1 },
    "@/lib/expediciones/comercio": { calcularOroBaseComercio: () => 20 },
    "@/lib/generadorMisiones": { generarMisionesDisponibles: () => [] },
    "@/lib/progresion/clases": { obtenerDefinicionClase: () => undefined },
    "../../../../lib/expediciones/dificultad": {
      esModoDificultad: (valor) => ["facil", "normal", "dificil"].includes(valor),
      obtenerRangoMaximoDesbloqueado: () => ({
        id: "I",
        nombre: "Primeras amenazas",
        minimo: 1,
        maximo: 3,
        nivelBaseMinimo: 1,
      }),
    },
  };
  const available = loadSource("src/app/api/expediciones/disponibles/route.ts", common);
  const start = loadSource("src/app/api/expediciones/iniciar/route.ts", common);
  return {
    getAvailable: available.GET,
    startExpedition: start.POST,
    wasExpeditionCreated: () => createdExpedition,
  };
}

function makeInvalidBodyRoute(relativePath) {
  const route = loadSource(relativePath, {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "u1" }) },
    "@/lib/prisma": { prisma: {} },
    "@/lib/objetos": { obtenerObjetoPorId: () => null },
    "@/lib/habilidades": { obtenerHabilidadPorId: () => null },
    "@/lib/progresion/clases": { puedeUsarHabilidadDeClase: () => true },
    "@/lib/progresion/experiencia": {
      aplicarExperienciaJob: (progreso) => progreso,
      PUNTOS_ATRIBUTO_POR_NIVEL_BASE: 3,
    },
    "@/lib/progresion/estadisticas": {
      calcularEstadisticasDerivadasRpg: () => ({
        energiaMaxima: 20,
        manaMaximo: 10,
        regeneracionEnergiaPorTurno: 1,
        regeneracionManaPorTurno: 1,
      }),
    },
    "@/lib/progresion/bonificaciones-equipo": {
      mapearBonificacionesEquipoRpg: () => ({}),
    },
    "@/lib/estadisticasPersonaje": {
      calcularModificadoresEquipo: () => ({}),
    },
    "@/lib/inventario": {
      obtenerEquipoDesdePersonaje: () => ({}),
    },
    "@/lib/configuracionJuego": { puedeAprenderHabilidad: () => true },
    "@/lib/tiendaHabilidades": { obtenerHabilidadesEnVenta: () => [] },
    "@/lib/enemigos": { obtenerEnemigoPorId: () => null },
    "@/lib/expediciones/combate": {
      calcularBonusDefensaMuralla: () => 0,
      resolverAtaqueJugador: () => ({}),
      resolverAtaqueEnemigo: () => ({}),
      resolverHabilidadJugador: () => ({}),
    },
    "@/lib/expediciones/asedio": {
      determinarGanadorAsedio: () => null,
      determinarPrimerTurnoAsedio: () => "atacante",
      siguienteTurnoAsedio: () => "defensor",
      finalizarAsedio: async () => ({}),
    },
  });

  return route.POST;
}

function makeObjectEquipConflictRoute({ initialState = "ocioso", transactionState = initialState } = {}) {
  const prisma = {
    personaje: {
      findUnique: async () => ({
        id: "p1",
        estado: initialState,
        inventario: { id: "inv1" },
        equipoEquipado: null,
      }),
    },
    inventarioObjeto: {
      findFirst: async () => ({
        id: "item1",
        inventarioId: "inv1",
        objetoId: "espada_prueba",
      }),
    },
    equipoEquipado: {
      findUnique: async () => null,
      upsert: async () => {
        throw new PrismaClientKnownRequestError("Unique constraint", { code: "P2002" });
      },
    },
    $transaction: async (work) => work({
      personaje: { findUnique: async () => ({ estado: transactionState }) },
      equipoEquipado: prisma.equipoEquipado,
    }),
  };
  const route = loadSource("src/app/api/objetos/equipar/route.ts", {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "u1" }) },
    "@/lib/prisma": { prisma },
    "@/lib/objetos": {
      obtenerObjetoPorId: (id) => id === "espada_prueba"
        ? { id, nombre: "Espada de prueba", tipo: "arma" }
        : null,
      obtenerRanuraObjeto: (objeto) => objeto.tipo === "arma" ? "arma" : null,
    },
  });

  return route.POST;
}

function makeObjectUnequipRoute({ initialState = "ocioso", transactionState = initialState } = {}) {
  const state = {
    personaje: {
      id: "p1",
      usuarioId: "u1",
      estado: initialState,
      equipoEquipado: {
        armaInventarioId: "item1",
        manoSecundariaInventarioId: null,
        cascoInventarioId: null,
        armaduraInventarioId: null,
        pantalonesInventarioId: null,
        botasInventarioId: null,
        guantesInventarioId: null,
        accesorioInventarioId: null,
        anillo1InventarioId: null,
        anillo2InventarioId: null,
      },
    },
  };
  const tx = {
    personaje: {
      findUnique: async () => ({ estado: transactionState }),
    },
    equipoEquipado: {
      findUnique: async () => clone(state.personaje.equipoEquipado),
      update: async ({ data }) => {
        applyData(state.personaje.equipoEquipado, data);
        return clone(state.personaje.equipoEquipado);
      },
    },
  };
  const prisma = {
    personaje: { findUnique: async () => clone(state.personaje) },
    $transaction: async (work) => work(tx),
  };
  const route = loadSource("src/app/api/objetos/desequipar/route.ts", {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "u1" }) },
    "@/lib/prisma": { prisma },
  });
  return { POST: route.POST, getState: () => state };
}

function makeAbilityEquipConflictRoute(errorCode = "P2002") {
  let transactionOptions = null;
  const prisma = {
    $transaction: async (_work, options) => {
      transactionOptions = options;
      throw new PrismaClientKnownRequestError("Concurrent slot update", { code: errorCode });
    },
  };
  const route = loadSource("src/app/api/habilidades/equipar/route.ts", {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "u1" }) },
    "@/lib/prisma": { prisma },
    "@/lib/habilidades": {
      obtenerHabilidadPorId: (id) => id === "golpe_prueba"
        ? { id, nombre: "Golpe de prueba", tipo: "activa" }
        : null,
    },
    "@/lib/progresion/clases": { puedeUsarHabilidadDeClase: () => true },
  });

  return {
    POST: route.POST,
    getTransactionOptions: () => transactionOptions,
  };
}

test("regresión: la entrega de botín en expedición respeta el límite de inventario y comunica si se pierde", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../src/app/api/expediciones/completar/route.ts"),
    "utf8",
  );
  assert.match(source, /espaciosOcupados < LIMITE_INVENTARIO_OBJETOS/);
  assert.match(source, /botinPerdidoPorInventarioLleno = true/);
  assert.match(source, /El inventario está lleno y el objeto encontrado se ha perdido\./);
  assert.match(source, /objetosObtenidos: actualizado\.botinEntregado \? \[actualizado\.botinEntregado\] : \[\]/);
});

test("combate: las pociones curan hasta el máximo y consumen una unidad atómicamente", async () => {
  const route = makeCombatConsumableRoute({ initialHp: 80, maxHp: 100, initialQuantity: 2 });
  const response = await route.POST(request({ accion: "usar_objeto", objetoInventarioId: "item-consumible" }));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.accion.curacion, 20);
  assert.equal(response.body.combate.jugadorHp, 100);
  assert.equal(route.getState().item.cantidad, 1);
  assert.equal(route.getState().combate.version, 1);
});

test("combate: rechaza objeto inexistente, no consumible y salud completa sin gastar inventario", async () => {
  const inexistente = makeCombatConsumableRoute({ initialHp: 80 });
  assert.equal((await inexistente.POST(request({ accion: "usar_objeto", objetoInventarioId: "otro" }))).status, 404);
  assert.equal(inexistente.getState().item.cantidad, 2);

  const noConsumible = makeCombatConsumableRoute({ itemId: "espada_madera", initialHp: 80 });
  assert.equal((await noConsumible.POST(request({ accion: "usar_objeto", objetoInventarioId: "item-consumible" }))).status, 400);
  assert.equal(noConsumible.getState().item.cantidad, 2);

  const saludCompleta = makeCombatConsumableRoute({ initialHp: 100, maxHp: 100 });
  assert.equal((await saludCompleta.POST(request({ accion: "usar_objeto", objetoInventarioId: "item-consumible" }))).status, 400);
  assert.equal(saludCompleta.getState().item.cantidad, 2);
});

test("equipamiento y habilidades: rechazan JSON malformado y cuerpos que no son objetos", async () => {
  const paths = [
    "src/app/api/objetos/equipar/route.ts",
    "src/app/api/objetos/desequipar/route.ts",
    "src/app/api/habilidades/aprender/route.ts",
    "src/app/api/habilidades/equipar/route.ts",
    "src/app/api/habilidades/desequipar/route.ts",
    "src/app/api/combate/accion/route.ts",
  ];
  const invalidRequests = [
    {
      label: "JSON malformado",
      request: { json: async () => { throw new SyntaxError("JSON inválido"); } },
    },
    { label: "null", request: request(null) },
    { label: "array", request: request([]) },
    { label: "cadena", request: request("no es un objeto") },
  ];

  for (const routePath of paths) {
    const POST = makeInvalidBodyRoute(routePath);

    for (const invalid of invalidRequests) {
      const response = await POST(invalid.request);
      assert.equal(
        response.status,
        400,
        routePath + " debe devolver 400 para " + invalid.label,
      );
    }
  }
});

test("equipamiento: bloquea cambios durante viaje o combate, incluso si el estado cambia en la transacción", async () => {
  const traveling = makeObjectEquipConflictRoute({ initialState: "de_viaje" });
  const before = await traveling(request({ objetoInventarioId: "item1" }));
  assert.equal(before.status, 409);

  const race = makeObjectEquipConflictRoute({ transactionState: "combatiendo" });
  const inside = await race(request({ objetoInventarioId: "item1" }));
  assert.equal(inside.status, 409);
});

test("equipamiento: un conflicto de Prisma al equipar un objeto devuelve 409", async () => {
  const POST = makeObjectEquipConflictRoute();
  const response = await POST(request({ objetoInventarioId: "item1" }));

  assert.equal(response.status, 409);
});

test("desequipamiento: bloquea cambios durante viaje o combate, también con un cambio de estado concurrente", async () => {
  const traveling = makeObjectUnequipRoute({ initialState: "de_viaje" });
  const before = await traveling.POST(request({ slot: "arma" }));
  assert.equal(before.status, 409);
  assert.equal(traveling.getState().personaje.equipoEquipado.armaInventarioId, "item1");

  const race = makeObjectUnequipRoute({ transactionState: "combatiendo" });
  const inside = await race.POST(request({ slot: "arma" }));
  assert.equal(inside.status, 409);
  assert.equal(race.getState().personaje.equipoEquipado.armaInventarioId, "item1");
});

test("habilidades: los conflictos de slot devuelven 409 y usan aislamiento Serializable", async () => {
  for (const errorCode of ["P2002", "P2034"]) {
    const route = makeAbilityEquipConflictRoute(errorCode);
    const response = await route.POST(request({
      habilidadId: "golpe_prueba",
      slot: "activa_1",
    }));

    assert.equal(response.status, 409);
    assert.equal(
      route.getTransactionOptions().isolationLevel,
      PrismaStub.TransactionIsolationLevel.Serializable,
    );
  }
});

test("mercado: rechaza peticiones no autenticadas e importes inválidos", async () => {
  const unauthenticated = makeMarketRoute({ authenticated: false });
  assert.equal((await unauthenticated.POST(request({ recurso: "madera", cantidad: 1 }))).status, 401);

  const route = makeMarketRoute();
  for (const cantidad of [0, -1, 1.5, Number.NaN, 1_000_001, "3", null]) {
    const response = await route.POST(request({ recurso: "madera", cantidad }));
    assert.equal(response.status, 400, "Debe rechazar cantidad " + String(cantidad));
  }
  assert.equal((await route.POST(request({ recurso: "oro", cantidad: 1 }))).status, 400);
});

test("mercado: calcula el precio en servidor e ignora costes enviados por el cliente", async () => {
  const route = makeMarketRoute({ initialUser: { oro: 1000 } });
  const response = await route.POST(request({
    recurso: "madera",
    cantidad: 2,
    precioUnitario: 0,
    costeTotal: 0,
    oro: 999999,
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.precioUnitario, 100);
  assert.equal(response.body.costeTotal, 200);
  assert.equal(route.getState().user.oro, 800);
  assert.equal(route.getState().user.madera, 2);
});

test("mercado: dos compras simultáneas no gastan dos veces el mismo oro", async () => {
  const route = makeMarketRoute({ initialUser: { oro: 100 } });
  const results = await Promise.all([
    route.POST(request({ recurso: "madera", cantidad: 1 })),
    route.POST(request({ recurso: "madera", cantidad: 1 })),
  ]);

  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(route.getState().user.oro, 0);
  assert.equal(route.getState().user.madera, 1);
});

test("herrería: permite comprar varias instancias de la misma definición", async () => {
  const route = makeObjectRoute({ initialUser: { oro: 500 } });
  const results = await Promise.all([
    route.POST(request({ objetoId: "espada_prueba" })),
    route.POST(request({ objetoId: "espada_prueba" })),
  ]);

  assert.equal(results.filter((result) => result.status === 200).length, 2);
  assert.equal(route.getState().user.oro, 300);
  assert.equal(route.getState().items.length, 2);
  assert.notEqual(route.getState().items[0].id, route.getState().items[1].id);
});

test("herrería: el inventario completo impide comprar y no cobra oro", async () => {
  const initialItems = Array.from({ length: 30 }, (_, index) => ({
    id: "existing-" + index,
    inventarioId: "inv1",
    objetoId: "objeto-" + index,
    cantidad: 1,
    nivelMejora: 0,
    sufijoId: null,
    bonificaciones: {},
  }));
  const route = makeObjectRoute({
    initialUser: { oro: 500 },
    initialItems,
  });
  const response = await route.POST(request({ objetoId: "espada_prueba" }));

  assert.equal(response.status, 409);
  assert.match(response.body.error, /inventario está lleno/i);
  assert.equal(route.getState().user.oro, 500);
  assert.equal(route.getState().items.length, 30);
});

test("acciones de jugador: rechaza cuerpos malformados, coordenadas no finitas y atributos manipulados", async () => {
  const route = makeActionsRoute();
  const malformed = await route.POST({
    json: async () => { throw new SyntaxError("JSON inválido"); },
  });
  assert.equal(malformed.status, 400);

  for (const coords of [
    { lat: Number.NaN, lng: -15 },
    { lat: 28, lng: Number.POSITIVE_INFINITY },
    { lat: 91, lng: -15 },
  ]) {
    const response = await route.POST(request({ accion: "establecerBase", coords }));
    assert.equal(response.status, 400);
  }
  assert.equal(route.getState().user.baseCoords, null);

  const invalidAttribute = await route.POST(request({
    accion: "mejorarAtributo",
    atributo: "toString",
  }));
  assert.equal(invalidAttribute.status, 400);
});

test("herrería: bloquea mejoras durante una expedición y revalida estado dentro de la transacción", async () => {
  const traveling = makeObjectUpgradeRoute({ initialState: "de_viaje" });
  const rejectedBefore = await traveling.POST(request({ objetoInventarioId: "item1" }));
  assert.equal(rejectedBefore.status, 409);
  assert.equal(traveling.getState().user.oro, 500);
  assert.equal(traveling.getState().items[0].nivelMejora, 0);

  // Simula que la expedición comienza después de la lectura inicial del personaje.
  const race = makeObjectUpgradeRoute({ transactionState: "combatiendo" });
  const rejectedInside = await race.POST(request({ objetoInventarioId: "item1" }));
  assert.equal(rejectedInside.status, 409);
  assert.equal(race.getState().user.oro, 500);
  assert.equal(race.getState().items[0].nivelMejora, 0);
});

test("mejoras de edificio: metal insuficiente no actualiza nivel ni gasta recursos", async () => {
  const route = makeActionsRoute({
    initialUser: {
      oro: 500,
      madera: 100,
      piedra: 100,
      metal: 0,
      edificios: { taberna: 1, mercado: 0 },
    },
  });
  const response = await route.POST(request({
    accion: "mejorarEdificio",
    idEdificio: "mercado",
  }));

  assert.equal(response.status, 409);
  assert.equal(route.getState().user.edificios.mercado, 0);
  assert.equal(route.getState().user.oro, 500);
  assert.equal(route.getState().user.madera, 100);
  assert.equal(route.getState().user.piedra, 100);
  assert.equal(route.getState().user.metal, 0);
});

test("mejoras de atributo: peticiones simultáneas no duplican el mismo incremento", async () => {
  const route = makeActionsRoute({
    initialUser: {
      oro: 50,
      edificios: { taberna: 1, mercado: 1 },
      personaje: {
        id: "p1",
        usuarioId: "u1",
        nombre: "Héroe",
        clase: "Guerrero",
        sexo: "chico",
        nivel: 1,
        hpActual: 20,
        estado: "ocioso",
        velocidadMejoras: 0,
        habilidades: [],
        inventario: { id: "inv1", objetos: [] },
        equipoEquipado: null,
      },
    },
  });
  const results = await Promise.all([
    route.POST(request({ accion: "mejorarAtributo", atributo: "velocidad" })),
    route.POST(request({ accion: "mejorarAtributo", atributo: "velocidad" })),
  ]);

  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.ok(results.every((result) => result.status === 200 || result.status === 400 || result.status === 409));
  assert.equal(route.getState().user.personaje.velocidadMejoras, 1);
  assert.equal(route.getState().user.oro, 40);
});

test("expediciones: rutas requieren sesión y las misiones manipuladas se rechazan", async () => {
  const unauthenticated = makeExpeditionRoutes({ authenticated: false });
  const availableResponse = await unauthenticated.getAvailable();
  assert.equal(availableResponse.status, 401);
  assert.equal(availableResponse.headers["Cache-Control"], "no-store");
  assert.equal((await unauthenticated.startExpedition(request({ misionId: "mision-falsa" }))).status, 401);

  const route = makeExpeditionRoutes();
  const response = await route.startExpedition(request({
    misionId: "mision-falsa",
    recompensa: { oro: 999999999 },
    duracionHoras: 0,
    coordenadasDestino: { lat: 0, lng: 0 },
  }));
  assert.equal(response.status, 409);
  assert.equal(route.wasExpeditionCreated(), false);
});


test("asedios concurrentes: el botín se calcula con los recursos restantes y nunca los hace negativos", async () => {
  const { finalizarAsedio } = loadSource("src/lib/expediciones/asedio.ts");
  const state = {
    users: {
      defensor: { id: "defensor", madera: 100, piedra: 0, metal: 0 },
    },
    combats: {
      combate1: { id: "combate1", version: 0, fase: "activo" },
      combate2: { id: "combate2", version: 0, fase: "activo" },
    },
    expeditions: {
      expedicion1: { id: "expedicion1" },
      expedicion2: { id: "expedicion2" },
    },
    characters: {
      atacante1: { usuarioId: "atacante1", hpActual: 10 },
      atacante2: { usuarioId: "atacante2", hpActual: 10 },
      defensor: { usuarioId: "defensor", estado: "asediado" },
    },
  };

  let lockTail = Promise.resolve();
  function makeTx() {
    let releaseLock;
    let holdsLock = false;
    return {
      $queryRaw: async (_strings, userId) => {
        assert.equal(userId, "defensor");
        const previous = lockTail;
        let releaseNext;
        const next = new Promise((resolve) => { releaseNext = resolve; });
        lockTail = previous.then(() => next);
        await previous;
        releaseLock = releaseNext;
        holdsLock = true;
        return [{ id: userId }];
      },
      release: () => {
        if (holdsLock) {
          holdsLock = false;
          releaseLock();
        }
      },
      usuario: {
        findUnique: async ({ where }) => clone(state.users[where.id] ?? null),
        updateMany: async ({ where, data }) => {
          const user = state.users[where.id];
          if (!matches(user, where)) return { count: 0 };
          applyData(user, data);
          return { count: 1 };
        },
      },
      combateActivo: {
        updateMany: async ({ where, data }) => {
          const combate = state.combats[where.id];
          if (!matches(combate, where)) return { count: 0 };
          applyData(combate, data);
          return { count: 1 };
        },
        findUniqueOrThrow: async ({ where }) => {
          if (!state.combats[where.id]) throw new Error("Combate no encontrado");
          return clone(state.combats[where.id]);
        },
      },
      expedicionActiva: {
        update: async ({ where, data }) => {
          const expedition = state.expeditions[where.id];
          if (!expedition) throw new Error("Expedición no encontrada");
          applyData(expedition, data);
          return clone(expedition);
        },
      },
      personaje: {
        update: async ({ where, data }) => {
          const character = Object.values(state.characters).find(
            (item) => (where.usuarioId && item.usuarioId === where.usuarioId) ||
              (where.id && item.id === where.id),
          );
          if (!character) throw new Error("Personaje no encontrado");
          applyData(character, data);
          return clone(character);
        },
      },
    };
  }
  const prisma = {
    $transaction: async (work) => {
      const tx = makeTx();
      try {
        return await work(tx);
      } finally {
        tx.release();
      }
    },
  };

  async function resolveSiege(index) {
    return prisma.$transaction((tx) => finalizarAsedio({
      tx,
      combate: {
        id: "combate" + index,
        version: 0,
        atacanteUsuarioId: "atacante" + index,
        defensorUsuarioId: "defensor",
        jugadorHpMaximo: 10,
        almacenNivel: 0,
        capacidadCarruaje: 80,
        estadoDefensorAnterior: "ocioso",
      },
      expedicionId: "expedicion" + index,
      jugadorHp: 8,
      enemigoHp: 0,
      jugadorDefensa: 1,
      enemigoDefensa: 0,
      cooldowns: {},
      efectos: [],
      cooldownsDefensor: {},
      efectosDefensor: [],
      accion: { texto: "Golpe final", dano: 1 },
      log: [],
      ganador: "atacante",
    }));
  }

  const results = await Promise.all([resolveSiege(1), resolveSiege(2)]);
  const woodLoot = results.reduce((total, result) => total + result.botin.madera, 0);

  assert.equal(state.users.defensor.madera, 5);
  assert.equal(woodLoot, 95);
  assert.ok(state.users.defensor.madera >= 0);
  assert.equal(state.expeditions.expedicion1.recompensa.madera +
    state.expeditions.expedicion2.recompensa.madera, 95);
});


test("reclutamiento concurrente: una segunda petición no sobrescribe al personaje creado", async () => {
  const route = makeActionsRoute({ initialUser: { personaje: null } });
  const requests = [
    request({ accion: "reclutar", nombre: "Aventurero Uno", clase: "Guerrero", sexo: "chico" }),
    request({ accion: "reclutar", nombre: "Aventurera Dos", clase: "Explorador", sexo: "chica" }),
  ];
  const results = await Promise.all(requests.map((item) => route.POST(item)));

  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 1);
  const successful = results.find((result) => result.status === 200);
  assert.equal(route.getState().user.personaje.nombre, successful.body.personaje.nombre);
  assert.ok(["Aventurero Uno", "Aventurera Dos"].includes(route.getState().user.personaje.nombre));
});


test("herrería: dos mejoras simultáneas de la misma pieza solo cobran y mejoran una vez", async () => {
  const route = makeObjectUpgradeRoute({ initialGold: 500 });
  const results = await Promise.all([
    route.POST(request({ objetoInventarioId: "item1" })),
    route.POST(request({ objetoInventarioId: "item1" })),
  ]);

  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 1);
  assert.equal(route.getState().user.oro, 400);
  assert.equal(route.getState().items[0].nivelMejora, 1);
});
