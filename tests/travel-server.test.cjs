const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { Prisma } = require("@prisma/client");

// Ejecuta el código real con dependencias inyectadas, sin cliente Prisma, red ni base de datos.
function loadSource(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const loadedModule = { exports: {} };
  const execute = vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename });
  execute((name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const travelContract = loadSource("src/shared/travel.ts");
const worldContract = loadSource("src/shared/world.ts");
const villageContract = loadSource("src/shared/village.ts");
const { BASE_RETURN_LOCATION, EXTERIOR_HOME_POSITION, CART_SPEED, MIN_TRIP_DURATION_MS, interpolateJourney } = travelContract;
const NOW = 1_800_000_000_000;
const exterior = (x = 1000, y = 2000) => ({ sceneId: "exterior-world", x, y, direction: "left" });

function player(usuarioId = "usuario-propio") {
  return {
    id: `jugador-${usuarioId}`, usuarioId, nombre: "Aventurero", sexo: "chico", clase: "Novato",
    nivel: 3, experiencia: 123, oro: 456, saludActual: 40, saludMaxima: 100,
    ultimoVisto: new Date(NOW), ubicacion: null, viajeRegreso: null, ubicacionRevision: 0,
    usuario: { id: usuarioId, base: {
      id: `base-${usuarioId}`, usuarioId, nombre: "Poblado", lat: 40, lng: -3,
      edificios: [{ type: "town-hall", level: 1 }], embajada: false,
    } },
  };
}

function harness(initial = player()) {
  let rows = new Map([[initial.usuarioId, structuredClone(initial)]]);
  let queue = Promise.resolve();
  let authenticated = { id: initial.usuarioId };
  let failWrite = false;
  const writes = [];
  const prisma = {
    jugador: { async findUnique({ where }) { return structuredClone(rows.get(where.usuarioId) ?? null); } },
    base: { async findMany() { return []; } },
    $transaction(work) {
      const operation = queue.then(async () => {
        const draft = structuredClone(rows);
        let locked = false;
        const tx = {
          expedicionMundo: { async findFirst() { return null; } },
          combateExterior: { async findFirst() { return null; } },
          async $executeRaw() { locked = true; },
          jugador: {
            async findUnique({ where }) {
              assert.equal(locked, true, "La lectura debe ocurrir después del bloqueo");
              return structuredClone(draft.get(where.usuarioId) ?? null);
            },
            async updateMany({ where, data }) {
              assert.equal(locked, true);
              const row = [...draft.values()].find((candidate) => candidate.id === where.id);
              if (failWrite || !row || row.ubicacionRevision !== where.ubicacionRevision) {
                failWrite = false;
                return { count: 0 };
              }
              assert.deepEqual(Object.keys(data).sort(), ["ubicacion", "ubicacionRevision", "viajeRegreso"]);
              writes.push({ where: { ...where }, data });
              row.ubicacion = structuredClone(data.ubicacion);
              row.viajeRegreso = data.viajeRegreso === Prisma.DbNull ? null : structuredClone(data.viajeRegreso);
              row.ubicacionRevision += data.ubicacionRevision.increment;
              return { count: 1 };
            },
          },
        };
        const result = await work(tx);
        rows = draft;
        return result;
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
  const http = loadSource("src/lib/mundo/http.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/auth": { async getAuthenticatedUser() { return authenticated; } },
  });
  const travel = loadSource("src/lib/mundo/travel.ts", { "./http": http, "@/shared/travel": travelContract,
    "@/shared/village": villageContract, "@/shared/world": worldContract });
  const jugador = loadSource("src/lib/mundo/jugador.ts", {
    "@/lib/prisma": { prisma }, "@/shared/world": worldContract,
    "./http": http, "./travel": travel,
    "./geo": { boundingBox: () => ({ minLat: 0, maxLat: 90 }), longitudeFilter: () => ({}) },
  });
  const route = loadSource("src/app/api/mundo/jugador/route.ts", {
    "@/lib/mundo/http": http, "@/lib/mundo/jugador": jugador, "@/lib/mundo/travel": travel,
  });
  return {
    ...travel, ...jugador, route, writes,
    row: (id = initial.usuarioId) => rows.get(id),
    setRow: (row) => rows.set(row.usuarioId, structuredClone(row)),
    setAuthenticated: (value) => { authenticated = value; },
    failNextWrite: () => { failWrite = true; },
  };
}

function rejectsCode(promise, status, code) {
  return assert.rejects(promise, (error) => {
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    assert.ok(error.message);
    return true;
  });
}

test("Contrato exacto e interpolación pura limitada al inicio y al final", () => {
  assert.deepEqual(BASE_RETURN_LOCATION, { sceneId: "base", x: 480, y: 768, direction: "up" });
  assert.deepEqual(EXTERIOR_HOME_POSITION, { x: 4082, y: 4040 });
  assert.equal(EXTERIOR_HOME_POSITION.x + 14, 4096);
  assert.equal(EXTERIOR_HOME_POSITION.y + 56, 4096);
  assert.equal(CART_SPEED, 120);
  assert.equal(MIN_TRIP_DURATION_MS, 5000);
  const journey = Object.freeze({ id: "viaje", fromX: 10, fromY: 20, toX: 30, toY: 60, departureAt: 100, arrivalAt: 200 });
  assert.deepEqual(interpolateJourney(journey, 0), { x: 10, y: 20, progress: 0 });
  assert.deepEqual(interpolateJourney(journey, 100), { x: 10, y: 20, progress: 0 });
  assert.deepEqual(interpolateJourney(journey, 150), { x: 20, y: 40, progress: 0.5 });
  assert.deepEqual(interpolateJourney(journey, 200), { x: 30, y: 60, progress: 1 });
  assert.deepEqual(interpolateJourney(journey, Infinity), { x: 30, y: 60, progress: 1 });
  assert.deepEqual(interpolateJourney({ ...journey, arrivalAt: 100 }, 100), { x: 30, y: 60, progress: 1 });
});

test("Jugador anterior con ubicación nula: retorno inicial sin tocar economía ni revisión", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  const before = structuredClone(h.row());
  const expected = { revision: 0, location: BASE_RETURN_LOCATION, journey: null, serverNow: NOW };
  assert.deepEqual(await h.loadMobility(before.usuarioId), expected);
  assert.deepEqual(await h.mutateMobility(before.usuarioId, { action: "status" }), expected);
  assert.deepEqual(h.row(), before);
  assert.equal(h.writes.length, 0);
  await rejectsCode(h.loadMobility("usuario-ausente"), 404, "no_player");
  h.row().usuario.base = null;
  await rejectsCode(h.loadMobility(before.usuarioId), 404, "no_player");
});

test("Checkpoint válido hace CAS, restaura posición exacta y solo modifica movilidad", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  const before = structuredClone(h.row());
  const snapshot = await h.mutateMobility(before.usuarioId, { action: "checkpoint", revision: 0, location: exterior(500.25, 600.5) });
  assert.deepEqual(snapshot, { revision: 1, location: exterior(500.25, 600.5), journey: null, serverNow: NOW });
  assert.deepEqual(await h.loadMobility(before.usuarioId), snapshot);
  assert.equal(h.progressToken(h.row(), h.row().usuario.base), h.progressToken(before, before.usuario.base));
  assert.equal(h.row().oro, before.oro);
  assert.equal(h.row().experiencia, before.experiencia);
  assert.deepEqual(h.writes[0].where, { id: before.id, ubicacionRevision: 0 });
  await rejectsCode(h.mutateMobility(before.usuarioId, { action: "checkpoint", revision: 0, location: BASE_RETURN_LOCATION }), 409, "location_conflict");
  assert.equal(h.row().ubicacionRevision, 1);
});

test("Valida JSON, acción, enteros, direcciones, escenas y límites de cada mapa", async () => {
  const h = harness();
  const id = h.row().usuarioId;
  for (const body of [null, [], "texto", {}, { action: "cancel" }, { action: "status", arrivalAt: 0 }]) {
    await rejectsCode(h.mutateMobility(id, body), 400, "invalid_body");
  }
  for (const revision of [undefined, null, "0", 0.5, -1, NaN, Infinity, 2_147_483_648]) {
    await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision, location: BASE_RETURN_LOCATION }), 400, "invalid_revision");
    await rejectsCode(h.mutateMobility(id, { action: "call-cart", revision }), 400, "invalid_revision");
  }
  for (const location of [null, [], {}, { ...exterior(), sceneId: "otra-base" }, { ...exterior(), sceneId: "__proto__" },
    { ...exterior(), direction: "north" }, { ...exterior(), x: "1" }, { ...exterior(), x: NaN },
    { ...exterior(), y: Infinity }, { ...exterior(), x: -1 }, { ...exterior(), baseId: "base-ajena" }]) {
    await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision: 0, location }), 400, "invalid_location");
  }
  for (const [sceneId, width, height] of [["base", 960, 1440], ["exterior-world", 8192, 8192],
    ["town-hall-interior", 160, 160], ["tavern-interior", 160, 160], ["embassy-interior", 160, 160]]) {
    for (const [x, y] of [[width, 0], [0, height], [-0.1, 0], [0, -0.1]]) {
      await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision: 0, location: { sceneId, x, y, direction: "up" } }), 400, "invalid_location");
    }
  }
  assert.equal(h.writes.length, 0);
});

