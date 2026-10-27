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
  assert.ok(ocultas.some((c) => c.id === "hoja_velo" && c.tier === 3.5));
  intercambios = 5;
  const visibles = (await route.GET()).body.clases;
  assert.equal(visibles.find((c) => c.id === "comerciante").puedeDesbloquear, true);
  assert.equal(visibles.find((c) => c.id === "alquimista").puedeDesbloquear, false);
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
