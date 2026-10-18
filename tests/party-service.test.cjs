require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const reglas = require("../src/lib/party/reglas.ts");
const reglasExpedicionParty = require("../src/lib/party/expedicion-reglas.ts");

function loadService(prisma) {
  const filename = path.resolve(__dirname, "../src/server/services/party/party-service.ts");
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const loaded = { exports: {} };
  const dependencies = {
    "@prisma/client": { Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } } },
    "@/lib/prisma": { prisma },
    "@/lib/estadisticasPersonaje": {
      calcularEstadisticasPersonaje: () => ({ total: { energiaMaxima: 20, manaMaximo: 10 } }),
      calcularModificadoresEquipo: () => ({}),
    },
    "@/lib/inventario": { obtenerEquipoDesdePersonaje: () => ({}) },
    "@/lib/utils": { calcularDistanciaKm: () => 12 },
    "@/lib/party/reglas": reglas,
    "@/lib/party/expedicion-reglas": reglasExpedicionParty,
    "@/lib/habilidades": { obtenerHabilidadPorId: () => undefined },
    "@/lib/objetos": { obtenerObjetoPorId: () => undefined },
  };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function makePrisma(tx) {
  return {
    $transaction: async (callback, options) => {
      assert.equal(options?.isolationLevel, "Serializable");
      return callback(tx);
    },
  };
}

const user = (id, estado = "ocioso", coords = { lat: 27.99, lng: -15.42 }) => ({
  id,
  nombre: id,
  baseCoords: coords,
  personaje: { id: "personaje-" + id, estado },
  expedicionActiva: null,
});

test("solicitar visita rechaza al propio usuario antes de abrir una transacción", async () => {
  let transacciones = 0;
  const servicio = loadService({ $transaction: async () => { transacciones += 1; } });
  await assert.rejects(
    servicio.solicitarVisita("u1", "u1"),
    (error) => error.status === 400 && error.code === "DESTINO_PROPIO",
  );
  assert.equal(transacciones, 0);
});

test("solicitar visita bloquea a un aventurero que ya pertenece a una party", async () => {
  const tx = {
    usuario: {
      findUnique: async ({ where }) => where.id === "visitante"
        ? user("visitante")
        : user("anfitrion"),
    },
    partyMember: {
      findUnique: async ({ where }) => where.usuarioId === "visitante" ? { id: "m1" } : null,
    },
  };
  const servicio = loadService(makePrisma(tx));
  await assert.rejects(
    servicio.solicitarVisita("visitante", "anfitrion"),
    (error) => error.status === 409 && error.code === "YA_EN_PARTY",
  );
});

test("solicitar visita crea un traslado y bloquea el personaje durante el viaje", async () => {
  let creado = null;
  let estadoActualizado = null;
  const tx = {
    usuario: {
      findUnique: async ({ where }) => where.id === "visitante"
        ? user("visitante")
        : user("anfitrion"),
    },
    partyMember: {
      findUnique: async () => null,
    },
    partyTransfer: {
      findFirst: async () => null,
      create: async ({ data }) => {
        creado = { id: "t1", ...data };
        return creado;
      },
    },
    party: {
      findUnique: async () => null,
    },
    personaje: {
      updateMany: async ({ where, data }) => {
        estadoActualizado = { where, data };
        return { count: 1 };
      },
    },
  };
  const servicio = loadService(makePrisma(tx));
  const resultado = await servicio.solicitarVisita("visitante", "anfitrion");
  assert.equal(resultado.traslado.id, "t1");
  assert.equal(creado.estado, "en_viaje");
  assert.equal(creado.visitanteUsuarioId, "visitante");
  assert.equal(creado.anfitrionUsuarioId, "anfitrion");
  assert.equal(estadoActualizado.where.estado, "ocioso");
  assert.equal(estadoActualizado.data.estado, "de_viaje");
});

test("el aventurero no puede marcar llegada antes de la fecha estimada", async () => {
  const tx = {
    partyTransfer: {
      findUnique: async () => ({
        id: "t1",
        visitanteUsuarioId: "visitante",
        estado: "en_viaje",
        decision: null,
        fechaLlegada: new Date(Date.now() + 60_000),
      }),
      updateMany: async () => { throw new Error("No debía actualizar"); },
    },
  };
  const servicio = loadService(makePrisma(tx));
  await assert.rejects(
    servicio.marcarLlegadaTraslado("visitante", "t1"),
    (error) => error.status === 409 && error.code === "TRASLADO_NO_LLEGADO",
  );
});