test("Solo permite interiores construidos en la base propia, no solares ni edificios ajenos", async () => {
  const h = harness();
  const id = h.row().usuarioId;
  const other = player("usuario-ajeno");
  other.usuario.base.edificios.push({ type: "embassy", level: 2 });
  h.setRow(other);
  for (const sceneId of ["tavern-interior", "embassy-interior"]) {
    await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision: 0, location: { sceneId, x: 64, y: 48, direction: "down" } }), 403, "scene_unavailable");
  }
  h.row().usuario.base.edificios.push({ type: "tavern", level: 0 });
  await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision: 0, location: { sceneId: "tavern-interior", x: 64, y: 48, direction: "down" } }), 403, "scene_unavailable");
  h.row().usuario.base.edificios = [{ type: "tavern", level: 1 }, { type: "embassy", level: 1 }];
  await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision: 0, location: { sceneId: "town-hall-interior", x: 64, y: 48, direction: "up" } }), 403, "scene_unavailable");
  h.row().usuario.base.edificios.push({ type: "town-hall", level: 1 });
  for (const sceneId of ["town-hall-interior", "tavern-interior", "embassy-interior", "base", "exterior-world"]) {
    const revision = h.row().ubicacionRevision;
    const location = sceneId === "base" ? { ...BASE_RETURN_LOCATION, direction: "right" } : { sceneId, x: 64, y: 48, direction: "right" };
    assert.deepEqual((await h.mutateMobility(id, { action: "checkpoint", revision, location })).location, location);
  }
  assert.equal(h.row("usuario-ajeno").ubicacionRevision, 0);
});

