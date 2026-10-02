const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");
const { Prisma } = require("@prisma/client");

// Production sources executed with an isolated transactional database, no server/DB required.
function loadSource(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}

const NOW = 1_800_000_000_000;
const contract = loadSource("src/shared/expeditions.ts");
const world = loadSource("src/shared/world.ts");
const geo = loadSource("src/lib/mundo/geo.ts", { "@/lib/utils": loadSource("src/lib/utils.ts") });
function player(name = "propio", lat = 40, lng = -3) {
  const id = randomUUID();
  const usuarioId = randomUUID();
  return {
    id, usuarioId, nombre: name, sexo: "chico", clase: "Novato", nivel: 1, experiencia: 0,
    oro: 100, saludActual: 40, saludMaxima: 100, ultimoVisto: new Date(NOW), ubicacion: null,
    viajeRegreso: null, ubicacionRevision: 0, ultimaEliteExitosa: null, rewardRevision: 0,
    usuario: { base: { id: randomUUID(), usuarioId, nombre: name, lat, lng, edificios: [{ type: "town-hall", level: 1 }], embajada: false } },
  };
}

function harness(initial = player(), others = []) {
  let rows = new Map([initial, ...others].map((p) => [p.id, structuredClone(p)]));
  let ledger = new Map();
  let queue = Promise.resolve();
  let authenticated = { id: initial.usuarioId };
  let failCompletion = false;
  const prisma = {
    $transaction(work) {
      const operation = queue.then(async () => {
        const draft = structuredClone(rows);
        const draftLedger = structuredClone(ledger);
        let locked = false;
        const check = () => assert.equal(locked, true, "Every DB operation must hold the world lock");
        const tx = {
          async $executeRaw(strings) { assert.match(strings.join(""), /pg_advisory_xact_lock/); locked = true; },
          jugador: {
            async findUnique({ where }) {
              check();
              return structuredClone([...draft.values()].find((p) => where.id ? p.id === where.id : p.usuarioId === where.usuarioId) ?? null);
            },
            async update({ where, data }) {
              check();
              const p = draft.get(where.id);
              assert.ok(p);
              for (const [key, value] of Object.entries(data)) {
                p[key] = value && typeof value === "object" && "increment" in value ? p[key] + value.increment : structuredClone(value);
              }
              return structuredClone(p);
            },
          },
          base: {
            async findMany({ where }) {
              check();
              const longitudeMatches = (base, condition) => !condition.lng || (
                (condition.lng.gte === undefined || base.lng >= condition.lng.gte) &&
                (condition.lng.lte === undefined || base.lng <= condition.lng.lte));
              return [...draft.values()].filter((p) => {
                const b = p.usuario.base;
                return b && b.id !== where.id.not && b.lat >= where.lat.gte && b.lat <= where.lat.lte &&
                  (where.OR ? where.OR.some((condition) => longitudeMatches(b, condition)) : longitudeMatches(b, where));
              }).map((p) => ({ ...structuredClone(p.usuario.base), usuario: { jugador: structuredClone(p) } }));
            },
          },
          expedicionMundo: {
            async findUnique({ where }) {
              check();
              return structuredClone([...draftLedger.values()].find((r) => r.requestId === where.requestId) ?? null);
            },
            async findFirst({ where }) {
              check();
              return structuredClone([...draftLedger.values()].filter((r) => r.jugadorId === where.jugadorId &&
                (!where.phase || r.phase !== where.phase.not)).sort((a, b) =>
                b.departureAt.getTime() - a.departureAt.getTime() || b.id.localeCompare(a.id))[0] ?? null);
            },
            async create({ data }) {
              check();
              assert.equal([...draftLedger.values()].some((r) => r.requestId === data.requestId), false);
              assert.equal([...draftLedger.values()].some((r) => r.jugadorId === data.jugadorId && r.phase !== "completed"), false);
              const row = { ...structuredClone(data), enemy: data.enemy === Prisma.DbNull ? null : structuredClone(data.enemy) };
              draftLedger.set(row.id, row);
              return structuredClone(row);
            },
            async update({ where, data }) {
              check();
              if (failCompletion && data.phase === "completed") {
                failCompletion = false;
                throw new Error("Simulated ledger write failure after balance updates");
              }
              const r = draftLedger.get(where.id);
              assert.ok(r);
              Object.assign(r, structuredClone(data));
              return structuredClone(r);
            },
          },
        };
        const result = await work(tx);
        rows = draft;
        ledger = draftLedger;
        return result;
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
  const http = loadSource("src/lib/mundo/http.ts", {
    "@/lib/prisma": { prisma }, "@/lib/auth": { async getAuthenticatedUser() { return authenticated; } },
  });
  const jugador = loadSource("src/lib/mundo/jugador.ts", {
    "@/lib/prisma": { prisma }, "@/shared/world": world, "./geo": geo, "./http": http,
    "./travel": { loadMobility() { throw new Error("Expeditions must not call mobility or sync"); } },
  });
  const rules = loadSource("src/lib/mundo/expeditionRules.ts", { "./geo": geo, "./http": http });
  const service = loadSource("src/lib/mundo/expeditions.ts", {
    "./geo": geo, "./http": http, "./jugador": jugador, "./expeditionRules": rules,
  });
  const route = loadSource("src/app/api/mundo/expediciones/route.ts", {
    "@/lib/mundo/http": http, "@/lib/mundo/expeditions": service,
  });
  return {
    ...service, rules, route, progressToken: jugador.progressToken, initial,
    row: (id = initial.id) => rows.get(id), ledger: () => [...ledger.values()],
    remove: (id) => rows.delete(id), setAuthenticated: (value) => { authenticated = value; },
    failCompletion: () => { failCompletion = true; },
  };
}

async function rejectsCode(promise, status, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.status, status); assert.equal(error.code, code); assert.ok(error.message); return true;
  });
}
async function start(h, kind = "normal", requestId = randomUUID()) {
  const mission = (await h.loadExpeditions(h.initial.usuarioId)).missions.find((m) => m.kind === kind);
  assert.ok(mission);
  const request = { action: "start", missionId: mission.id, requestId };
  return { snapshot: await h.mutateExpeditions(h.initial.usuarioId, request), request };
}
async function attack(h, snapshot) {
  return h.mutateExpeditions(h.initial.usuarioId, { action: "attack", expeditionId: snapshot.active.id, version: snapshot.active.version });
}
async function victory(h, snapshot) {
  for (let turn = 0; snapshot.active.phase === "battle" && turn < 100; turn++) snapshot = await attack(h, snapshot);
  assert.equal(snapshot.active.outcome, "victory");
  return snapshot;
}

test("Shared contract: pure positions, all phases, endpoints and antimeridian", () => {
  const base = Object.freeze({ origin: Object.freeze({ lat: 10, lng: 179 }), mission: Object.freeze({ lat: 20, lng: -179 }), departureAt: 100, arrivalAt: 200, returnDepartureAt: 300, returnArrivalAt: 400, phase: "outbound" });
  assert.deepEqual(contract.expeditionPosition(base, 0), { lat: 10, lng: 179, progress: 0 });
  assert.deepEqual(contract.expeditionPosition(base, 150), { lat: 15, lng: -180, progress: 0.5 });
  assert.deepEqual(contract.expeditionPosition(base, Infinity), { lat: 20, lng: -179, progress: 1 });
  assert.deepEqual(contract.expeditionPosition(base, NaN), { lat: 10, lng: 179, progress: 0 });
  assert.deepEqual(contract.expeditionPosition({ ...base, phase: "battle" }, 0), { lat: 20, lng: -179, progress: 1 });
  assert.deepEqual(contract.expeditionPosition({ ...base, phase: "returning" }, 350), { lat: 15, lng: -180, progress: 0.5 });
  assert.deepEqual(contract.expeditionPosition({ ...base, phase: "returning" }, 500), { lat: 10, lng: 179, progress: 1 });
  assert.deepEqual(contract.expeditionPosition({ ...base, phase: "completed" }, 0), { lat: 10, lng: 179, progress: 1 });
  assert.equal(contract.expeditionPosition({ ...base, arrivalAt: 100 }, 100).progress, 1);
});

test("Deterministic hourly catalog: 3 normal, 1 elite, nearby trade, 0.5–3km and 7km bounds", () => {
  const { rules } = harness();
  assert.equal(rules.EXPEDITION_SPEED_KMH, 60);
  assert.equal(rules.MIN_EXPEDITION_DURATION_MS, 5000);
  assert.equal(rules.ELITE_COOLDOWN_MS, 84_600_000);
  assert.equal(rules.expeditionDurationMs(0), 5000);
  assert.equal(rules.expeditionDurationMs(1), 60_000);
  const hour = Math.floor(NOW / rules.EXPEDITION_CATALOG_PERIOD_MS) * rules.EXPEDITION_CATALOG_PERIOD_MS;
  for (const origin of [{ lat: 40, lng: -3 }, { lat: 0, lng: 179.999 }, { lat: 85, lng: 180 }, { lat: -85, lng: -180 }]) {
    const catalog = rules.generateExpeditionMissions(origin, hour);
    assert.deepEqual(catalog, rules.generateExpeditionMissions(origin, hour + 3_599_999));
    assert.notDeepEqual(catalog, rules.generateExpeditionMissions(origin, hour + 3_600_000));
    assert.equal(catalog.filter((m) => m.kind === "normal").length, 3);
    assert.equal(catalog.filter((m) => m.kind === "elite").length, 1);
    for (const m of catalog) {
      assert.ok(m.distanceKm >= 0.5 - 1e-8 && m.distanceKm <= 3 + 1e-8);
      assert.ok(rules.validExpeditionCoordinates(m));
      assert.equal(m.gold, Math.round((m.kind === "elite" ? 60 : 15) + m.distanceKm * (m.kind === "elite" ? 10 : 5)));
      assert.equal(m.experience, m.kind === "elite" ? 75 : 25);
      assert.equal(m.durationMs, rules.expeditionDurationMs(m.distanceKm));
    }
  }
  const target = { playerId: randomUUID(), baseName: "Vecino", lat: 40.01, lng: -3 };
  const missions = rules.generateExpeditionMissions({ lat: 40, lng: -3 }, NOW, [target, target, { ...target, playerId: randomUUID(), lat: 42 }]);
  const trade = missions.filter((m) => m.kind === "trade");
  assert.equal(trade.length, 1); assert.equal(trade[0].targetPlayerId, target.playerId); assert.equal(trade[0].gold % 4, 0);
});

test("Pure combat and level growth mirror Novato, minimum damage and no retaliation after lethal hit", () => {
  const { rules } = harness();
  assert.deepEqual(rules.expeditionCombatStats(3), { attack: 10, defense: 7 });
  assert.equal(rules.expeditionEnemy("trade", 1), null);
  const spider = rules.expeditionEnemy("normal", 1);
  assert.equal(spider.maxHealth, 14); assert.equal(spider.attack, 1);
  const ogre = rules.expeditionEnemy("elite", 1);
  assert.equal(ogre.maxHealth, 35); assert.equal(ogre.attack, 3); assert.equal(ogre.defense, 3);
  assert.equal(rules.expeditionAttack(1, 4, 8, 5, spider).outcome, "victory");
  assert.equal(rules.expeditionAttack(1, 35, 8, 5, ogre).outcome, "defeat");
  assert.deepEqual(rules.expeditionRewardProgress({ nivel: 1, experiencia: 90, oro: 100, saludActual: 30, saludMaxima: 100 }, 20, 225), {
    nivel: 4, experiencia: 15, oro: 120, saludActual: 60, saludMaxima: 130,
  });
});

test("Payload strict keys, safe versions, UUIDs and bounded mission ids; no client stats/times/rewards", async () => {
  const h = harness();
  for (const body of [null, [], "status", {}, { action: "cancel" }, { action: "status", gold: 1 }, { action: "status", version: 0 }]) {
    await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, body), 400, "invalid_body");
  }
  for (const missionId of [null, 3, "", "x".repeat(129)]) {
    await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action: "start", missionId, requestId: randomUUID() }), 400, "invalid_request");
  }
  for (const requestId of [null, 1, "uuid", "x".repeat(1000), `${randomUUID()}x`]) {
    await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action: "start", missionId: "m", requestId }), 400, "invalid_request");
  }
  for (const version of [null, "0", -1, 0.1, NaN, Infinity, 2_147_483_648]) {
    for (const action of ["attack", "flee"]) await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action, expeditionId: randomUUID(), version }), 400, "invalid_request");
  }
  for (const expeditionId of [null, 1, "uuid", "x".repeat(129)]) {
    await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action: "attack", expeditionId, version: 0 }), 400, "invalid_request");
  }
  for (const body of [
    { action: "start", missionId: "m" }, { action: "attack", expeditionId: randomUUID() },
    { action: "flee", expeditionId: randomUUID(), version: 0, outcome: "victory" },
  ]) await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, body), 400, "invalid_body");
  for (const key of ["gold", "experience", "origin", "enemy", "attack", "defense", "departureAt", "targetPlayerId", "outcome", "rewardGranted"]) {
    await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action: "start", missionId: "m", requestId: randomUUID(), [key]: 1 }), 400, "invalid_body");
  }
  assert.equal(h.ledger().length, 0);
});