test("aceptar visita crea una party con el dueño como líder y el visitante como miembro", async () => {
  const transfer = {
    id: "t1",
    visitanteUsuarioId: "visitante",
    anfitrionUsuarioId: "anfitrion",
    estado: "pendiente",
    decision: null,
    fechaLlegada: new Date(Date.now() - 1_000),
  };
  const miembrosCreados = [];
  let transferenciaAceptada = false;
  let personajeActualizado = false;
  const tx = {
    partyTransfer: {
      findUnique: async () => transfer,
      updateMany: async ({ where, data }) => {
        assert.equal(where.estado, "pendiente");
        assert.equal(data.estado, "aceptada");
        transferenciaAceptada = true;
        return { count: 1 };
      },
    },
    usuario: {
      findUnique: async ({ where }) => where.id === "visitante"
        ? user("visitante", "de_viaje")
        : user("anfitrion"),
    },
    partyMember: {
      findUnique: async () => null,
      create: async ({ data }) => {
        miembrosCreados.push(data);
        return { id: "miembro-visitante", ...data };
      },
    },
    party: {
      findUnique: async () => null,
      create: async ({ data }) => {
        assert.equal(data.liderUsuarioId, "anfitrion");
        assert.equal(data.miembros.create.usuarioId, "anfitrion");
        miembrosCreados.push({ partyId: "p1", usuarioId: "anfitrion" });
        return { id: "p1" };
      },
    },
    personaje: {
      update: async ({ where, data }) => {
        assert.equal(where.usuarioId, "visitante");
        assert.equal(data.estado, "ocioso");
        personajeActualizado = true;
      },
    },
  };
  const servicio = loadService(makePrisma(tx));
  const resultado = await servicio.aceptarVisita("anfitrion", "t1");
  assert.equal(resultado.partyId, "p1");
  assert.deepEqual(miembrosCreados.map((m) => m.usuarioId), ["anfitrion", "visitante"]);
  assert.equal(transferenciaAceptada, true);
  assert.equal(personajeActualizado, true);
});

test("aceptar visita rechaza una party que ya tiene tres miembros", async () => {
  const tx = {
    partyTransfer: {
      findUnique: async () => ({
        id: "t1",
        visitanteUsuarioId: "visitante",
        anfitrionUsuarioId: "anfitrion",
        estado: "pendiente",
        decision: null,
        fechaLlegada: new Date(Date.now() - 1_000),
      }),
    },
    usuario: {
      findUnique: async ({ where }) => where.id === "visitante"
        ? user("visitante", "de_viaje")
        : user("anfitrion"),
    },
    partyMember: {
      findUnique: async ({ where }) => where.usuarioId === "anfitrion"
        ? { partyId: "p1", party: { id: "p1", liderUsuarioId: "anfitrion" } }
        : null,
      count: async () => 3,
      create: async () => { throw new Error("No debía crear miembro"); },
    },
  };
  const servicio = loadService(makePrisma(tx));
  await assert.rejects(
    servicio.aceptarVisita("anfitrion", "t1"),
    (error) => error.status === 409 && error.code === "PARTY_LLENA",
  );
});


test("el propietario puede aceptar una visita recién llegada sin que el visitante confirme primero", async () => {
  let estadoTraslado = "en_viaje";
  const llamadasEstado = [];
  const transfer = {
    id: "t-arrived",
    visitanteUsuarioId: "visitante",
    anfitrionUsuarioId: "anfitrion",
    estado: "en_viaje",
    decision: null,
    fechaLlegada: new Date(Date.now() - 1_000),
  };
  const tx = {
    partyTransfer: {
      findUnique: async () => ({ ...transfer, estado: estadoTraslado }),
      updateMany: async ({ where, data }) => {
        if (where.estado !== estadoTraslado) return { count: 0 };
        if (where.fechaLlegada?.lte && transfer.fechaLlegada > where.fechaLlegada.lte) return { count: 0 };
        llamadasEstado.push(data.estado);
        estadoTraslado = data.estado;
        return { count: 1 };
      },
    },
    usuario: {
      findUnique: async ({ where }) => where.id === "visitante"
        ? user("visitante", "de_viaje")
        : user("anfitrion"),
    },
    partyMember: {
      findUnique: async () => null,
      create: async ({ data }) => ({ id: "miembro", ...data }),
    },
    party: {
      findUnique: async () => null,
      create: async ({ data }) => {
        assert.equal(data.liderUsuarioId, "anfitrion");
        return { id: "party-llegada" };
      },
    },
    personaje: {
      update: async () => undefined,
    },
  };
  const servicio = loadService(makePrisma(tx));
  const resultado = await servicio.aceptarVisita("anfitrion", "t-arrived");
  assert.equal(resultado.partyId, "party-llegada");
  assert.deepEqual(llamadasEstado, ["pendiente", "aceptada"]);
});