test("Carro usa origen guardado, destino fijo, UUID y tiempos del servidor", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const initial = player();
  initial.ubicacion = exterior(100, 100);
  initial.ubicacionRevision = 4;
  const h = harness(initial);
  const id = initial.usuarioId;
  await rejectsCode(h.mutateMobility(id, { action: "call-cart", revision: 3 }), 409, "location_conflict");
  await rejectsCode(h.mutateMobility(id, { action: "call-cart", revision: 4, departureAt: 0 }), 400, "invalid_body");
  await rejectsCode(h.mutateMobility(id, { action: "call-cart", revision: 4, location: exterior(4082, 4040) }), 400, "invalid_body");
  const snapshot = await h.mutateMobility(id, { action: "call-cart", revision: 4 });
  const journey = snapshot.journey;
  assert.match(journey.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(journey.fromX, 100);
  assert.equal(journey.fromY, 100);
  assert.equal(journey.toX, 4082);
  assert.equal(journey.toY, 4040);
  assert.equal(journey.departureAt, NOW);
  assert.equal(journey.arrivalAt, NOW + Math.ceil(Math.hypot(3982, 3940) / CART_SPEED * 1000));
  assert.equal(snapshot.revision, 5);
  assert.deepEqual(snapshot.location, initial.ubicacion);
  assert.deepEqual(h.row().viajeRegreso, journey);
});