test("Status fresh exact DTO, imported token, missing player/base and invalid saved coordinates", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  const before = structuredClone(h.row());
  const s = await h.loadExpeditions(h.initial.usuarioId);
  assert.deepEqual(Object.keys(s).sort(), ["active", "eliteAvailableAt", "missions", "profile", "progressToken", "rewardRevision", "serverNow"]);
  assert.equal(s.serverNow, NOW); assert.equal(s.active, null); assert.equal(s.eliteAvailableAt, 0); assert.equal(s.rewardRevision, 0);
  assert.equal(s.progressToken, h.progressToken(h.row(), h.row().usuario.base));
  assert.deepEqual(s.profile, { id: before.id, name: before.nombre, sex: "chico", characterClass: "Novato", level: 1, experience: 0, gold: 100, currentHealth: 40, maxHealth: 100 });
  assert.deepEqual(h.row(), before);
  await rejectsCode(h.loadExpeditions(randomUUID()), 404, "no_player");
  h.row().usuario.base.lat = NaN;
  await rejectsCode(h.loadExpeditions(h.initial.usuarioId), 500, "invalid_coordinates");
  h.row().usuario.base = null;
  await rejectsCode(h.loadExpeditions(h.initial.usuarioId), 404, "no_player");
});

test("Start persists full geometry, snapshots server combat stats and serializes idempotent concurrent retries", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const initial = player(); initial.nivel = 3;
  const h = harness(initial);
  const mission = (await h.loadExpeditions(initial.usuarioId)).missions[0];
  const request = { action: "start", missionId: mission.id, requestId: randomUUID() };
  const [a, b] = await Promise.all([h.mutateExpeditions(initial.usuarioId, request), h.mutateExpeditions(initial.usuarioId, request)]);
  assert.deepEqual(a, b); assert.equal(h.ledger().length, 1);
  assert.equal(a.active.phase, "outbound"); assert.equal(a.active.version, 0);
  assert.equal(a.active.departureAt, NOW); assert.equal(a.active.arrivalAt, NOW + mission.durationMs);
  assert.deepEqual(a.active.origin, { lat: 40, lng: -3 }); assert.deepEqual(a.active.mission, mission);
  assert.equal(a.active.enemy.maxHealth, 18); assert.equal(a.active.playerHealth, 40); assert.equal(a.active.playerMaxHealth, 100);
  assert.equal(h.ledger()[0].attack, 10); assert.equal(h.ledger()[0].defense, 7);
  assert.deepEqual(Object.keys(a.active).sort(), ["arrivalAt", "departureAt", "enemy", "enemyHealth", "id", "log", "mission", "origin", "outcome", "phase", "playerHealth", "playerMaxHealth", "returnArrivalAt", "returnDepartureAt", "rewardGranted", "version"]);
  await rejectsCode(h.mutateExpeditions(initial.usuarioId, { ...request, requestId: randomUUID() }), 409, "expedition_active");
  await rejectsCode(h.mutateExpeditions(initial.usuarioId, { ...request, missionId: "different" }), 409, "request_conflict");
  assert.deepEqual(await h.mutateExpeditions(initial.usuarioId, { ...request, requestId: request.requestId.toUpperCase() }), a);
});