test("el propietario puede rechazar una visita llegada aunque siga marcada en viaje", async () => {
  let estadoTraslado = "en_viaje";
  const llamadasEstado = [];
  const transfer = {
    id: "t-reject",
    visitanteUsuarioId: "visitante",
    anfitrionUsuarioId: "anfitrion",
    estado: "en_viaje",
    decision: null,
    fechaLlegada: new Date(Date.now() - 1_000),
    origenCoords: { lat: 27.9, lng: -15.4 },
    destinoCoords: { lat: 28.0, lng: -15.5 },
  };
  const tx = {
    partyTransfer: {
      findUnique: async () => ({ ...transfer, estado: estadoTraslado }),
      updateMany: async ({ where, data }) => {
        if (where.estado !== estadoTraslado) return { count: 0 };
        if (where.fechaLlegada?.lte && transfer.fechaLlegada > where.fechaLlegada.lte) return { count: 0 };
        llamadasEstado.push(data.estado);
        estadoTraslado = data.estado;
        return { count: 1 };
      },
    },
  };
  const servicio = loadService(makePrisma(tx));
  const resultado = await servicio.rechazarVisita("anfitrion", "t-reject");
  assert.equal(resultado.estado, "regresando");
  assert.equal(resultado.decision, "rechazada");
  assert.deepEqual(llamadasEstado, ["pendiente", "regresando"]);
});

test("el visitante puede cancelar una visita pendiente y regresar a su base", async () => {
  const transfer = {
    id: "t-volver",
    visitanteUsuarioId: "visitante",
    anfitrionUsuarioId: "anfitrion",
    estado: "pendiente",
    decision: null,
    fechaLlegada: new Date(Date.now() - 1_000),
    fechaSalida: new Date(Date.now() - 60_000),
    fechaResolucion: null,
    origenCoords: { lat: 27.9, lng: -15.4 },
    destinoCoords: { lat: 28.0, lng: -15.5 },
  };
  let estado = "pendiente";
  let datosActualizacion = null;
  const tx = {
    partyTransfer: {
      findUnique: async () => ({ ...transfer, estado }),
      updateMany: async ({ where, data }) => {
        if (where.id !== transfer.id || where.visitanteUsuarioId !== "visitante" ||
            where.estado !== estado || estado !== "pendiente" || where.decision !== null ||
            transfer.decision !== null) return { count: 0 };
        estado = data.estado;
        datosActualizacion = data;
        return { count: 1 };
      },
    },
    usuario: {
      findUnique: async ({ where }) => where.id === "visitante"
        ? user("visitante", "de_viaje", transfer.origenCoords)
        : null,
    },
  };
  const servicio = loadService(makePrisma(tx));
  const resultado = await servicio.volverDeVisita("visitante", "t-volver");

  assert.equal(resultado.estado, "regresando");
  assert.equal(resultado.decision, "visitante_volver");
  assert.equal(estado, "regresando");
  assert.deepEqual(datosActualizacion.origenCoords, transfer.destinoCoords);
  assert.deepEqual(datosActualizacion.destinoCoords, transfer.origenCoords);
  assert.ok(datosActualizacion.fechaLlegada > datosActualizacion.fechaSalida);
});

test("un visitante no puede volver si la visita ya está resuelta o aún no ha llegado", async () => {
  const transfer = {
    id: "t-no-pendiente",
    visitanteUsuarioId: "visitante",
    anfitrionUsuarioId: "anfitrion",
    estado: "aceptada",
    decision: "aceptada",
    fechaLlegada: new Date(Date.now() - 1_000),
    origenCoords: { lat: 27.9, lng: -15.4 },
    destinoCoords: { lat: 28.0, lng: -15.5 },
  };
  const tx = { partyTransfer: { findUnique: async () => transfer } };
  const servicio = loadService(makePrisma(tx));
  await assert.rejects(
    servicio.volverDeVisita("visitante", transfer.id),
    (error) => error.status === 409 && error.code === "VISITA_NO_PENDIENTE",
  );
});

