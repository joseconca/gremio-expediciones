const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

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
    (name) => (Object.hasOwn(dependencies, name) ? dependencies[name] : require(name)),
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
  const setState = (next) => { state = next; };
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
      create: async ({ data }) => {
        if (findInventoryItem(data.inventarioId, data.objetoId)) {
          throw new PrismaClientKnownRequestError("Unique constraint", { code: "P2002" });
        }
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
    "@/lib/tiendaObjetos": {
      puedeComprarObjeto: () => true,
      obtenerRequisitosRareza: () => ({ nivelArmeria: 1, nivelHeroe: 1 }),
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
        fuerzaMejoras: 0,
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
        fuerza: { campo: "fuerzaMejoras", edificio: "escuelaCombate", limitePorNivel: 1 },
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
  };
  const available = loadSource("src/app/api/expediciones/disponibles/route.ts", common);
  const start = loadSource("src/app/api/expediciones/iniciar/route.ts", common);
  return {
    getAvailable: available.GET,
    startExpedition: start.POST,
    wasExpeditionCreated: () => createdExpedition,
  };
}

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
    route.POST(request({ recurso: "piedra", cantidad: 1 })),
    route.POST(request({ recurso: "piedra", cantidad: 1 })),
  ]);

  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(route.getState().user.oro, 0);
  assert.equal(route.getState().user.piedra, 1);
});

test("herrería: compras concurrentes del mismo objeto solo lo cobran una vez", async () => {
  const route = makeObjectRoute({ initialUser: { oro: 500 } });
  const results = await Promise.all([
    route.POST(request({ objetoId: "espada_prueba" })),
    route.POST(request({ objetoId: "espada_prueba" })),
  ]);

  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 1);
  assert.equal(route.getState().user.oro, 400);
  assert.equal(route.getState().items.length, 1);
});

test("acciones de jugador: rechaza coordenadas no finitas y atributos manipulados", async () => {
  const route = makeActionsRoute();
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
      edificios: { taberna: 1, escuelaCombate: 1 },
      personaje: {
        id: "p1",
        usuarioId: "u1",
        nombre: "Héroe",
        clase: "Guerrero",
        sexo: "chico",
        nivel: 1,
        hpActual: 20,
        estado: "ocioso",
        fuerzaMejoras: 0,
        habilidades: [],
        inventario: { id: "inv1", objetos: [] },
        equipoEquipado: null,
      },
    },
  });
  const results = await Promise.all([
    route.POST(request({ accion: "mejorarAtributo", atributo: "fuerza" })),
    route.POST(request({ accion: "mejorarAtributo", atributo: "fuerza" })),
  ]);

  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.ok(results.every((result) => result.status === 200 || result.status === 400 || result.status === 409));
  assert.equal(route.getState().user.personaje.fuerzaMejoras, 1);
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