test("Unique global request UUID cannot be reused by another player, nor can another owner attack", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const other = player("otro", 40.01);
  const h = harness(player(), [other]);
  const { snapshot: s, request } = await start(h);
  await rejectsCode(h.mutateExpeditions(other.usuarioId, request), 409, "request_conflict");
  await rejectsCode(h.mutateExpeditions(other.usuarioId, { action: "attack", expeditionId: s.active.id, version: 0 }), 404, "expedition_not_found");
  assert.equal(h.ledger().length, 1);
});

test("Concurrent starts with different UUIDs create exactly one active expedition", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness(); const mission = (await h.loadExpeditions(h.initial.usuarioId)).missions[0];
  const results = await Promise.allSettled([1, 2, 3].map(() => h.mutateExpeditions(h.initial.usuarioId, {
    action: "start", missionId: mission.id, requestId: randomUUID(),
  })));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  for (const r of results.filter((r) => r.status === "rejected")) assert.equal(r.reason.code, "expedition_active");
  assert.equal(h.ledger().length, 1); assert.equal(h.row().oro, 100);
});

test("Only saved own base scene, no return cart, positive health; null location allowed", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  for (const sceneId of ["exterior-world", "town-hall-interior", "tavern-interior", "embassy-interior", "other-base"]) {
    const h = harness(); h.row().ubicacion = { sceneId, x: 1, y: 1 };
    await rejectsCode(start(h), 409, "not_in_base");
  }
  for (const location of [null, { sceneId: "base", x: 480, y: 768, direction: "up" }]) {
    const h = harness(); h.row().ubicacion = location;
    assert.equal((await start(h)).snapshot.active.phase, "outbound");
  }
  const h = harness(); h.row().viajeRegreso = { arrivalAt: NOW + 1000 };
  await rejectsCode(start(h), 409, "travel_active");
  h.row().viajeRegreso = null; h.row().saludActual = 0;
  await rejectsCode(start(h), 409, "player_dead");
});