test("el último informe de combate se conserva después del regreso y queda limitado a sus participantes", async () => {
  const informe = {
    liquidacionYaResuelta: false,
    oroTotal: 21,
    dropsEnemigo: [{ usuarioId: "u1", objetoId: "pocion", nombre: "Poción", cantidad: 1, sufijoId: "del test" }],
    experienciaPorMiembro: [{ usuarioId: "u1", experiencia: 45 }, { usuarioId: "u2", experiencia: 45 }],
    recompensas: [
      { usuarioId: "u1", oro: 11, madera: 2, piedra: 1, metal: 1, experiencia: 45, objetos: [] },
      { usuarioId: "u2", oro: 10, madera: 2, piedra: 1, metal: 0, experiencia: 45, objetos: [] },
    ],
  };
  const llamadaHistorial = [];
  const tx = {
    partyMember: { findUnique: async () => null },
    partyTransfer: { findMany: async () => [] },
    party: { findUnique: async () => null },
    usuario: { findUnique: async () => null },
    expedicionParty: {
      findFirst: async (args) => {
        llamadaHistorial.push(args);
        if (args.where.partyId) return null;
        return {
          id: "expedicion-terminada",
          combate: { fase: "victoria", recompensasResultado: informe },
          participantes: [
            { usuarioId: "u1", usuario: { id: "u1", nombre: "uno", personaje: { nombre: "Aventurero Uno", nivel: 4, estado: "ocioso" } } },
            { usuarioId: "u2", usuario: { id: "u2", nombre: "dos", personaje: { nombre: "Aventurero Dos", nivel: 4, estado: "ocioso" } } },
          ],
        };
      },
    },
    personaje: { findUnique: async () => null },
  };
  const prisma = {
    partyMember: tx.partyMember,
    partyTransfer: tx.partyTransfer,
    party: tx.party,
    usuario: tx.usuario,
    expedicionParty: tx.expedicionParty,
    personaje: tx.personaje,
    $transaction: async (callback, options) => {
      assert.equal(options?.isolationLevel, "Serializable");
      return callback(tx);
    },
  };
  const servicio = loadService(prisma);
  const estado = await servicio.obtenerEstadoParty("u1");

  assert.equal(llamadaHistorial.length, 1);
  assert.deepEqual(llamadaHistorial[0].where.participantes, { some: { usuarioId: "u1" } });
  assert.deepEqual(llamadaHistorial[0].where.combate.is.fase.in, ["victoria", "derrota", "huida"]);
  assert.equal(estado.expedicionActiva, null);
  assert.equal(estado.ultimoResultadoExpedicion.expedicionPartyId, "expedicion-terminada");
  assert.equal(estado.ultimoResultadoExpedicion.fase, "victoria");
  assert.deepEqual(estado.ultimoResultadoExpedicion.recompensas.dropsEnemigo.map((drop) => drop.usuarioId), ["u1"]);
  assert.deepEqual(estado.ultimoResultadoExpedicion.participantes.map((p) => p.usuario.personaje.nombre), ["Aventurero Uno", "Aventurero Dos"]);
});


test("el líder no puede disolver la party al llegar al combate ni durante el combate", async () => {
  for (const fase of ["lista_para_combate", "combatiendo", "regresando"]) {
    let seBorroMembresia = false;
    let seMarcoDisuelta = false;
    const tx = {
      party: {
        findUnique: async () => ({
          id: "p1",
          estado: "activa",
          liderUsuarioId: "lider",
          liderUsuario: { id: "lider", baseCoords: { lat: 27.99, lng: -15.42 }, personaje: { id: "char-lider", estado: "de_viaje" } },
          miembros: [{ id: "m1", usuarioId: "lider" }, { id: "m2", usuarioId: "invitado" }],
        }),
        update: async () => { seMarcoDisuelta = true; },
      },
      expedicionParty: { findFirst: async () => ({ id: "exp-activa", fase, combate: fase === "combatiendo" ? { id: "combat-1" } : null, participantes: [] }) },
      partyMember: { deleteMany: async () => { seBorroMembresia = true; } },
    };
    const servicio = loadService(makePrisma(tx));
    await assert.rejects(
      servicio.disolverParty("lider"),
      (error) => error.status === 409 && error.code === "PARTY_EXPEDICION_ACTIVA",
    );
    assert.equal(seBorroMembresia, false);
    assert.equal(seMarcoDisuelta, false);
  }
});

