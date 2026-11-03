require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Carga aislada del servicio real: sin base de datos, sesión ni red.
function cargarServicioComercial(prisma, resolverComercio) {
  const filename = path.resolve(__dirname, "../src/server/services/expediciones/completar-expedicion.ts");
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const dependencies = {
    "next/server": { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "emisor" }) },
    "@/lib/prisma": { prisma },
    "@/lib/utils": { calcularDistanciaKm: () => 3 },
    "@/lib/expediciones/comercio": { resolverComercio },
    "@/lib/progresion/estadisticas-personaje": {
      calcularEstadisticasPersonaje: () => ({ total: {
        hpMaximo: 100, ataque: 12, defensa: 5, capacidadCarruaje: 20,
      } }),
      calcularModificadoresEquipo: () => ({}),
    },
    "@/lib/equipamiento/inventario": { obtenerEquipoDesdePersonaje: () => ({}), LIMITE_INVENTARIO_OBJETOS: 30 },
    "@/lib/enemigos": { obtenerEnemigoPorId: () => null },
    "@/lib/expediciones/enemigos-combate": { leerEnemigosEnCombate: () => [] },
    "@/lib/equipamiento/botin": { tirarBotinEnemigo: () => null },
    "@/lib/equipamiento/sufijos": { obtenerNombreObjetoConSufijo: (nombre) => nombre },
    "@/lib/expediciones/asedio": { calcularCapacidadAlmacen: () => 100 },
  };
  const loaded = { exports: {} };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports.completarExpedicion;
}

test("dos confirmaciones comerciales simultáneas sólo registran un regreso", async () => {
  const fechas = {
    fechaSalida: new Date("2020-01-01T10:00:00.000Z"),
    fechaLlegada: new Date("2020-01-01T10:15:00.000Z"),
  };
  const expedicion = {
    id: "expedicion-1", tipo: "comercio", fase: "en_viaje",
    objetivoId: "destino", destinoCoords: { lat: 27.9, lng: -15.4 },
    ...fechas,
  };
  const personaje = {
    id: "personaje-1", nombre: "Aventurero", clase: "Novato",
    profesionActivaId: "novato", nivel: 1, hpActual: 100,
    habilidades: [], equipoEquipado: null,
  };
  const estado = {
    fase: "en_viaje",
    confirmaciones: 0,
    personajesActualizados: 0,
    registros: 0,
    respuestas: 0,
  };
  const tx = {
    expedicionActiva: {
      updateMany: async ({ where, data }) => {
        assert.equal(where.id, "expedicion-1");
        assert.equal(where.fase, "en_viaje");
        if (estado.fase !== where.fase) return { count: 0 };
        estado.fase = data.fase;
        estado.confirmaciones++;
        assert.equal(data.fase, "regresando");
        assert.equal(data.fechaSalida.toISOString(), fechas.fechaLlegada.toISOString());
        assert.equal(data.fechaLlegada.toISOString(), "2020-01-01T10:30:00.000Z");
        return { count: 1 };
      },
    },
    personaje: {
      update: async () => {
        estado.personajesActualizados++;
        return personaje;
      },
    },
    registroAccion: {
      create: async () => { estado.registros++; return { id: "registro-1" }; },
    },
    usuario: {
      update: async () => {
        estado.respuestas++;
        return { id: "emisor", personaje, expedicionActiva: { ...expedicion, fase: estado.fase } };
      },
    },
  };
  const prisma = {
    usuario: {
      // Proyecta una lectura antigua en ambas solicitudes; la fase autoritativa
      // sólo puede reclamarse mediante updateMany dentro de la transacción.
      findUnique: async ({ where }) => where.id === "emisor"
        ? {
            id: "emisor", personaje, baseCoords: { lat: 27.8, lng: -15.5 },
            expedicionActiva: { ...expedicion },
          }
        : { id: "destino", nombre: "Gremio destino", edificios: { mercado: 1 } },
    },
    afinidadComercial: { findUnique: async () => null },
    $transaction: async (fn) => fn(tx),
  };
  const completarExpedicion = cargarServicioComercial(prisma, () => ({
    exito: true, oroGanado: 20, hpPerdido: 0,
    experienciaGanada: 4, logCombate: ["Acuerdo firmado"],
  }));

  const respuestas = await Promise.all([completarExpedicion(), completarExpedicion()]);
  assert.deepEqual(respuestas.map((resultado) => resultado.status).sort(), [200, 409]);
  assert.equal(estado.confirmaciones, 1);
  assert.equal(estado.personajesActualizados, 1);
  assert.equal(estado.registros, 1);
  assert.equal(estado.respuestas, 1);
  const conflicto = respuestas.find((resultado) => resultado.status === 409);
  assert.match(conflicto.body.error, /cambiado de fase/);
});