test("Hourly catalog expires for new starts but not replay or persisted enemy/mission", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const stale = (await h.loadExpeditions(h.initial.usuarioId)).missions[0];
  now += 3_600_000;
  await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action: "start", missionId: stale.id, requestId: randomUUID() }), 404, "mission_unavailable");
  const { snapshot: s, request } = await start(h);
  now += 3_600_000;
  const replay = await h.mutateExpeditions(h.initial.usuarioId, request);
  assert.equal(replay.active.id, s.active.id); assert.equal(replay.active.phase, "battle");
  assert.deepEqual(replay.active.mission, s.active.mission); assert.deepEqual(replay.active.enemy, s.active.enemy);
  assert.notDeepEqual(replay.missions, s.missions); assert.equal(h.ledger().length, 1);
});

test("Exact outbound arrival advances version and commits despite stale attack rejection", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const { snapshot: s } = await start(h);
  await rejectsCode(attack(h, s), 409, "not_in_battle");
  now = s.active.arrivalAt - 1; assert.equal((await h.loadExpeditions(h.initial.usuarioId)).active.phase, "outbound");
  now++;
  await rejectsCode(attack(h, s), 409, "expedition_conflict");
  const arrived = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(arrived.active.phase, "battle"); assert.equal(arrived.active.version, 1);
  assert.equal(h.ledger()[0].phase, "battle");
});