test("Carro en casa dura al menos cinco segundos y no se puede llamar desde la base", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  const id = h.row().usuarioId;
  await rejectsCode(h.mutateMobility(id, { action: "call-cart", revision: 0 }), 409, "not_in_exterior");
  h.row().ubicacion = exterior(EXTERIOR_HOME_POSITION.x, EXTERIOR_HOME_POSITION.y);
  const { journey } = await h.mutateMobility(id, { action: "call-cart", revision: 0 });
  assert.equal(journey.arrivalAt - journey.departureAt, MIN_TRIP_DURATION_MS);
});

test("Viaje activo: llamada idempotente obsoleta, status sin revisión y checkpoint bloqueado", async (t) => {
  let now = NOW;
  t.mock.method(Date, "now", () => now);
  const initial = player();
  initial.ubicacion = exterior();
  const h = harness(initial);
  const id = initial.usuarioId;
  const first = await h.mutateMobility(id, { action: "call-cart", revision: 0 });
  now += 1000;
  assert.deepEqual(await h.mutateMobility(id, { action: "call-cart", revision: 0 }), { ...first, serverNow: now });
  assert.deepEqual(await h.mutateMobility(id, { action: "status" }), { ...first, serverNow: now });
  for (const revision of [0, 1]) {
    await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision, location: BASE_RETURN_LOCATION }), 409, "travel_active");
    await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision, location: exterior(5000, 5000) }), 409, "travel_active");
  }
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.row().viajeRegreso, first.journey);
  assert.deepEqual(h.row().ubicacion, initial.ubicacion);
});

test("Llegada exacta al cargar completa atómicamente y una sola vez, también tras desconexión", async (t) => {
  let now = NOW;
  t.mock.method(Date, "now", () => now);
  const initial = player();
  initial.ubicacion = exterior();
  const h = harness(initial);
  const first = await h.mutateMobility(initial.usuarioId, { action: "call-cart", revision: 0 });
  now = first.journey.arrivalAt - 1;
  assert.deepEqual((await h.loadMobility(initial.usuarioId)).journey, first.journey);
  now++;
  const arrived = { revision: 2, location: BASE_RETURN_LOCATION, journey: null, serverNow: now };
  assert.deepEqual(await h.loadMobility(initial.usuarioId), arrived);
  assert.deepEqual(await h.mutateMobility(initial.usuarioId, { action: "status" }), arrived);
  assert.deepEqual(h.row().ubicacion, BASE_RETURN_LOCATION);
  assert.equal(h.row().viajeRegreso, null);
  assert.equal(h.writes.length, 2);
  now += 86_400_000;
  assert.deepEqual(await h.loadMobility(initial.usuarioId), { ...arrived, serverNow: now });
  assert.equal(h.writes.length, 2);
});

test("Una mutación obsoleta no revierte la llegada resuelta por esa misma petición", async (t) => {
  let now = NOW;
  t.mock.method(Date, "now", () => now);
  for (const action of ["checkpoint", "call-cart"]) {
    const initial = player();
    initial.ubicacion = exterior();
    const h = harness(initial);
    const first = await h.mutateMobility(initial.usuarioId, { action: "call-cart", revision: 0 });
    now = first.journey.arrivalAt;
    const body = action === "checkpoint" ? { action, revision: 1, location: exterior() } : { action, revision: 1 };
    await rejectsCode(h.mutateMobility(initial.usuarioId, body), 409, "location_conflict");
    assert.equal(h.row().ubicacionRevision, 2);
    assert.equal(h.row().viajeRegreso, null);
    assert.deepEqual(h.row().ubicacion, BASE_RETURN_LOCATION);
  }
});

