require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { OBJETOS, obtenerObjetoPorId, obtenerRanuraObjeto, calcularEstadisticasObjeto } = require("../src/lib/objetos.ts");
const { generarSufijoObjeto, obtenerNombreObjetoConSufijo } = require("../src/lib/sufijosObjetos.ts");
const { tirarBotinEnemigo } = require("../src/lib/lootObjetos.ts");
const { ENEMIGOS, JEFES_ELITE } = require("../src/lib/enemigos.ts");
const { LIMITE_INVENTARIO_OBJETOS } = require("../src/lib/inventario.ts");

test("los objetos básicos y comunes no generan sufijo", () => {
  assert.deepEqual(generarSufijoObjeto({ rareza: "basico" }, false, () => 0), {
    sufijoId: null,
    bonificaciones: {},
  });
  assert.deepEqual(generarSufijoObjeto({ rareza: "comun" }, true, () => 0), {
    sufijoId: null,
    bonificaciones: {},
  });
});

test("los objetos poco comunes, raros y épicos generan sufijos del tier correcto", () => {
  const pocoComun = generarSufijoObjeto({ rareza: "poco_comun" }, false, () => 0);
  assert.equal(pocoComun.sufijoId, "veloz");
  assert.deepEqual(pocoComun.bonificaciones, { velocidad: 1 });

  const raro = generarSufijoObjeto({ rareza: "raro" }, false, () => 0);
  assert.equal(raro.sufijoId, "del_guardian");
  assert.deepEqual(raro.bonificaciones, { defensa: 2, defensaMagica: 1 });

  const epico = generarSufijoObjeto({ rareza: "epico" }, false, () => 0);
  assert.equal(epico.sufijoId, "del_titan");
  assert.deepEqual(epico.bonificaciones, { hpMaximo: 18, defensa: 2 });
});

test("solo los jefes pueden generar sufijos legendarios", () => {
  const normal = generarSufijoObjeto({ rareza: "legendario" }, false, () => 0);
  assert.equal(normal.sufijoId, "del_titan");

  const jefe = generarSufijoObjeto({ rareza: "raro" }, true, () => 0);
  assert.equal(jefe.sufijoId, "del_dragon");
  assert.deepEqual(jefe.bonificaciones, { ataque: 4, probCritico: 0.04 });
  assert.equal(obtenerNombreObjetoConSufijo("Espada de madera", jefe.sufijoId), "Espada de madera del dragón");
});

test("el botín utiliza la tabla de pesos y conserva sufijo y estadísticas propios", () => {
  const botin = tirarBotinEnemigo({
    id: "boss-test",
    nombre: "Jefe de prueba",
    hp: 100,
    ataque: 10,
    defensa: 5,
    velocidad: 5,
    botin: 20,
    difMin: 1,
    esJefe: true,
    probabilidadBotin: 1,
    tablaLoot: [{ objetoId: "espada_runa", peso: 1 }],
  }, () => 0);

  assert.ok(botin);
  assert.equal(botin.objeto.id, "espada_runa");
  assert.equal(botin.sufijoId, "del_dragon");
  assert.equal(botin.bonificaciones.ataque, 4);
  assert.equal(calcularEstadisticasObjeto(botin.objeto, 0, botin.bonificaciones).ataque, 14);
});

test("las bonificaciones de recurso y precisión llegan al cálculo de estadísticas", () => {
  const arma = obtenerObjetoPorId("espada_runa");
  assert.ok(arma);
  const stats = calcularEstadisticasObjeto(arma, 0, {
    manaMaximo: 8,
    precision: 2,
    regeneracionManaPorTurno: 1,
  });
  assert.equal(stats.manaMaximo, 8);
  assert.equal(stats.precision, 2);
  assert.equal(stats.regeneracionManaPorTurno, 1);
});

test("todas las tablas loot apuntan a objetos existentes y los jefes tienen mejor probabilidad", () => {
  const enemigos = [...ENEMIGOS, ...JEFES_ELITE];
  for (const enemigo of enemigos) {
    assert.ok(enemigo.probabilidadBotin !== undefined);
    assert.ok(enemigo.tablaLoot && enemigo.tablaLoot.length > 0);
    for (const entrada of enemigo.tablaLoot) {
      assert.ok(obtenerObjetoPorId(entrada.objetoId), `Objeto inexistente en ${enemigo.id}: ${entrada.objetoId}`);
      assert.ok(entrada.peso > 0);
    }
  }
  for (const jefe of JEFES_ELITE) {
    assert.equal(jefe.esJefe, true);
    assert.ok(jefe.probabilidadBotin >= 0.7);
  }
  assert.ok(ENEMIGOS.every((enemigo) => enemigo.esJefe === false));
});

test("el catálogo cubre las diez ranuras y el inventario limita a 30 instancias", () => {
  const ranuras = new Set(OBJETOS.map(obtenerRanuraObjeto).filter(Boolean));
  for (const ranura of [
    "arma",
    "mano_secundaria",
    "casco",
    "armadura",
    "pantalones",
    "botas",
    "guantes",
    "collar",
    "anillo",
  ]) {
    assert.ok(ranuras.has(ranura), `Falta cubrir la ranura ${ranura}`);
  }
  assert.equal(LIMITE_INVENTARIO_OBJETOS, 30);
});