test("Versioned server combat, persistent damage, victory return preserves battle and rewards once at exact arrival", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const initial = player(); initial.experiencia = 90;
  const h = harness(initial); const { snapshot: s, request } = await start(h);
  now = s.active.arrivalAt;
  const battle = await h.loadExpeditions(initial.usuarioId);
  const first = await attack(h, battle);
  assert.equal(first.active.enemyHealth, 6); assert.equal(first.active.playerHealth, 39);
  assert.equal(h.row().saludActual, 39); assert.equal(first.active.version, 2);
  await rejectsCode(attack(h, battle), 409, "expedition_conflict");
  const won = await victory(h, first);
  assert.equal(won.active.phase, "returning"); assert.equal(won.active.enemyHealth, 0);
  assert.equal(won.active.playerHealth, 39); assert.equal(won.active.playerMaxHealth, 100);
  assert.equal(won.active.version, 3); assert.match(won.active.log, /Victoria/);
  assert.equal(won.profile.gold, 100); assert.equal(won.profile.experience, 90); assert.equal(won.active.rewardGranted, false);
  assert.equal(won.active.returnDepartureAt, now); assert.equal(won.active.returnArrivalAt, now + s.active.mission.durationMs);
  await rejectsCode(attack(h, won), 409, "not_in_battle");
  now = won.active.returnArrivalAt - 1;
  assert.equal((await h.loadExpeditions(initial.usuarioId)).active.phase, "returning");
  now++;
  const [done, repeated] = await Promise.all([h.loadExpeditions(initial.usuarioId), h.loadExpeditions(initial.usuarioId)]);
  assert.deepEqual(done, repeated);
  assert.equal(done.active.phase, "completed"); assert.equal(done.active.outcome, "victory"); assert.equal(done.active.rewardGranted, true);
  assert.equal(done.profile.gold, 100 + s.active.mission.gold); assert.equal(done.profile.level, 2); assert.equal(done.profile.experience, 15);
  assert.equal(done.profile.maxHealth, 110); assert.equal(done.profile.currentHealth, 49);
  assert.equal(done.active.playerHealth, 39); assert.equal(done.active.playerMaxHealth, 100); assert.equal(done.active.enemyHealth, 0);
  assert.equal(done.rewardRevision, won.rewardRevision + 1); assert.notEqual(done.progressToken, won.progressToken);
  assert.equal(h.row().ultimaEliteExitosa, null);
  assert.deepEqual(await h.mutateExpeditions(initial.usuarioId, request), done);
  const second = await start(h); assert.notEqual(second.snapshot.active.id, done.active.id);
  assert.equal((await h.mutateExpeditions(initial.usuarioId, request)).active.id, second.snapshot.active.id);
  assert.equal(h.ledger().length, 2); assert.equal(h.row().rewardRevision, done.rewardRevision);
});