test("Bloqueo serializa llamadas simultáneas y checkpoints con la misma revisión", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const initial = player();
  initial.ubicacion = exterior();
  const h = harness(initial);
  const id = initial.usuarioId;
  const journeys = await Promise.all(Array.from({ length: 5 }, () => h.mutateMobility(id, { action: "call-cart", revision: 0 })));
  for (const snapshot of journeys) assert.deepEqual(snapshot, journeys[0]);
  assert.equal(h.writes.length, 1);
  const other = harness();
  const results = await Promise.allSettled([
    other.mutateMobility(id, { action: "checkpoint", revision: 0, location: exterior(10, 20) }),
    other.mutateMobility(id, { action: "checkpoint", revision: 0, location: exterior(30, 40) }),
  ]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].reason.code, "location_conflict");
  assert.deepEqual(other.row().ubicacion, exterior(10, 20));
});

test("CAS fallido y JSON persistido corrupto nunca sobrescriben ubicación o viaje", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  const id = h.row().usuarioId;
  h.failNextWrite();
  await rejectsCode(h.mutateMobility(id, { action: "checkpoint", revision: 0, location: exterior() }), 409, "location_conflict");
  assert.equal(h.row().ubicacionRevision, 0);
  h.row().ubicacion = { sceneId: "escena-inexistente" };
  await rejectsCode(h.loadMobility(id), 500, "invalid_mobility");
  h.row().ubicacion = exterior();
  h.row().viajeRegreso = { arrivalAt: 0 };
  await rejectsCode(h.loadMobility(id), 500, "invalid_mobility");
  assert.equal(h.writes.length, 0);
});

test("loadSession incluye movilidad resuelta sin modificar progressToken ni economía", async (t) => {
  let now = NOW;
  t.mock.method(Date, "now", () => now);
  const initial = player();
  initial.ubicacion = exterior();
  const h = harness(initial);
  const first = await h.mutateMobility(initial.usuarioId, { action: "call-cart", revision: 0 });
  const token = h.progressToken(initial, initial.usuario.base);
  now = first.journey.arrivalAt;
  const session = await h.loadSession(initial.usuarioId);
  assert.deepEqual(session.mobility, { revision: 2, location: BASE_RETURN_LOCATION, journey: null, serverNow: now });
  assert.equal(session.progressToken, token);
  assert.equal(session.player.gold, initial.oro);
  assert.equal(session.player.experience, initial.experiencia);
  assert.deepEqual(session.base.buildings, initial.usuario.base.edificios);
  assert.equal(await h.loadSession("usuario-inexistente"), null);
});

test("PATCH autenticado rechaza JSON inválido y usa exclusivamente la identidad de sesión", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  const request = (body) => new Request("http://prueba.local/api/mundo/jugador", { method: "PATCH", body });
  for (const body of ["{", "null", "[]", '"texto"']) {
    const response = await h.route.PATCH(request(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "invalid_body");
  }
  const other = player("usuario-ajeno");
  other.ubicacion = exterior(500, 600);
  h.setRow(other);
  const response = await h.route.PATCH(request(JSON.stringify({ action: "status" })));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).mobility.location, BASE_RETURN_LOCATION);
  const forged = await h.route.PATCH(request(JSON.stringify({ action: "status", usuarioId: other.usuarioId })));
  assert.equal(forged.status, 400);
  assert.equal(h.row(other.usuarioId).ubicacionRevision, 0);
  h.setAuthenticated(null);
  const unauthorized = await h.route.PATCH(request(JSON.stringify({ action: "status" })));
  assert.equal(unauthorized.status, 401);
  assert.equal((await unauthorized.json()).code, "unauthenticated");
  assert.equal(h.writes.length, 0);
});

test("checkpoint de base valida pies y acepta origen visual sobre el borde norte", async () => {
  const h = harness();
  const location = { sceneId: "base", x: 350, y: 450, direction: "up" };
  const saved = await h.mutateMobility(h.row().usuarioId, { action: "checkpoint", revision: 0, location });
  assert.deepEqual(saved.location, location);
  await rejectsCode(h.mutateMobility(h.row().usuarioId, { action: "checkpoint", revision: 1,
    location: { ...location, y: 420 } }), 400, "invalid_location");
});