const nodeFs = require("node:fs");
const nodePath = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ApiPrisma = {
  DbNull: "__PRISMA_DB_NULL__",
  TransactionIsolationLevel: { Serializable: "Serializable" },
  PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
    constructor(message, { code }) {
      super(message);
      this.code = code;
    }
  },
};
const ApiNextResponse = {
  json(body, init = {}) {
    return { body, status: init.status ?? 200 };
  },
};

function loadApiRoute(relativePath, dependencies) {
  const filename = nodePath.resolve(__dirname, "..", relativePath);
  const source = nodeFs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const loaded = { exports: {} };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", {
    filename,
  })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

test("la migración de objetos compensa una vez y elimina la restricción de una instancia por tipo", () => {
  const migrationPath = nodePath.resolve(
    __dirname,
    "../prisma/migrations/20261012190000_objetos_instance_system/migration.sql"
  );
  const migration = nodeFs.readFileSync(migrationPath, "utf8");
  const schema = nodeFs.readFileSync(nodePath.resolve(__dirname, "../prisma/schema.prisma"), "utf8");

  assert.match(migration, /DROP INDEX IF EXISTS "InventarioObjeto_inventarioId_objetoId_key"/);
  assert.match(migration, /SET "oro" = u\."oro" \+ compensaciones\.oro/);
  assert.match(migration, /FLOOR\(precios\."precio" \* 0\.30\)/);
  assert.match(schema, /ultimaVenta Json\?/);
  assert.match(schema, /bonificaciones Json @default\("\{\}"\)/);
  assert.doesNotMatch(schema, /@@unique\(\[inventarioId, objetoId\]\)/);
});

function makeTradeApi({ oro = 200000, items, equipo = {}, ultimaVenta = null } = {}) {
  const state = {
    user: { id: "u1", oro },
    personaje: { id: "p1" },
    inventario: { id: "inv1", ultimaVenta },
    items: structuredClone(items ?? [{
      id: "item-1",
      inventarioId: "inv1",
      objetoId: "espada_runa",
      cantidad: 1,
      nivelMejora: 2,
      sufijoId: "del_dragon",
      bonificaciones: { ataque: 4, probCritico: 0.04 },
    }]),
    equipo: {
      armaInventarioId: null,
      manoSecundariaInventarioId: null,
      cascoInventarioId: null,
      armaduraInventarioId: null,
      pantalonesInventarioId: null,
      botasInventarioId: null,
      guantesInventarioId: null,
      accesorioInventarioId: null,
      anillo1InventarioId: null,
      anillo2InventarioId: null,
      ...equipo,
    },
    nextId: 1,
  };
  const clone = (value) => value == null ? value : structuredClone(value);
  const applyMoney = (data) => {
    if (data.oro && typeof data.oro === "object") {
      if ("increment" in data.oro) state.user.oro += data.oro.increment;
      if ("decrement" in data.oro) state.user.oro -= data.oro.decrement;
    }
  };
  const findItem = (where) => state.items.find((item) =>
    (!where.id || item.id === where.id) &&
    (!where.inventarioId || item.inventarioId === where.inventarioId)
  ) ?? null;
  const tx = {
    equipoEquipado: {
      findUnique: async () => clone(state.equipo),
    },
    inventarioObjeto: {
      findFirst: async ({ where }) => clone(findItem(where)),
      count: async ({ where }) => state.items.filter((item) => item.inventarioId === where.inventarioId).length,
      deleteMany: async ({ where }) => {
        const index = state.items.findIndex((item) =>
          item.id === where.id && item.inventarioId === where.inventarioId
        );
        if (index < 0) return { count: 0 };
        state.items.splice(index, 1);
        return { count: 1 };
      },
      create: async ({ data }) => {
        const item = { id: "created-" + state.nextId++, ...clone(data) };
        state.items.push(item);
        return clone(item);
      },
    },
    usuario: {
      update: async ({ where, data }) => {
        if (state.user.id !== where.id) throw new Error("Usuario no encontrado");
        applyMoney(data);
        return clone(state.user);
      },
      updateMany: async ({ where, data }) => {
        if (state.user.id !== where.id || (where.oro?.gte !== undefined && state.user.oro < where.oro.gte)) {
          return { count: 0 };
        }
        applyMoney(data);
        return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }) => {
        if (state.user.id !== where.id) throw new Error("Usuario no encontrado");
        return clone(state.user);
      },
    },
    inventario: {
      findUnique: async ({ where }) =>
        state.inventario.id === where.id
          ? { ultimaVenta: clone(state.inventario.ultimaVenta) }
          : null,
      update: async ({ where, data }) => {
        if (state.inventario.id !== where.id) throw new Error("Inventario no encontrado");
        state.inventario.ultimaVenta = data.ultimaVenta === ApiPrisma.DbNull ? null : clone(data.ultimaVenta);
        return clone(state.inventario);
      },
    },
  };
  let transactionTail = Promise.resolve();
  const prisma = {
    personaje: {
      findUnique: async ({ where, include }) => {
        if (where.usuarioId !== "u1") return null;
        return {
          id: state.personaje.id,
          inventario: {
            ...clone(state.inventario),
            ...(include?.inventario?.include?.objetos ? { objetos: clone(state.items) } : {}),
          },
        };
      },
    },
    inventarioObjeto: {
      findFirst: async ({ where }) => clone(findItem(where)),
    },
    $transaction: async (callback) => {
      let release;
      const previous = transactionTail;
      transactionTail = new Promise((resolve) => { release = resolve; });
      await previous;
      const snapshot = clone(state);
      try {
        return await callback(tx);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      } finally {
        release();
      }
    },
  };
  const suffixModule = require("../src/lib/sufijosObjetos.ts");
  const dependencies = {
    "next/server": { NextResponse: ApiNextResponse },
    "@prisma/client": { Prisma: ApiPrisma },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "u1" }) },
    "@/lib/prisma": { prisma },
    "@/lib/objetos": { obtenerObjetoPorId },
    "@/lib/sufijosObjetos": suffixModule,
    "@/lib/economia": require("../src/lib/economia.ts"),
    "@/lib/inventario": { LIMITE_INVENTARIO_OBJETOS },
  };
  return { state, sell: loadApiRoute("src/app/api/objetos/vender/route.ts", dependencies).POST,
    buyback: loadApiRoute("src/app/api/objetos/recomprar/route.ts", dependencies).POST };
}