test("Concurrent attacks accept only one matching version, exactly one retaliation", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const { snapshot: s } = await start(h); now = s.active.arrivalAt;
  const battle = await h.loadExpeditions(h.initial.usuarioId);
  const results = await Promise.allSettled([attack(h, battle), attack(h, battle)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.code, "expedition_conflict");
  assert.equal(h.ledger()[0].enemyHealth, 6); assert.equal(h.row().saludActual, 39);
});

test("Flee/defeat return without rewards or elite cooldown, preserve final combat and reject replay", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  for (const outcome of ["fled", "defeat"]) {
    const h = harness(); if (outcome === "defeat") h.row().saludActual = 1;
    const { snapshot: s } = await start(h, "elite"); now = s.active.arrivalAt;
    const battle = await h.loadExpeditions(h.initial.usuarioId);
    const back = outcome === "fled" ? await h.mutateExpeditions(h.initial.usuarioId, { action: "flee", expeditionId: battle.active.id, version: battle.active.version }) : await attack(h, battle);
    assert.equal(back.active.outcome, outcome); assert.equal(back.active.phase, "returning");
    assert.equal(back.eliteAvailableAt, 0); assert.equal(h.row().ultimaEliteExitosa, null);
    assert.ok(back.active.enemyHealth > 0);
    now = back.active.returnArrivalAt;
    await rejectsCode(attack(h, back), 409, "expedition_conflict");
    const done = await h.loadExpeditions(h.initial.usuarioId);
    assert.equal(done.active.phase, "completed"); assert.equal(done.active.outcome, outcome); assert.equal(done.active.rewardGranted, false);
    assert.equal(done.profile.gold, 100); assert.equal(done.profile.experience, 0); assert.equal(done.rewardRevision, outcome === "defeat" ? 1 : 0);
    assert.equal(done.profile.currentHealth, outcome === "defeat" ? 0 : 40);
  }
});

