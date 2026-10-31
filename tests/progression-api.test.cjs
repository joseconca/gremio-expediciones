require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadSource(relativePath, dependencies) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");
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

test("la API de asignación manual de atributos se retira explícitamente", async () => {
  const route = loadSource("src/app/api/jugador/atributos/asignar/route.ts", {
    "next/server": {
      NextResponse: {
        json(body, init = {}) {
          return { body, status: init.status ?? 200, headers: init.headers ?? {} };
        },
      },
    },
  });
  const response = await route.POST();
  assert.equal(response.status, 410);
  assert.match(response.body.error, /calculan automáticamente/i);
});

test("profesiones oculta las clases secretas y las revela al cumplir el hito comercial", async () => {
  let intercambios = 4;
  const clases = require("../src/lib/progresion/clases.ts");
  const personaje = { id: "p1", nivel: 5, experiencia: 0, profesionActivaId: "mago", progresosClase: [
    { claseId: "novato", nivelJob: 10, desbloqueada: true },
    { claseId: "mago", nivelJob: 20, desbloqueada: true },
  ] };
  const route = loadSource("src/app/api/profesiones/route.ts", {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "u1" }) },
    "@/lib/progresion/clases": clases,
    "@/lib/prisma": { prisma: {
      personaje: { findUnique: async () => personaje },
      afinidadComercial: { aggregate: async ({ where }) => {
        assert.deepEqual(where, { jugador1Id: "u1" });
        return { _sum: { intercambios } };
      } },
    } },
  });
  const ocultas = (await route.GET()).body.clases;
  assert.ok(!ocultas.some((c) => ["comerciante", "alquimista", "herrero"].includes(c.id)));
  assert.ok(ocultas.some((c) => c.id === "brujo" && c.tier === 2));
  assert.ok(!ocultas.some((c) => c.id === "hoja_velo"), "Tier 3.5 permanece oculto al ser especial");
  intercambios = 5;
  const visibles = (await route.GET()).body.clases;
  assert.equal(visibles.find((c) => c.id === "comerciante").puedeDesbloquear, true);
  assert.equal(visibles.find((c) => c.id === "alquimista"), undefined, "Alquimista permanece oculto hasta desbloquear comerciante");
});

test("un novato solo ve interrogantes '?' en las 4 de tier 1 y mantiene ocultas las clases especiales", async () => {
  const clases = require("../src/lib/progresion/clases.ts");
  const personaje = {
    id: "p1",
    nivel: 1,
    experiencia: 0,
    profesionActivaId: "novato",
    progresosClase: [
      { claseId: "novato", nivelJob: 1, desbloqueada: true },
    ],
  };
  const route = loadSource("src/app/api/profesiones/route.ts", {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "u1" }) },
    "@/lib/progresion/clases": clases,
    "@/lib/prisma": {
      prisma: {
        personaje: { findUnique: async () => personaje },
        afinidadComercial: { aggregate: async () => ({ _sum: { intercambios: 0 } }) },
      },
    },
  });

  const clasesDevueltas = (await route.GET()).body.clases;
  assert.equal(clasesDevueltas.length, 5);
  const novato = clasesDevueltas.find((c) => c.id === "novato");
  assert.equal(novato.yaDesbloqueada, true);
  assert.equal(novato.esMisterio, false);

  const tier1 = clasesDevueltas.filter((c) => ["espadachin", "acolito", "arquero", "mago"].includes(c.id));
  assert.equal(tier1.length, 4);
  for (const c of tier1) {
    assert.equal(c.esMisterio, true);
    assert.equal(c.nombre, "???");
    assert.equal(c.requisitosPendientes[0].claseId, "novato");
    assert.equal(c.requisitosPendientes[0].nivelJobRequerido, 10);
  }

  assert.ok(!clasesDevueltas.some((c) => c.id === "superNovato"), "Tier 1.5 debe permanecer oculto");
  assert.ok(!clasesDevueltas.some((c) => c.tier === 2), "Tier 2 debe permanecer oculto");
  assert.ok(!clasesDevueltas.some((c) => c.tier === 2.5), "Tier 2.5 debe permanecer oculto");
  assert.ok(!clasesDevueltas.some((c) => c.tier === 3.5), "Tier 3.5 debe permanecer oculto");
});

test("no se puede desbloquear Comerciante enviando su ID antes de cumplir el requisito secreto", async () => {
  let intercambios = 4;
  let creados = 0;
  const tx = {
    personaje: { findUnique: async () => ({ id: "p1", progresosClase: [
      { claseId: "novato", nivelJob: 10, desbloqueada: true },
      { claseId: "espadachin", nivelJob: 20, desbloqueada: true },
    ] }) },
    afinidadComercial: { aggregate: async () => ({ _sum: { intercambios } }) },
    progresoClase: { create: async ({ data }) => { creados++; return data; } },
  };
  const route = loadSource("src/app/api/profesiones/desbloquear/route.ts", {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    "@prisma/client": { Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } } },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "u1" }) },
    "@/lib/progresion/clases": require("../src/lib/progresion/clases.ts"),
    "@/lib/prisma": { prisma: { $transaction: async (callback, options) => {
      assert.equal(options.isolationLevel, "Serializable");
      return callback(tx);
    } } },
  });
  const request = () => new Request("https://example.test/api/profesiones/desbloquear", { method: "POST", body: JSON.stringify({ claseId: "comerciante" }) });
  assert.equal((await route.POST(request())).status, 409);
  assert.equal(creados, 0);
  intercambios = 5;
  assert.equal((await route.POST(request())).status, 200);
  assert.equal(creados, 1);
});