test("vender y recomprar restaura la misma instancia, sufijo, mejoras y bonificaciones", async () => {
  const api = makeTradeApi();
  const sale = await api.sell({ json: async () => ({ objetoInventarioId: "item-1" }) });
  assert.equal(sale.status, 200);
  assert.equal(sale.body.oroRecibido, 2275);
  assert.equal(api.state.items.length, 0);
  assert.equal(api.state.inventario.ultimaVenta.sufijoId, "del_dragon");
  assert.equal(api.state.inventario.ultimaVenta.precioRecompra, 4550);
  assert.equal(api.state.user.oro, 202275);

  const repurchase = await api.buyback();
  assert.equal(repurchase.status, 200);
  assert.equal(api.state.user.oro, 197725);
  assert.equal(api.state.items.length, 1);
  assert.equal(api.state.items[0].id, "item-1");
  assert.equal(api.state.items[0].objetoId, "espada_runa");
  assert.equal(api.state.items[0].nivelMejora, 2);
  assert.equal(api.state.items[0].sufijoId, "del_dragon");
  assert.deepEqual(api.state.items[0].bonificaciones, { ataque: 4, probCritico: 0.04 });
  assert.equal(api.state.inventario.ultimaVenta, null);

  const noSecondRepurchase = await api.buyback();
  assert.equal(noSecondRepurchase.status, 404);
});

test("dos peticiones concurrentes solo pueden recomprar una vez el último recibo", async () => {
  const api = makeTradeApi();
  const sale = await api.sell({ json: async () => ({ objetoInventarioId: "item-1" }) });
  assert.equal(sale.status, 200);
  const results = await Promise.all([api.buyback(), api.buyback()]);

  assert.equal(results.filter((result) => result.status === 200).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 1);
  assert.equal(api.state.items.length, 1);
  assert.equal(api.state.user.oro, 197725);
  assert.equal(api.state.inventario.ultimaVenta, null);
});

test("no se puede vender equipo puesto", async () => {
  const api = makeTradeApi({ equipo: { armaInventarioId: "item-1" } });
  const response = await api.sell({ json: async () => ({ objetoInventarioId: "item-1" }) });
  assert.equal(response.status, 409);
  assert.equal(api.state.user.oro, 200000);
  assert.equal(api.state.items.length, 1);
  assert.equal(api.state.inventario.ultimaVenta, null);
});

test("la recompra exige oro y un espacio libre sin borrar el recibo si falla", async () => {
  const api = makeTradeApi();
  const sale = await api.sell({ json: async () => ({ objetoInventarioId: "item-1" }) });
  assert.equal(sale.status, 200);

  api.state.user.oro = 0;
  const noGold = await api.buyback();
  assert.equal(noGold.status, 400);
  assert.equal(api.state.items.length, 0);
  assert.ok(api.state.inventario.ultimaVenta);

  api.state.user.oro = 200000;
  for (let i = 0; i < LIMITE_INVENTARIO_OBJETOS; i += 1) {
    api.state.items.push({ id: "full-" + i, inventarioId: "inv1", objetoId: "objeto-" + i, cantidad: 1, nivelMejora: 0, sufijoId: null, bonificaciones: {} });
  }
  const full = await api.buyback();
  assert.equal(full.status, 409);
  assert.equal(api.state.user.oro, 200000);
  assert.equal(api.state.items.length, LIMITE_INVENTARIO_OBJETOS);
  assert.ok(api.state.inventario.ultimaVenta);
});