test("Elite cooldown starts at victory, not return: 23h30 boundary, failure/flee do not set it", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const { snapshot: s } = await start(h, "elite"); now = s.active.arrivalAt;
  const won = await victory(h, await h.loadExpeditions(h.initial.usuarioId));
  const victoryTime = now;
  assert.equal(h.row().ultimaEliteExitosa.getTime(), victoryTime);
  assert.equal(won.eliteAvailableAt, victoryTime + 84_600_000);
  assert.ok(won.rewardRevision > 0);
  now = won.active.returnArrivalAt;
  const done = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(done.profile.experience, 75); assert.equal(done.eliteAvailableAt, won.eliteAvailableAt);
  await rejectsCode(start(h, "elite"), 409, "elite_cooldown");
  now = won.eliteAvailableAt - 1;
  await rejectsCode(start(h, "elite"), 409, "elite_cooldown");
  now++;
  assert.equal((await start(h, "elite")).snapshot.active.phase, "outbound");
  assert.equal(h.ledger().length, 2);
});

test("Trade radius includes antimeridian, excludes >7km and only persistent player bases", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const own = player("propio", 0, 179.99), close = player("cerca", 0, -179.99), far = player("lejos", 0, -179.8);
  const h = harness(own, [close, far]);
  const missions = (await h.loadExpeditions(own.usuarioId)).missions.filter((m) => m.kind === "trade");
  assert.equal(missions.length, 1); assert.equal(missions[0].targetPlayerId, close.id);
  assert.ok(missions[0].distanceKm < 7);
});

test("Trade resolves both legs offline, grants sender XP/gold and exactly recipient 25% once, increments both revisions", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const recipient = player("receptor", 40.01);
  const h = harness(player(), [recipient]);
  const tokenRecipient = h.progressToken(h.row(recipient.id), h.row(recipient.id).usuario.base);
  const { snapshot: s, request } = await start(h, "trade");
  assert.equal(s.active.enemy, null); assert.equal(s.active.enemyHealth, 0);
  now = s.active.arrivalAt;
  const back = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(back.active.phase, "returning"); assert.equal(back.active.outcome, "trade");
  assert.equal(back.active.returnDepartureAt, s.active.arrivalAt); assert.equal(h.row(recipient.id).oro, 100);
  now = s.active.arrivalAt + s.active.mission.durationMs + 86_400_000;
  const done = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(done.active.phase, "completed"); assert.equal(done.active.rewardGranted, true);
  assert.equal(done.profile.gold, 100 + s.active.mission.gold); assert.equal(done.profile.experience, 25); assert.equal(done.rewardRevision, 1);
  assert.equal(h.row(recipient.id).oro, 100 + s.active.mission.gold * 0.25); assert.equal(h.row(recipient.id).rewardRevision, 1);
  assert.equal(h.row(recipient.id).experiencia, 0); assert.equal(h.row(recipient.id).saludActual, 40);
  assert.notEqual(tokenRecipient, h.progressToken(h.row(recipient.id), h.row(recipient.id).usuario.base));
  for (let retry = 0; retry < 3; retry++) await h.mutateExpeditions(h.initial.usuarioId, request);
  assert.equal(h.row(recipient.id).rewardRevision, 1); assert.equal(h.row().rewardRevision, 1);
  const h2 = harness(player(), [recipient]); const second = await start(h2, "trade");
  now = second.snapshot.active.arrivalAt + second.snapshot.active.mission.durationMs;
  assert.equal((await h2.loadExpeditions(h2.initial.usuarioId)).active.phase, "completed", "One request resolves both legs without an intermediate status");
});

