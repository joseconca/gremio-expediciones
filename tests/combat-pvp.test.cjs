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

const { finalizarAsedio } = require("../src/lib/expediciones/asedio.ts");

test("la recompensa PvP se liquida una sola vez aunque se repita la finalización", async () => {
  let state = {
    combate: {
      id: "combate-recompensa",
      version: 4,
      fase: "activo",
      turno: "atacante",
      ganadorUsuarioId: null,
      botinResuelto: false,
    },
    usuarios: {
      atacante: { id: "atacante", madera: 0, piedra: 0, metal: 0 },
      defensor: { id: "defensor", madera: 40, piedra: 30, metal: 20 },
    },
    personajes: {
      atacante: { usuarioId: "atacante", hpActual: 100, estado: "de_viaje" },
      defensor: { usuarioId: "defensor", hpActual: 0, estado: "combatiendo" },
    },
    expedicion: { id: "expedicion-atacante", fase: "combatiendo", recompensa: {} },
  };
  const clonar = (valor) => structuredClone(valor);
  const aplicar = (registro, datos) => {
    for (const [clave, valor] of Object.entries(datos ?? {})) {
      if (valor && typeof valor === "object" && !Array.isArray(valor)) {
        if (Object.hasOwn(valor, "decrement")) registro[clave] -= valor.decrement;
        else if (Object.hasOwn(valor, "increment")) registro[clave] += valor.increment;
        else registro[clave] = clonar(valor);
      } else {
        registro[clave] = valor;
      }
    }
  };
  const tx = {
    $queryRaw: async () => [],
    usuario: {
      findUnique: async ({ where }) => state.usuarios[where.id]
        ? clonar(state.usuarios[where.id])
        : null,
      updateMany: async ({ where, data }) => {
        const usuario = state.usuarios[where.id];
        if (!usuario) return { count: 0 };
        for (const [clave, condicion] of Object.entries(where)) {
          if (clave === "id") continue;
          if (condicion && typeof condicion === "object" && Object.hasOwn(condicion, "gte") &&
              usuario[clave] < condicion.gte) return { count: 0 };
        }
        aplicar(usuario, data);
        return { count: 1 };
      },
    },
    combateActivo: {
      updateMany: async ({ where, data }) => {
        if (state.combate.id !== where.id ||
            state.combate.version !== where.version ||
            state.combate.fase !== where.fase) return { count: 0 };
        aplicar(state.combate, data);
        return { count: 1 };
      },
      findUniqueOrThrow: async () => clonar(state.combate),
    },
    expedicionActiva: {
      update: async ({ where, data }) => {
        if (state.expedicion.id !== where.id) throw new Error("Expedición no encontrada");
        aplicar(state.expedicion, data);
        return clonar(state.expedicion);
      },
    },
    personaje: {
      update: async ({ where, data }) => {
        const id = where.usuarioId ??
          Object.keys(state.personajes).find((key) => state.personajes[key].id === where.id);
        if (!state.personajes[id]) throw new Error("Personaje no encontrado");
        aplicar(state.personajes[id], data);
        return clonar(state.personajes[id]);
      },
    },
  };
  const argumentos = () => ({
    tx,
    combate: {
      id: "combate-recompensa",
      version: 4,
      atacanteUsuarioId: "atacante",
      defensorUsuarioId: "defensor",
      jugadorHpMaximo: 100,
      almacenNivel: 0,
      capacidadCarruaje: 80,
      estadoDefensorAnterior: "ocioso",
    },
    expedicionId: "expedicion-atacante",
    jugadorHp: 55,
    enemigoHp: 0,
    jugadorDefensa: 4,
    enemigoDefensa: 3,
    cooldowns: {},
    efectos: [],
    cooldownsDefensor: {},
    efectosDefensor: [],
    accion: { actor: "jugador", tipo: "ataque", animacion: "ofensiva", dano: 10, critico: false, texto: "Golpe final." },
    log: [],
    ganador: "atacante",
  });
  const finalizarEnTransaccion = async () => {
    const antes = clonar(state);
    try {
      return await finalizarAsedio(argumentos());
    } catch (error) {
      state = antes;
      throw error;
    }
  };

  const primera = await finalizarEnTransaccion();
  assert.equal(state.combate.fase, "victoria");
  assert.equal(state.combate.version, 5);
  assert.equal(state.combate.botinResuelto, true);
  assert.deepEqual(state.expedicion.recompensa, {
    oro: 0,
    madera: primera.botin.madera,
    piedra: primera.botin.piedra,
    metal: primera.botin.metal,
  });
  assert.equal(state.usuarios.defensor.madera, 40 - primera.botin.madera);
  assert.equal(state.usuarios.defensor.piedra, 30 - primera.botin.piedra);
  assert.equal(state.usuarios.defensor.metal, 20 - primera.botin.metal);

  const trasPrimeraLiquidacion = clonar(state);
  await assert.rejects(finalizarEnTransaccion, /COMBATE_MODIFICADO/);
  assert.deepEqual(state, trasPrimeraLiquidacion);
});

test("asedios entrantes devuelve expediciones en viaje y no combates activos", async () => {
  const expedicion = {
    id: "exp-asedio-entrante",
    usuarioId: "atacante-1",
    tipo: "asedio",
    fase: "en_viaje",
    fechaSalida: new Date("2026-10-13T10:00:00.000Z"),
    fechaLlegada: new Date("2026-10-13T11:00:00.000Z"),
    usuario: {
      id: "atacante-1",
      nombre: "Gremio atacante",
      baseCoords: { lat: 28, lng: -15 },
      personaje: { nombre: "Asaltante", clase: "Guerrero", sexo: "chico" },
    },
  };
  let filtro;
  const route = loadSource("src/app/api/asedios/entrantes/route.ts", {
    "next/server": {
      NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200, headers: init.headers ?? {} }) },
    },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "defensor-1" }) },
    "@/lib/prisma": {
      prisma: {
        expedicionActiva: {
          findMany: async (args) => { filtro = args; return [structuredClone(expedicion)]; },
        },
      },
    },
  });
  const respuesta = await route.GET();
  assert.equal(respuesta.status, 200);
  assert.deepEqual(filtro.where, { tipo: "asedio", objetivoId: "defensor-1", fase: "en_viaje" });
  assert.equal(respuesta.body.asediosEntrantes.length, 1);
  assert.equal(respuesta.body.asediosEntrantes[0].id, "exp-asedio-entrante");
  assert.equal(respuesta.body.asediosEntrantes[0].atacanteNombre, "Gremio atacante");
  assert.equal(Object.hasOwn(respuesta.body, "combates"), false);
  assert.equal(respuesta.headers["Cache-Control"], "no-store");
});
