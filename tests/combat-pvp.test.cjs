require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadSource(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const loaded = { exports: {} };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const {
  distribuirEfectosHabilidadPvp,
  normalizarActorHabilidadDefensor,
} = require("../src/lib/expediciones/contrato-accion-combate.ts");
const { actualizarCombateVersionado } = require("../src/lib/expediciones/actualizar-combate-versionado.ts");
const { TIEMPO_MAXIMO_TURNO_MS, haExpiradoTurnoPvp } = require("../src/lib/expediciones/turno-pvp.ts");

test("la habilidad del defensor conserva actor y aplica efectos al participante real", () => {
  assert.deepEqual(
    normalizarActorHabilidadDefensor({ actor: "jugador", tipo: "habilidad", dano: 8 }),
    { actor: "enemigo", tipo: "habilidad", dano: 8 },
  );
  const efectos = [
    { habilidadId: "guardia", objetivo: "jugador" },
    { habilidadId: "rompeguardia", objetivo: "enemigo" },
  ];
  const atacanteActua = distribuirEfectosHabilidadPvp(efectos, "atacante");
  assert.deepEqual(atacanteActua.efectosAtacante.map((e) => e.habilidadId), ["guardia"]);
  assert.deepEqual(atacanteActua.efectosDefensor.map((e) => e.habilidadId), ["rompeguardia"]);
  const defensorActua = distribuirEfectosHabilidadPvp(efectos, "defensor");
  assert.deepEqual(defensorActua.efectosAtacante.map((e) => e.habilidadId), ["rompeguardia"]);
  assert.deepEqual(defensorActua.efectosDefensor.map((e) => e.habilidadId), ["guardia"]);
});

test("dos acciones sobre una misma versión de combate solo confirman una vez", async () => {
  const state = { id: "c1", version: 7, fase: "activo", jugadorHp: 100 };
  const tx = {
    combateActivo: {
      updateMany: async ({ where, data }) => {
        if (where.id !== state.id || where.version !== state.version || where.fase !== state.fase) return { count: 0 };
        for (const [key, value] of Object.entries(data)) {
          if (key === "version") state.version += value.increment;
          else state[key] = value;
        }
        return { count: 1 };
      },
      findUniqueOrThrow: async () => structuredClone(state),
    },
  };
  const resultados = await Promise.allSettled([
    actualizarCombateVersionado(tx, "c1", 7, { jugadorHp: 90 }),
    actualizarCombateVersionado(tx, "c1", 7, { jugadorHp: 80 }),
  ]);
  assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(resultados.filter((r) => r.status === "rejected").length, 1);
  assert.equal(state.version, 8);
  assert.ok([80, 90].includes(state.jugadorHp));
});

test("el tiempo de espera comparte un umbral exacto de 90 segundos", () => {
  const now = 200_000;
  assert.equal(TIEMPO_MAXIMO_TURNO_MS, 90_000);
  assert.equal(haExpiradoTurnoPvp(now - 89_999, now), false);
  assert.equal(haExpiradoTurnoPvp(now - 90_000, now), true);
  assert.equal(haExpiradoTurnoPvp(new Date(now - 91_000), now), true);
});

test("tras recargar, el endpoint recupera el mismo combate para atacante y defensor", async () => {
  const combate = {
    id: "combate-pvp-1",
    tipo: "pvp",
    fase: "activo",
    version: 12,
    turno: "defensor",
    atacanteUsuarioId: "atacante-1",
    defensorUsuarioId: "defensor-1",
    actualizado: new Date("2026-10-13T12:00:00.000Z"),
  };
  const consulta = (usuarioId) => {
    const prisma = {
      combateActivo: {
        findFirst: async ({ where }) => {
          assert.equal(where.tipo, "pvp");
          assert.equal(where.fase, "activo");
          assert.deepEqual(where.OR, [
            { atacanteUsuarioId: usuarioId },
            { defensorUsuarioId: usuarioId },
          ]);
          return structuredClone(combate);
        },
      },
    };
    const route = loadSource("src/app/api/combate/estado/route.ts", {
      "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
      "@/lib/auth": { getAuthenticatedUser: async () => ({ id: usuarioId }) },
      "@/lib/prisma": { prisma },
      "@/lib/expediciones/procesarTurnoAsedio": {
        procesarTurnoAutomaticoAsedio: async (id) => ({
          combate: id === combate.id ? structuredClone(combate) : null,
          procesado: false,
          terminado: false,
        }),
      },
    });
    return route.GET();
  };
  const [atacante, defensor] = await Promise.all([consulta("atacante-1"), consulta("defensor-1")]);
  assert.equal(atacante.body.combate.id, "combate-pvp-1");
  assert.equal(defensor.body.combate.id, "combate-pvp-1");
  assert.equal(atacante.body.combate.version, 12);
  assert.equal(defensor.body.combate.version, 12);
  assert.equal(atacante.body.rolUsuario, "atacante");
  assert.equal(defensor.body.rolUsuario, "defensor");
});