test("Reward ledger write failure rolls back sender, recipient, both legs, and retry grants once", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const recipient = player("receptor", 40.01); const h = harness(player(), [recipient]);
  const { snapshot: s } = await start(h, "trade");
  const before = structuredClone(h.row()), otherBefore = structuredClone(h.row(recipient.id));
  now = s.active.arrivalAt + s.active.mission.durationMs;
  h.failCompletion();
  await assert.rejects(h.loadExpeditions(h.initial.usuarioId), /Simulated ledger write failure/);
  assert.deepEqual(h.row(), before); assert.deepEqual(h.row(recipient.id), otherBefore);
  assert.equal(h.ledger()[0].phase, "outbound"); assert.equal(h.ledger()[0].rewardGranted, false);
  const done = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(done.active.rewardGranted, true); assert.equal(h.row().rewardRevision, 1); assert.equal(h.row(recipient.id).rewardRevision, 1);
});

test("Resolved return commits rewards despite rejected mission; deleted recipient does not strand sender", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const recipient = player("receptor", 40.01); const h = harness(player(), [recipient]);
  const { snapshot: s } = await start(h, "trade"); h.remove(recipient.id);
  now = s.active.arrivalAt + s.active.mission.durationMs;
  await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action: "start", missionId: "forged", requestId: randomUUID() }), 404, "mission_unavailable");
  assert.equal(h.ledger()[0].phase, "completed"); assert.equal(h.row().oro, 100 + s.active.mission.gold); assert.equal(h.row().rewardRevision, 1);
  assert.equal((await h.loadExpeditions(h.initial.usuarioId)).rewardRevision, 1);
});

test("Thin GET/POST authentication and exact result envelopes, JSON/field rejection, no-store", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  const request = (body) => new Request("http://localhost/api/mundo/expediciones", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  h.setAuthenticated(null);
  for (const response of [await h.route.GET(), await h.route.POST(request({ action: "status" }))]) {
    assert.equal(response.status, 401); const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ["code", "message", "ok"]); assert.equal(body.ok, false); assert.equal(body.code, "unauthenticated");
  }
  h.setAuthenticated({ id: h.initial.usuarioId });
  const status = await h.route.GET(); assert.equal(status.status, 200); assert.equal(status.headers.get("cache-control"), "no-store");
  const body = await status.json(); assert.deepEqual(Object.keys(body).sort(), ["ok", "snapshot"]); assert.equal(body.ok, true);
  const good = await h.route.POST(request({ action: "status" })); assert.deepEqual(await good.json(), body);
  for (const payload of [null, [], { action: "status", success: true }]) {
    const response = await h.route.POST(request(payload)); assert.equal(response.status, 400); assert.equal((await response.json()).ok, false);
  }
  const malformed = await h.route.POST(new Request("http://localhost", { method: "POST", body: "{" }));
  assert.equal(malformed.status, 400); assert.equal((await malformed.json()).code, "invalid_body");
  const first = await h.route.POST(request({ action: "start", missionId: body.snapshot.missions[0].id, requestId: randomUUID() }));
  assert.equal(first.status, 200); assert.equal((await first.json()).snapshot.active.phase, "outbound");
  const conflict = await h.route.POST(request({ action: "start", missionId: body.snapshot.missions[0].id, requestId: randomUUID() }));
  assert.equal(conflict.status, 409); assert.equal((await conflict.json()).code, "expedition_active");
});

test("HTTP internal failures return safe exact error and roll back; missing player is 404", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const recipient = player("receptor", 40.01); const h = harness(player(), [recipient]);
  const { snapshot: s } = await start(h, "trade"); now = s.active.arrivalAt + s.active.mission.durationMs;
  h.failCompletion();
  t.mock.method(console, "error", () => {});
  const response = await h.route.GET();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, code: "internal", message: "Error interno del servidor." });
  assert.equal(h.row().oro, 100); assert.equal(h.row(recipient.id).oro, 100); assert.equal(h.ledger()[0].phase, "outbound");
  h.setAuthenticated({ id: randomUUID() });
  const missing = await h.route.GET(); assert.equal(missing.status, 404); assert.equal((await missing.json()).code, "no_player");
});