test("el líder puede disolver durante el viaje y manda a todos desde la posición actual a sus bases", async () => {
  let seBorroMembresia = false;
  let seMarcoDisuelta = false;
  let participantesRetirados = null;
  let expedicionCancelada = null;
  const now = Date.now();
  const bases = {
    lider: { lat: 27.9, lng: -15.4 },
    invitado: { lat: 28.4, lng: -15.9 },
  };
  const miembros = ["lider", "invitado"].map((id) => ({
    id: "m-" + id,
    usuarioId: id,
    usuario: {
      id,
      baseCoords: bases[id],
      personaje: { id: "char-" + id, estado: "de_viaje" },
      expedicionActiva: null,
    },
  }));
  const transfers = [];
  const tx = {
    party: {
      findUnique: async () => ({
        id: "p1",
        estado: "activa",
        liderUsuarioId: "lider",
        liderUsuario: { id: "lider", baseCoords: bases.lider, personaje: { id: "char-lider", estado: "de_viaje" } },
        miembros,
      }),
      update: async ({ data }) => { seMarcoDisuelta = data.estado === "disuelta"; },
    },
    expedicionParty: {
      findFirst: async () => ({
        id: "exp-ida",
        fase: "en_viaje",
        fechaSalida: new Date(now - 30_000),
        fechaLlegada: new Date(now + 30_000),
        origenCoords: bases.lider,
        destinoCoords: { lat: 28.2, lng: -15.7 },
        participantes: [{ usuarioId: "lider", estado: "en_viaje" }, { usuarioId: "invitado", estado: "en_viaje" }],
        combate: null,
      }),
      updateMany: async ({ where, data }) => {
        expedicionCancelada = { where, data };
        return { count: 1 };
      },
    },
    expedicionPartyParticipante: {
      updateMany: async ({ where, data }) => {
        participantesRetirados = { where, data };
        return { count: 2 };
      },
    },
    partyTransfer: {
      findFirst: async () => null,
      create: async ({ data }) => { transfers.push(data); return { id: "transfer-" + transfers.length, ...data }; },
    },
    personaje: {
      updateMany: async ({ where }) => where.estado === "de_viaje" ? { count: 1 } : { count: 0 },
    },
    partyMember: { deleteMany: async () => { seBorroMembresia = true; } },
  };
  const servicio = loadService(makePrisma(tx));
  const resultado = await servicio.disolverParty("lider");

  assert.equal(resultado.partyDisuelta, true);
  assert.equal(resultado.integrantesEnRegreso, 2);
  assert.equal(resultado.expedicionPartyId, "exp-ida");
  assert.equal(transfers.length, 2);
  assert.deepEqual(transfers.map((t) => t.visitanteUsuarioId).sort(), ["invitado", "lider"]);
  assert.ok(transfers.every((t) => t.estado === "regresando" && t.decision === "lider_disuelve"));
  assert.ok(transfers.every((t) => t.origenCoords.lat > bases.lider.lat && t.origenCoords.lat < 28.2));
  assert.deepEqual(transfers.find((t) => t.visitanteUsuarioId === "lider").destinoCoords, bases.lider);
  assert.deepEqual(transfers.find((t) => t.visitanteUsuarioId === "invitado").destinoCoords, bases.invitado);
  assert.equal(participantesRetirados.data.estado, "retirado");
  assert.equal(expedicionCancelada.data.fase, "cancelada");
  assert.equal(expedicionCancelada.data.resultadoFinal, "cancelada");
  assert.equal(seBorroMembresia, true);
  assert.equal(seMarcoDisuelta, true);
});

test("abandonar party se bloquea durante una expedición aunque el miembro haya huido del combate", async () => {
  const tx = {
    partyMember: {
      findUnique: async () => ({
        id: "m-visitante",
        partyId: "p1",
        party: {
          id: "p1",
          estado: "activa",
          liderUsuarioId: "lider",
          liderUsuario: { id: "lider", baseCoords: { lat: 27.99, lng: -15.42 } },
          miembros: [{ id: "m-lider", usuarioId: "lider" }, { id: "m-visitante", usuarioId: "visitante" }],
        },
      }),
    },
    expedicionParty: {
      findFirst: async () => ({ id: "expedicion-activa" }),
    },
  };
  const servicio = loadService(makePrisma(tx));
  await assert.rejects(
    servicio.abandonarParty("visitante"),
    (error) => error.status === 409 && error.code === "PARTY_EXPEDICION_ACTIVA",
  );
});
