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
const combat = loadSource("src/shared/combat.ts");
const world = loadSource("src/shared/world.ts");
const enemyCatalog = loadSource("src/shared/enemies.ts");
const geo = loadSource("src/lib/mundo/geo.ts", { "@/lib/utils": loadSource("src/lib/utils.ts") });
const content = loadSource("src/lib/mundo/expeditionContent.ts");
const worldPosition = loadSource("src/shared/worldPosition.ts");
function player(name = "propio", lat = 40, lng = -3, embassy = true) {
  const id = randomUUID();
  const usuarioId = randomUUID();
  return {
    id, usuarioId, nombre: name, sexo: "chico", clase: "Novato", nivel: 1, experiencia: 0,
    oro: 100, saludActual: 40, saludMaxima: 100, ultimoVisto: new Date(NOW), ubicacion: null,
    viajeRegreso: null, ubicacionRevision: 0, ultimaEliteExitosa: null, rewardRevision: 0,
    inventarioMundo: [],
    usuario: { base: { id: randomUUID(), usuarioId, nombre: name, lat, lng, edificios: [{ type: "town-hall", level: 1 }], embajada: embassy } },
  };
}

function harness(initial = player(), others = []) {
  let rows = new Map([initial, ...others].map((p) => [p.id, structuredClone(p)]));
  let ledger = new Map();
  let encounters = new Map();
  const partyMemberships = new Map();
  let queue = Promise.resolve();
  let authenticated = { id: initial.usuarioId };
  let failCompletion = false;
  let failReturn = false;
  const prisma = {
    $transaction(work) {
      const operation = queue.then(async () => {
        const draft = structuredClone(rows);
        const draftLedger = structuredClone(ledger);
        const draftEncounters = structuredClone(encounters);
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
              assert.equal(Object.hasOwn(data, "inventario"), false, "Never write legacy inventory");
              for (const [key, value] of Object.entries(data)) {
                p[key] = value && typeof value === "object" && "increment" in value ? p[key] + value.increment : structuredClone(value);
              }
              return structuredClone(p);
            },
          },
          base: {
            async findMany({ where }) {
              check();
              return [...draft.values()].filter((p) => {
                const b = p.usuario.base;
                return b && b.id !== where.id.not && (!where.embajada || b.embajada) &&
                  (!where.lat || b.lat >= where.lat.gte && b.lat <= where.lat.lte);
              }).map((p) => ({ ...structuredClone(p.usuario.base), usuario: { jugador: structuredClone(p) } }));
            },
          },
          expedicionMundo: {
            async findUnique({ where }) {
              check();
              return structuredClone([...draftLedger.values()].find((r) => where.requestId ? r.requestId === where.requestId : r.id === where.id) ?? null);
            },
            async findFirst({ where }) {
              check();
              return structuredClone([...draftLedger.values()].filter((r) => (!where.jugadorId || r.jugadorId === where.jugadorId) &&
                (!where.participantes || r.participants?.some((p) => p.jugadorId === where.participantes.some.jugadorId)) &&
                (!where.phase || r.phase !== where.phase.not)).sort((a, b) =>
                b.departureAt.getTime() - a.departureAt.getTime() || b.id.localeCompare(a.id))[0] ?? null);
            },
            async count({ where }) {
              check();
              const playerId = where.OR[0].jugadorId;
              const from = where.returnArrivalAt.gte.getTime();
              return [...draftLedger.values()].filter((row) => row.phase === where.phase && row.returnArrivalAt instanceof Date &&
                row.returnArrivalAt.getTime() >= from && (row.jugadorId === playerId ||
                  row.participants?.some((participant) => participant.jugadorId === playerId))).length;
            },
            async create({ data }) {
              check();
              assert.equal(Object.hasOwn(data, "awardedLoot"), false, "DTO field is not a Prisma column");
              assert.ok(data.enemyTurnAt === null || data.enemyTurnAt instanceof Date);
              assert.equal(data.lastAction, Prisma.DbNull);
              assert.equal([...draftLedger.values()].some((r) => r.requestId === data.requestId), false);
              assert.equal([...draftLedger.values()].some((r) => r.jugadorId === data.jugadorId && r.phase !== "completed"), false);
              const row = { botin: [], turn: "player", playerSpeed: 5, enemyTurnAt: null, lastAction: null,
                ...structuredClone(data), enemy: data.enemy === Prisma.DbNull ? null : structuredClone(data.enemy),
                lastAction: data.lastAction === Prisma.DbNull ? null : structuredClone(data.lastAction), participants: [] };
              draftLedger.set(row.id, row);
              return structuredClone(row);
            },
            async update({ where, data }) {
              check();
              assert.equal(Object.hasOwn(data, "awardedLoot"), false);
              if (failCompletion && data.phase === "completed") {
                failCompletion = false;
                throw new Error("Simulated ledger write failure after balance updates");
              }
              if (failReturn && data.phase === "returning") {
                failReturn = false;
                throw new Error("Simulated return write failure");
              }
              if (Object.hasOwn(data, "enemyTurnAt")) assert.ok(data.enemyTurnAt === null || data.enemyTurnAt instanceof Date);
              if (data.lastAction && data.lastAction !== Prisma.DbNull) {
                assert.ok(Number.isSafeInteger(data.lastAction.id));
                assert.ok(Number.isSafeInteger(data.lastAction.at));
              }
              const r = draftLedger.get(where.id);
              assert.ok(r);
              Object.assign(r, structuredClone(data));
              if (data.lastAction === Prisma.DbNull) r.lastAction = null;
              return structuredClone(r);
            },
          },
          miembroParty: {
            async findUnique({ where }) {
              check();
              const ids = partyMemberships.get(where.jugadorId);
              if (!ids) return null;
              const members = ids.map((id) => draft.get(id)).filter(Boolean).map((jugador) => ({ jugador: structuredClone(jugador) }));
              return { party: { liderId: ids[0], miembros: members } };
            },
          },
          combateExterior: {
            async findUnique({ where }) {
              check();
              const row = [...draftEncounters.values()].find((entry) => where.requestId
                ? entry.requestId === where.requestId : entry.id === where.id);
              return row ? { ...structuredClone(row), participantes: structuredClone(row.participants) } : null;
            },
            async findFirst({ where }) {
              check();
              const row = [...draftEncounters.values()].filter((row) => {
                const participantFilter = where.participantes?.some?.jugadorId;
                return (!participantFilter || row.participants.some((member) => member.jugadorId === participantFilter)) &&
                  (!where.fase || row.fase !== where.fase.not) &&
                  (!where.OR || where.OR.some((filter) => filter.fase ? row.fase !== filter.fase.not :
                    filter.completado ? row.completado && row.completado > filter.completado.gt : true));
              }).sort((a, b) => b.creado.getTime() - a.creado.getTime())[0];
              return row ? { ...structuredClone(row), participantes: structuredClone(row.participants) } : null;
            },
            async create({ data }) {
              check();
              const row = { ...structuredClone(data), participants: [] };
              draftEncounters.set(row.id, row);
              return structuredClone(row);
            },
            async update({ where, data }) {
              check();
              const row = draftEncounters.get(where.id);
              assert.ok(row);
              Object.assign(row, structuredClone(data));
              return structuredClone(row);
            },
          },
          combateExteriorParticipante: {
            async createMany({ data }) {
              check();
              const row = draftEncounters.get(data[0]?.combateId);
              assert.ok(row);
              row.participants = structuredClone(data);
              return { count: data.length };
            },
            async update({ where, data }) {
              check();
              const row = draftEncounters.get(where.combateId_jugadorId.combateId);
              const participant = row?.participants.find((member) => member.jugadorId === where.combateId_jugadorId.jugadorId);
              assert.ok(participant);
              Object.assign(participant, structuredClone(data));
              return structuredClone(participant);
            },
          },
          expedicionParticipante: {
            async findMany({ where }) {
              check();
              return structuredClone(draftLedger.get(where.expedicionId)?.participants ?? []);
            },
            async createMany({ data }) {
              check();
              const row = draftLedger.get(data[0]?.expedicionId);
              assert.ok(row);
              row.participants = structuredClone(data);
              return { count: data.length };
            },
            async update({ where, data }) {
              check();
              const row = draftLedger.get(where.expedicionId_jugadorId.expedicionId);
              const participant = row?.participants.find((p) => p.jugadorId === where.expedicionId_jugadorId.jugadorId);
              assert.ok(participant);
              Object.assign(participant, structuredClone(data));
              return structuredClone(participant);
            },
          },
        };
        const result = await work(tx);
        rows = draft;
        ledger = draftLedger;
        encounters = draftEncounters;
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
  const rules = loadSource("src/lib/mundo/expeditionRules.ts", { "./geo": geo, "./http": http, "./expeditionContent": content,
    "@/shared/enemies": enemyCatalog, "@/shared/combat": combat });
  const service = loadSource("src/lib/mundo/expeditions.ts", {
    "./geo": geo, "./http": http, "./jugador": jugador, "./expeditionRules": rules, "@/shared/combat": combat,
  });
  const worldCombat = loadSource("src/lib/mundo/worldCombat.ts", {
    "./geo": geo, "./http": http, "./expeditionRules": rules, "./jugador": jugador,
    "@/shared/enemies": enemyCatalog, "@/shared/combat": combat, "@/shared/worldPosition": worldPosition,
  });
  const route = loadSource("src/app/api/mundo/expediciones/route.ts", {
    "@/lib/mundo/http": http, "@/lib/mundo/expeditions": service,
  });
  return {
    ...service, ...worldCombat, rules, route, progressToken: jugador.progressToken, initial,
    row: (id = initial.id) => rows.get(id), ledger: () => [...ledger.values()],
    encounters: () => [...encounters.values()],
    remove: (id) => rows.delete(id), setAuthenticated: (value) => { authenticated = value; },
    failCompletion: () => { failCompletion = true; },
    failReturn: () => { failReturn = true; },
    setParty(ids) { for (const id of ids) partyMemberships.set(id, ids); },
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
async function enemyTurn(h, snapshot, setNow) {
  assert.equal(snapshot.active.turn, "enemy");
  setNow(snapshot.active.enemyTurnAt);
  const after = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(after.active.enemyHealth, snapshot.active.enemyHealth);
  const beforeTarget = snapshot.active.participants?.find((participant) => participant.playerId === after.active.lastAction.targetMemberId);
  const afterTarget = after.active.participants?.find((participant) => participant.playerId === after.active.lastAction.targetMemberId);
  if (beforeTarget && afterTarget) assert.equal(afterTarget.currentHealth, beforeTarget.currentHealth - after.active.lastAction.damage);
  if (after.active.lastAction.targetMemberId === snapshot.profile.id) {
    assert.equal(after.active.playerHealth, afterTarget.currentHealth);
  }
  assert.equal(after.active.lastAction.actor, "enemy");
  assert.equal(after.active.lastAction.at, snapshot.active.enemyTurnAt);
  assert.equal(after.active.version, snapshot.active.version + 1);
  assert.equal(after.rewardRevision, snapshot.rewardRevision + 1);
  assert.notEqual(after.active.turn, "enemy"); assert.equal(after.active.enemyTurnAt, null);
  return after;
}
async function victory(h, snapshot, setNow) {
  for (let turn = 0; snapshot.active.phase === "battle" && turn < 100; turn++) {
    if (snapshot.active.turn === "enemy") snapshot = await enemyTurn(h, snapshot, setNow);
    if (snapshot.active.phase !== "battle") break;
    const before = snapshot;
    snapshot = await attack(h, snapshot);
    assert.equal(snapshot.active.playerHealth, before.active.playerHealth, "Player attacks never retaliate simultaneously");
    assert.equal(snapshot.active.lastAction.actor, "player");
  }
  assert.equal(snapshot.active.outcome, "victory");
  return snapshot;
}

// Combat mechanics fixtures deliberately isolate damage from catalog variation.
function basicEnemy(h, kind = "normal") {
  const row = h.ledger()[0];
  row.enemy = { ...h.rules.expeditionEnemy(kind, 1, kind === "elite" ? 0 : 3), speed: 5 };
  row.enemyHealth = row.enemy.maxHealth;
}

test("Compound Spanish content, hundreds of seeds, inclusive level 1/4/50 difficulty and scalable varied rewards", () => {
  const { rules } = harness();
  assert.ok(content.EXPEDITION_PREFIXES.length >= 30);
  assert.ok(content.EXPEDITION_LOCATIONS.length >= 40);
  assert.ok(content.EXPEDITION_DESCRIPTIONS.length >= 20);
  for (const list of [content.EXPEDITION_PREFIXES, content.EXPEDITION_LOCATIONS, content.EXPEDITION_DESCRIPTIONS]) {
    assert.equal(new Set(list).size, list.length);
  }
  const names = new Set(), descriptions = new Set(), species = new Set();
  const lowRewards = [], highRewards = [];
  for (const level of [1, 4, 50]) {
    const difficulty = { normal: new Set(), elite: new Set() };
    const rewards = { normal: new Set(), elite: new Set() };
    for (let seed = 0; seed < 300; seed++) {
      const origin = { lat: 40 + seed / 10000, lng: -3 };
      const time = NOW + seed * rules.EXPEDITION_CATALOG_PERIOD_MS;
      const catalog = rules.generateExpeditionMissions(origin, time, [], level);
      assert.deepEqual(catalog, rules.generateExpeditionMissions(origin, time, [], level));
      const expectedNormalCount = rules.NORMAL_MISSION_TIERS.reduce((sum, tier) =>
        sum + Math.min(tier.count, Math.max(1, level + tier.maxOffset) - Math.max(1, level + tier.minOffset) + 1), 0);
      assert.equal(catalog.length, expectedNormalCount + 1);
      assert.equal(catalog.filter((m) => m.kind === "normal").length, expectedNormalCount);
      assert.equal(catalog.filter((m) => m.kind === "elite").length, 1);
      assert.equal(new Set(catalog.map((m) => m.name)).size, catalog.length);
      for (const m of catalog) {
        assert.match(m.name, /^(El|La|Las) .+/);
        assert.ok(m.description.length > 30);
        const tierHours = m.kind === "elite" ? null : [0.5, 1, 3, 9, 24]
          .find((hours) => m.distanceKm >= hours * 5.4 && m.distanceKm <= hours * 6.6);
        if (m.kind === "normal") assert.ok(tierHours, `Unexpected normal-mission distance ${m.distanceKm}`);
        const offsets = tierHours === 0.5 ? [0, 2] : tierHours === 1 || tierHours === 3 ? [-2, 3] : [-2, 4];
        const range = m.kind === "elite"
          ? enemyCatalog.enemyLevelRange(level, 1)
          : { min: Math.max(1, level + offsets[0]), max: Math.max(Math.max(1, level + offsets[0]), level + offsets[1]) };
        assert.ok(m.enemyLevel >= range.min && m.enemyLevel <= range.max);
        assert.ok(Number.isInteger(m.enemyLevel));
        assert.equal(m.enemy.level, m.enemyLevel);
        assert.ok(m.id.includes(`:${level}:`));
        assert.ok(m.id.length <= 128);
        assert.ok(fs.existsSync(path.resolve(__dirname, "../public", m.enemy.sprite.slice(1))));
        if (m.kind === "elite") assert.ok(m.distanceKm >= 5 && m.distanceKm <= 6.1);
        else assert.ok(m.distanceKm >= tierHours * 5.4 - 1e-8 && m.distanceKm <= tierHours * 6.6 + 1e-8);
        if (m.kind === "normal") assert.ok(m.durationMs >= tierHours * 30 * 60_000 * 0.9 && m.durationMs <= tierHours * 30 * 60_000 * 1.1 + 1);
        const bounds = rules.expeditionRewardBounds(m.kind, m.distanceKm, m.enemyLevel);
        assert.ok(Number.isInteger(m.gold) && m.gold >= bounds.gold.min && m.gold <= bounds.gold.max);
        assert.ok(Number.isInteger(m.experience) && m.experience >= bounds.experience.min && m.experience <= bounds.experience.max);
        assert.deepEqual(m.enemy, rules.expeditionEnemy(m.kind, m.enemyLevel,
          // Identify the persisted species variant without coupling to the hash implementation.
          Array.from({ length: (m.kind === "elite" ? 4 : (content.EXPEDITION_ENEMIES.length - 1) * 4) }, (_, i) => i).find((i) => rules.expeditionEnemy(m.kind, m.enemyLevel, i).name === m.enemy.name)));
        assert.equal(m.loot.length, 3);
        assert.deepEqual(m.loot.map((i) => i.id), ["world-potion", "world-ration", "world-relic"]);
        assert.ok(m.loot.every((i) => i.chance > 0 && i.chance < 100 && Number.isInteger(i.quantity) && i.quantity > 0));
        difficulty[m.kind].add(m.enemyLevel); rewards[m.kind].add(`${m.gold}:${m.experience}`);
        names.add(m.name); descriptions.add(m.description); species.add(m.enemy.name);
        if (level === 1) lowRewards.push(m.gold);
        if (level === 50) highRewards.push(m.gold);
      }
    }
    for (const kind of ["normal", "elite"]) {
      assert.ok(difficulty[kind].size >= 5, "Daily pseudo-randomized difficulty bands offer a variety of levels");
      assert.ok(rewards[kind].size > 100);
    }
  }
  assert.ok(names.size > 900); assert.ok(descriptions.size > 10);
  assert.equal(species.size, (content.EXPEDITION_ENEMIES.length - 1) * 4 + 4);
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(average(highRewards) > average(lowRewards), "Higher-level catalogs should award higher average gold despite overlapping normal/elite bands");
  const origin = { lat: 40, lng: -3 };
  const a = rules.generateExpeditionMissions(origin, NOW, [], 1), b = rules.generateExpeditionMissions(origin, NOW, [], 4);
  assert.ok(a.every((m) => !b.some((n) => n.id === m.id)));
});

test("Reward configuration uses inclusive integer bounds and commerce retains prior gold/XP/share at all levels", () => {
  const { rules } = harness();
  for (const kind of ["normal", "elite"]) for (const level of [1, 4, 50]) {
    const config = rules.EXPEDITION_REWARD_RULES[kind], km = 1.5;
    const gold = config.baseGold + km * config.goldPerKm + (level - 1) * config.goldPerLevel;
    const xp = config.baseExperience + km * config.experiencePerKm + (level - 1) * config.experiencePerLevel;
    assert.deepEqual(rules.expeditionRewardBounds(kind, km, level), {
      gold: { min: Math.floor(gold * (1 - config.variation)), max: Math.ceil(gold * (1 + config.variation)) },
      experience: { min: Math.floor(xp * (1 - config.variation)), max: Math.ceil(xp * (1 + config.variation)) },
    });
  }
  const target = { playerId: randomUUID(), baseName: "Vecino", lat: 40.01, lng: -3 };
  for (const level of [1, 4, 50]) {
    const trade = rules.generateExpeditionMissions({ lat: 40, lng: -3 }, NOW, [target], level).find((m) => m.kind === "trade");
    assert.equal(trade.gold, 4 * Math.ceil((20 + trade.distanceKm * 5) / 4));
    assert.equal(trade.gold / 4, Math.round(trade.gold / 4)); assert.equal(trade.experience, 25);
    assert.equal(trade.enemy, undefined); assert.equal(trade.loot, undefined); assert.equal(trade.enemyLevel, undefined);
  }
});

test("Pure loot normalization, merge, keyed deterministic probability and zero/100 percent boundaries", () => {
  const { rules } = harness();
  const potion = { id: "world-potion", name: "Poción curativa", quantity: 2 };
  for (const value of [undefined, null, {}, 1, "broken", "{}", [null, {}, { ...potion, quantity: -1 }, { ...potion, quantity: 1.2 }, { ...potion, quantity: Infinity }, { ...potion, id: "" }, { ...potion, name: "" }]]) {
    assert.deepEqual(rules.normalizeExpeditionInventory(value), []);
  }
  assert.deepEqual(rules.normalizeExpeditionInventory(JSON.stringify([potion])), [potion]);
  assert.deepEqual(rules.mergeLoot([potion], [potion]), [{ ...potion, quantity: 4 }]);
  assert.deepEqual(rules.rollExpeditionLoot(undefined, randomUUID()), []);
  const loot = [{ ...potion, chance: 100 }, { id: "world-ration", name: "Ración de viaje", quantity: 3, chance: 0 }];
  assert.deepEqual(rules.rollExpeditionLoot(loot, "fixed-id"), [potion]);
  const probabilistic = [{ ...potion, chance: 50 }]; let wins = 0;
  for (let seed = 0; seed < 500; seed++) {
    const result = rules.rollExpeditionLoot(probabilistic, `server-ledger-${seed}`);
    assert.deepEqual(result, rules.rollExpeditionLoot(probabilistic, `server-ledger-${seed}`));
    wins += result.length;
  }
  assert.ok(wins > 180 && wins < 320);
  assert.deepEqual(rules.rollExpeditionLoot([{ ...potion, chance: -1 }, { ...potion, chance: 101 }], "id"), []);
});

test("Authoritative catalog level and persisted enemy survive changed level/hour and reload", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); h.row().nivel = 50;
  const catalog = await h.loadExpeditions(h.initial.usuarioId);
  assert.deepEqual(catalog.missions, h.rules.generateExpeditionMissions(h.row().usuario.base, now, [], 50));
  const mission = catalog.missions[0]; h.row().nivel = 4;
  await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action: "start", missionId: mission.id, requestId: randomUUID() }), 404, "mission_unavailable");
  h.row().nivel = 50;
  const { snapshot: s } = await start(h);
  assert.deepEqual(s.active.enemy, s.active.mission.enemy);
  h.row().nivel = 1; now += 3_600_000;
  const loaded = await h.loadExpeditions(h.initial.usuarioId);
  assert.deepEqual(loaded.active.enemy, s.active.enemy); assert.deepEqual(loaded.active.mission, s.active.mission);
  assert.notDeepEqual(loaded.missions, s.missions);
});

test("Snapshot normalizes missing/malformed/string JSON inventory and never exposes legacy objects", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  h.row().inventario = [{ id: "legacy-item", name: "Objeto antiguo", quantity: 99 }];
  for (const value of [undefined, null, "invalid-json", {}, [null, { id: "world-potion", quantity: 1 }]]) {
    h.row().inventarioMundo = value;
    assert.deepEqual((await h.loadExpeditions(h.initial.usuarioId)).inventory, []);
  }
  const potion = { id: "world-potion", name: "Poción curativa", quantity: 2 };
  h.row().inventarioMundo = JSON.stringify([potion, potion, { ...potion, quantity: -10 }]);
  assert.deepEqual((await h.loadExpeditions(h.initial.usuarioId)).inventory, [{ ...potion, quantity: 4 }]);
  assert.equal(typeof h.row().inventarioMundo, "string", "Status normalization does not rewrite persistence");
  assert.equal(h.row().inventario[0].quantity, 99);
});

test("Trade routes with identical base names are stable and unique within the whole catalog", () => {
  const { rules } = harness();
  const targets = Array.from({ length: 6 }, (_, i) => ({ playerId: String(i), baseName: "Valle", lat: 40.01, lng: -3 }));
  const catalog = rules.generateExpeditionMissions({ lat: 40, lng: -3 }, NOW, targets);
  assert.deepEqual(catalog, rules.generateExpeditionMissions({ lat: 40, lng: -3 }, NOW, targets.toReversed()));
  assert.equal(catalog.length, 1 + rules.NORMAL_MISSION_TIERS.reduce((sum, tier) =>
    sum + Math.min(tier.count, Math.max(1, 1 + tier.maxOffset) - Math.max(1, 1 + tier.minOffset) + 1), 0) + 6);
  assert.equal(new Set(catalog.map((m) => m.name)).size, catalog.length);
});

test("Victory normal/elite grants rolled items only at completion; concurrent reload/replay never duplicates", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  for (const kind of ["normal", "elite"]) {
    const initial = player(); initial.inventarioMundo = [{ id: "world-potion", name: "Poción curativa", quantity: 5 }];
    const h = harness(initial); const { snapshot: s, request } = await start(h, kind);
    basicEnemy(h, kind);
    const row = h.ledger()[0]; row.mission.loot.forEach((i) => { i.chance = 100; });
    const expectedLoot = h.rules.rollExpeditionLoot(row.mission.loot, row.id);
    assert.deepEqual(s.active.awardedLoot, []); assert.deepEqual(row.botin, []);
    now = s.active.arrivalAt;
    const won = await victory(h, await h.loadExpeditions(initial.usuarioId), (value) => { now = value; });
    assert.deepEqual(won.inventory, initial.inventarioMundo); assert.deepEqual(won.active.awardedLoot, []);
    assert.deepEqual(h.ledger()[0].botin, []);
    now = won.active.returnArrivalAt;
    const [done, repeated] = await Promise.all([h.loadExpeditions(initial.usuarioId), h.loadExpeditions(initial.usuarioId)]);
    assert.deepEqual(done, repeated); assert.deepEqual(done.active.awardedLoot, expectedLoot);
    assert.deepEqual(h.ledger()[0].botin, expectedLoot);
    const expectedInventory = h.rules.mergeLoot(initial.inventarioMundo, expectedLoot);
    assert.deepEqual(done.inventory, expectedInventory); assert.deepEqual(h.row().inventarioMundo, expectedInventory);
    assert.deepEqual(await h.mutateExpeditions(initial.usuarioId, request), done);
    assert.deepEqual((await h.loadExpeditions(initial.usuarioId)).inventory, expectedInventory);
    assert.equal(done.rewardRevision, won.rewardRevision + 1);
  }
});

test("Inventory and botin roll back with gold/XP on ledger failure; same UUID retry awards the same loot once", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const { snapshot: s } = await start(h); basicEnemy(h);
  h.ledger()[0].mission.loot.forEach((i) => { i.chance = 100; });
  now = s.active.arrivalAt;
  const won = await victory(h, await h.loadExpeditions(h.initial.usuarioId), (value) => { now = value; });
  const before = structuredClone(h.row()), ledgerBefore = structuredClone(h.ledger()[0]);
  const expected = h.rules.rollExpeditionLoot(ledgerBefore.mission.loot, ledgerBefore.id);
  now = won.active.returnArrivalAt; h.failCompletion();
  await assert.rejects(h.loadExpeditions(h.initial.usuarioId), /Simulated ledger write failure/);
  assert.deepEqual(h.row(), before); assert.deepEqual(h.ledger()[0], ledgerBefore);
  const done = await h.loadExpeditions(h.initial.usuarioId);
  assert.deepEqual(done.active.awardedLoot, expected); assert.deepEqual(done.inventory, expected);
  assert.equal(done.rewardRevision, before.rewardRevision + 1);
  assert.deepEqual(await h.loadExpeditions(h.initial.usuarioId), done);
});

test("Old saved missions/missing botin and inventory remain compatible; rewardGranted guards items too", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); delete h.row().inventarioMundo;
  const { snapshot: s } = await start(h); basicEnemy(h);
  const row = h.ledger()[0];
  for (const key of ["description", "enemyLevel", "enemy", "loot"]) delete row.mission[key];
  delete row.botin; delete row.enemy.level;
  const oldMission = structuredClone(row.mission), oldEnemy = structuredClone(row.enemy);
  now = s.active.arrivalAt;
  const battle = await h.loadExpeditions(h.initial.usuarioId);
  assert.deepEqual(battle.active.mission, oldMission); assert.deepEqual(battle.active.enemy, oldEnemy);
  assert.deepEqual(battle.inventory, []); assert.deepEqual(battle.active.awardedLoot, []);
  const won = await victory(h, battle, (value) => { now = value; }); now = won.active.returnArrivalAt;
  const done = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(done.active.rewardGranted, true); assert.deepEqual(done.inventory, []); assert.deepEqual(done.active.awardedLoot, []);
  assert.equal(done.profile.gold, 100 + oldMission.gold);
  // A returning ledger whose reward was already committed must never roll/regrant it.
  const saved = h.ledger()[0]; saved.phase = "returning"; saved.mission.loot = [{ ...content.EXPEDITION_ITEMS[0], quantity: 9, chance: 100 }];
  saved.botin = [{ id: "world-ration", name: "Ración de viaje", quantity: 2 }];
  h.row().inventarioMundo = structuredClone(saved.botin);
  const before = structuredClone(h.row());
  const guarded = await h.loadExpeditions(h.initial.usuarioId);
  assert.deepEqual(h.row(), before); assert.deepEqual(guarded.inventory, before.inventarioMundo);
  assert.deepEqual(guarded.active.awardedLoot, saved.botin);
});

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

test("Daily catalog: 25 legacy-duration normals, one elite and global trade destinations requiring embassies", () => {
  const { rules } = harness();
  assert.equal(rules.EXPEDITION_SPEED_KMH, 60);
  assert.equal(rules.MIN_EXPEDITION_DURATION_MS, 5000);
  assert.equal(rules.ELITE_COOLDOWN_MS, 84_600_000);
  assert.equal(rules.expeditionDurationMs(0), 5000);
  assert.equal(rules.expeditionDurationMs(1), 60_000);
  const day = new Date(NOW); day.setUTCHours(0, 0, 0, 0);
  const startOfDay = day.getTime();
  for (const origin of [{ lat: 40, lng: -3 }, { lat: 0, lng: 179.999 }, { lat: 85, lng: 180 }, { lat: -85, lng: -180 }]) {
    const catalog = rules.generateExpeditionMissions(origin, startOfDay);
    assert.deepEqual(catalog, rules.generateExpeditionMissions(origin, startOfDay + 86_399_999));
    assert.notDeepEqual(catalog, rules.generateExpeditionMissions(origin, startOfDay + 86_400_000));
    assert.notDeepEqual(catalog, rules.generateExpeditionMissions(origin, startOfDay, [], 1, 1));
    assert.equal(catalog.filter((m) => m.kind === "normal").length, rules.NORMAL_MISSION_TIERS.reduce((sum, tier) =>
      sum + Math.min(tier.count, Math.max(1, 1 + tier.maxOffset) - Math.max(1, 1 + tier.minOffset) + 1), 0));
    assert.equal(catalog.filter((m) => m.kind === "elite").length, 1);
    for (const m of catalog) {
      assert.ok(rules.validExpeditionCoordinates(m));
      if (m.kind !== "trade") {
        const bounds = rules.expeditionRewardBounds(m.kind, m.distanceKm, m.enemyLevel);
        assert.ok(m.gold >= bounds.gold.min && m.gold <= bounds.gold.max);
        assert.ok(m.experience >= bounds.experience.min && m.experience <= bounds.experience.max);
      }
      if (m.kind === "normal") {
        const tierHours = [0.5, 1, 3, 9, 24].find((hours) => m.distanceKm >= hours * 5.4 && m.distanceKm <= hours * 6.6);
        assert.ok(tierHours);
        assert.ok(m.durationMs >= tierHours * 30 * 60_000 * 0.9 && m.durationMs <= tierHours * 30 * 60_000 * 1.1 + 1);
      } else if (m.kind === "elite") {
        assert.ok(m.durationMs >= 30 * 60_000 * 0.9 && m.durationMs <= 30 * 60_000 * 1.1 + 1);
      } else assert.equal(m.durationMs, rules.expeditionDurationMs(m.distanceKm));
    }
  }
  const target = { playerId: randomUUID(), baseName: "Vecino", lat: 40.01, lng: -3 };
  const farTarget = { playerId: randomUUID(), baseName: "Lejano", lat: 42, lng: -3 };
  const missions = rules.generateExpeditionMissions({ lat: 40, lng: -3 }, startOfDay, [target, target, farTarget]);
  const trade = missions.filter((m) => m.kind === "trade");
  assert.equal(trade.length, 2); assert.ok(trade.some((mission) => mission.targetPlayerId === target.playerId));
  assert.ok(trade.some((mission) => mission.targetPlayerId === farTarget.playerId));
  assert.ok(trade.every((mission) => mission.gold % 4 === 0));
});

test("Pure combat and level growth mirror Novato, minimum damage and no retaliation after lethal hit", () => {
  const { rules } = harness();
  assert.equal(combat.ENEMY_TURN_DELAY_MS, 1000); assert.equal(combat.ATTACK_ANIMATION_MS, 500);
  assert.equal(rules.expeditionDamage(2, 100, 0), 2);
  assert.equal(rules.expeditionDamage(10, 1, 100), 1);
  assert.deepEqual(rules.expeditionCombatStats(3), { attack: 10, defense: 7 });
  assert.equal(rules.expeditionEnemy("trade", 1), null);
  const spider = rules.expeditionEnemy("normal", 1, 3);
  assert.equal(spider.maxHealth, 14); assert.equal(spider.attack, 1);
  const ogre = rules.expeditionEnemy("elite", 1, 0);
  assert.equal(ogre.maxHealth, 35); assert.equal(ogre.attack, 3); assert.equal(ogre.defense, 3);
  for (const level of [1, 4, 50]) for (const kind of ["normal", "elite"]) for (let species = 0; species < (kind === "elite" ? 4 : (content.EXPEDITION_ENEMIES.length - 1) * 4); species++) {
    const enemy = rules.expeditionEnemy(kind, level, species);
    const shared = enemyCatalog.createEnemyAtLevel(enemy.id, level, kind === "elite");
    assert.equal(enemy.speed, shared.attributes.speed);
  }
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
  for (const key of ["gold", "experience", "origin", "enemy", "attack", "defense", "departureAt", "targetPlayerId", "outcome", "rewardGranted", "loot", "awardedLoot", "botin", "inventory", "inventarioMundo", "enemyLevel"]) {
    await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, { action: "start", missionId: "m", requestId: randomUUID(), [key]: 1 }), 400, "invalid_body");
  }
  assert.equal(h.ledger().length, 0);
});

test("Status fresh exact DTO, imported token, missing player/base and invalid saved coordinates", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const h = harness();
  const before = structuredClone(h.row());
  const s = await h.loadExpeditions(h.initial.usuarioId);
  assert.deepEqual(Object.keys(s).sort(), ["active", "eliteAvailableAt", "inventory", "missions", "partySize", "profile", "progressToken", "rewardRevision", "serverNow"]);
  assert.deepEqual(s.inventory, []);
  assert.equal(s.serverNow, NOW); assert.equal(s.active, null); assert.equal(s.eliteAvailableAt, 0); assert.equal(s.rewardRevision, 0);
  assert.equal(s.partySize, 1);
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
  assert.deepEqual(a.active.enemy, mission.enemy); assert.equal(a.active.enemy.level, mission.enemyLevel);
  assert.equal(a.active.playerHealth, 40); assert.equal(a.active.playerMaxHealth, 100);
  assert.equal(h.ledger()[0].attack, 10); assert.equal(h.ledger()[0].defense, 7);
  assert.deepEqual(Object.keys(a.active).sort(), ["actingMemberId", "arrivalAt", "awardedLoot", "departureAt", "enemy", "enemyHealth", "enemyTurnAt", "id", "lastAction", "log", "mission", "origin", "outcome", "participants", "phase", "playerHealth", "playerMaxHealth", "playerSpeed", "returnArrivalAt", "returnDepartureAt", "rewardGranted", "turn", "version"]);
  assert.equal(a.active.playerSpeed, 5); assert.equal(a.active.turn, "player");
  assert.equal(a.active.actingMemberId, initial.id);
  assert.equal(a.active.enemyTurnAt, null); assert.equal(a.active.lastAction, null);
  assert.deepEqual(a.active.awardedLoot, []);
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

test("Daily catalog remains valid intraday; completed expedition count/day rotate future missions without changing active ledgers", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const stale = (await h.loadExpeditions(h.initial.usuarioId)).missions[0];
  now += 3_600_000;
  const request = { action: "start", missionId: stale.id, requestId: randomUUID() };
  const s = await h.mutateExpeditions(h.initial.usuarioId, request);
  assert.equal(s.active.mission.id, stale.id);
  now += 86_400_000;
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

test("Faster enemy starts after a full observed pause, ties/player advantage and missing speeds start player", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  for (const speed of [3, 5, 6, undefined]) {
    const h = harness(); const { snapshot: s } = await start(h);
    basicEnemy(h); h.ledger()[0].enemy.speed = speed;
    delete h.ledger()[0].playerSpeed;
    now = s.active.arrivalAt + 86_400_000;
    const battle = await h.loadExpeditions(h.initial.usuarioId);
    assert.equal(battle.active.playerSpeed, 5); assert.equal(battle.active.version, 1);
    assert.equal(battle.active.lastAction, null); assert.equal(battle.profile.currentHealth, 40);
    assert.equal(battle.active.turn, speed > 5 ? "enemy" : "player");
    assert.equal(battle.active.enemyTurnAt, speed > 5 ? now + 1000 : null);
    if (speed > 5) {
      now += 999;
      assert.deepEqual((await h.loadExpeditions(h.initial.usuarioId)).active, battle.active);
      await enemyTurn(h, battle, (value) => { now = value; });
    }
  }
});

test("Enemy pause rejects early/due attack and flee without damage; one offline attack then unlimited player wait", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const { snapshot: s } = await start(h); basicEnemy(h);
  now = s.active.arrivalAt;
  const battle = await h.loadExpeditions(h.initial.usuarioId);
  const first = await attack(h, battle);
  assert.equal(first.active.enemyTurnAt, now + 1000);
  for (const time of [now, now + 999, now + 1000, now + 86_400_000]) {
    now = time;
    const before = structuredClone(h.ledger()[0]), profile = structuredClone(h.row());
    for (const action of ["attack", "flee"]) {
      await rejectsCode(h.mutateExpeditions(h.initial.usuarioId, {
        action, expeditionId: first.active.id, version: first.active.version,
      }), 409, "not_your_turn");
    }
    assert.deepEqual(h.ledger()[0], before); assert.deepEqual(h.row(), profile);
  }
  const resolved = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(resolved.active.playerHealth, 39); assert.equal(resolved.active.version, 3);
  assert.equal(resolved.active.lastAction.at, now); assert.equal(resolved.active.lastAction.id, 3);
  now += 7 * 86_400_000;
  const waiting = await h.loadExpeditions(h.initial.usuarioId);
  assert.deepEqual(waiting.active, resolved.active); assert.deepEqual(waiting.profile, resolved.profile);
  assert.equal(waiting.rewardRevision, resolved.rewardRevision);
  await rejectsCode(attack(h, first), 409, "expedition_conflict");
});

test("Persisted pre-turn battle defaults to player and can attack without re-running initiative", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const { snapshot: s } = await start(h); basicEnemy(h);
  const row = h.ledger()[0]; row.phase = "battle"; row.version = 7;
  for (const key of ["turn", "enemyTurnAt", "lastAction", "playerSpeed"]) delete row[key];
  delete row.enemy.speed;
  now = s.active.arrivalAt + 86_400_000;
  const loaded = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(loaded.active.turn, "player"); assert.equal(loaded.active.actingMemberId, h.initial.id); assert.equal(loaded.active.enemyTurnAt, null);
  assert.equal(loaded.active.lastAction, null); assert.equal(loaded.active.playerSpeed, 5);
  assert.equal(loaded.active.version, 7); assert.equal(loaded.profile.currentHealth, 40);
  const hit = await attack(h, loaded);
  assert.equal(hit.active.version, 8); assert.equal(hit.active.playerHealth, 40);
  assert.equal(hit.active.turn, "enemy"); assert.equal(hit.active.lastAction.id, 8);
});

test("Enemy death and elite victory roll back HP, revision, action and cooldown if terminal write fails", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  for (const outcome of ["defeat", "victory"]) {
    const h = harness(); if (outcome === "defeat") h.row().saludActual = 1;
    const { snapshot: s } = await start(h, "elite"); basicEnemy(h, "elite");
    now = s.active.arrivalAt;
    let battle = await h.loadExpeditions(h.initial.usuarioId);
    if (outcome === "defeat") {
      battle = await attack(h, battle); now = battle.active.enemyTurnAt;
    } else {
      h.ledger()[0].enemyHealth = 1;
      battle = await h.loadExpeditions(h.initial.usuarioId);
    }
    const rowBefore = structuredClone(h.ledger()[0]), playerBefore = structuredClone(h.row());
    h.failReturn();
    await assert.rejects(outcome === "defeat" ? h.loadExpeditions(h.initial.usuarioId) : attack(h, battle), /Simulated return write failure/);
    assert.deepEqual(h.row(), playerBefore); assert.deepEqual(h.ledger()[0], rowBefore);
    const terminal = outcome === "defeat" ? await h.loadExpeditions(h.initial.usuarioId) : await attack(h, battle);
    assert.equal(terminal.active.outcome, outcome); assert.equal(terminal.active.version, battle.active.version + 1);
    assert.equal(terminal.rewardRevision, playerBefore.rewardRevision + 1);
    assert.equal(terminal.active.lastAction.id, terminal.active.version);
    assert.equal(terminal.active.lastAction.actor, outcome === "defeat" ? "enemy" : "player");
  }
});

test("Versioned server combat, persistent damage, victory return preserves battle and rewards once at exact arrival", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const initial = player(); initial.experiencia = 90;
  const h = harness(initial); const { snapshot: s, request } = await start(h);
  basicEnemy(h);
  now = s.active.arrivalAt;
  const battle = await h.loadExpeditions(initial.usuarioId);
  const first = await attack(h, battle);
  assert.equal(first.active.enemyHealth, 6); assert.equal(first.active.playerHealth, 40);
  assert.equal(h.row().saludActual, 40); assert.equal(first.active.version, 2);
  assert.equal(first.rewardRevision, battle.rewardRevision);
  assert.deepEqual(first.active.lastAction, { id: 2, actor: "player", actorMemberId: initial.id, targetEnemyId: first.active.enemy.id, kind: "attack", damage: 8, at: now });
  await rejectsCode(attack(h, battle), 409, "expedition_conflict");
  const won = await victory(h, first, (value) => { now = value; });
  assert.equal(won.active.phase, "returning"); assert.equal(won.active.enemyHealth, 0);
  assert.equal(won.active.playerHealth, 39); assert.equal(won.active.playerMaxHealth, 100);
  assert.equal(won.active.version, 4); assert.match(won.active.log, /Victoria/);
  assert.equal(won.active.turn, "player"); assert.equal(won.active.actingMemberId, initial.id); assert.equal(won.active.enemyTurnAt, null);
  assert.deepEqual(won.active.lastAction, { id: 4, actor: "player", actorMemberId: initial.id, targetEnemyId: first.active.enemy.id, kind: "attack", damage: 6, at: now });
  assert.equal(won.profile.gold, 100); assert.equal(won.profile.experience, 90); assert.equal(won.active.rewardGranted, false);
  assert.equal(won.active.returnDepartureAt, now); assert.equal(won.active.returnArrivalAt, now + s.active.mission.durationMs);
  await rejectsCode(attack(h, won), 409, "not_in_battle");
  now = won.active.returnArrivalAt - 1;
  assert.equal((await h.loadExpeditions(initial.usuarioId)).active.phase, "returning");
  now++;
  const [done, repeated] = await Promise.all([h.loadExpeditions(initial.usuarioId), h.loadExpeditions(initial.usuarioId)]);
  assert.deepEqual(done, repeated);
  assert.equal(done.active.phase, "completed"); assert.equal(done.active.outcome, "victory"); assert.equal(done.active.rewardGranted, true);
  const expected = h.rules.expeditionRewardProgress({ ...initial, saludActual: 39 }, s.active.mission.gold, s.active.mission.experience);
  assert.equal(done.profile.gold, expected.oro); assert.equal(done.profile.level, expected.nivel); assert.equal(done.profile.experience, expected.experiencia);
  assert.equal(done.profile.maxHealth, expected.saludMaxima); assert.equal(done.profile.currentHealth, expected.saludActual);
  assert.equal(done.active.playerHealth, 39); assert.equal(done.active.playerMaxHealth, 100); assert.equal(done.active.enemyHealth, 0);
  assert.equal(done.rewardRevision, won.rewardRevision + 1); assert.notEqual(done.progressToken, won.progressToken);
  assert.equal(h.row().ultimaEliteExitosa, null);
  assert.deepEqual(await h.mutateExpeditions(initial.usuarioId, request), done);
  const second = await start(h); assert.notEqual(second.snapshot.active.id, done.active.id);
  assert.equal((await h.mutateExpeditions(initial.usuarioId, request)).active.id, second.snapshot.active.id);
  assert.equal(h.ledger().length, 2); assert.equal(h.row().rewardRevision, done.rewardRevision);
});

test("Concurrent attacks accept one matching version; concurrent due status retaliates exactly once", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const { snapshot: s } = await start(h); now = s.active.arrivalAt;
  basicEnemy(h);
  const battle = await h.loadExpeditions(h.initial.usuarioId);
  const results = await Promise.allSettled([attack(h, battle), attack(h, battle)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.code, "expedition_conflict");
  assert.equal(h.ledger()[0].enemyHealth, 6); assert.equal(h.row().saludActual, 40);
  now = h.ledger()[0].enemyTurnAt.getTime();
  const [a, b] = await Promise.all([h.loadExpeditions(h.initial.usuarioId), h.loadExpeditions(h.initial.usuarioId)]);
  assert.deepEqual(a, b); assert.equal(a.active.version, 3);
  assert.equal(h.row().saludActual, 39); assert.equal(a.rewardRevision, 1);
});

test("Flee/defeat return without rewards or elite cooldown, preserve final combat and reject replay", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  for (const outcome of ["fled", "defeat"]) {
    const h = harness(); if (outcome === "defeat") h.row().saludActual = 1;
    const { snapshot: s } = await start(h, "elite"); now = s.active.arrivalAt;
    basicEnemy(h, "elite");
    const battle = await h.loadExpeditions(h.initial.usuarioId);
    const back = outcome === "fled" ? await h.mutateExpeditions(h.initial.usuarioId, { action: "flee", expeditionId: battle.active.id, version: battle.active.version })
      : await enemyTurn(h, await attack(h, battle), (value) => { now = value; });
    assert.equal(back.active.turn, "player"); assert.equal(back.active.actingMemberId, h.initial.id); assert.equal(back.active.enemyTurnAt, null);
    assert.equal(back.active.lastAction.actor, outcome === "fled" ? "player" : "enemy");
    assert.equal(back.active.lastAction.kind, outcome === "fled" ? "flee" : "attack");
    assert.equal(back.active.lastAction.id, back.active.version);
    assert.equal(back.active.outcome, outcome); assert.equal(back.active.phase, "returning");
    assert.equal(back.eliteAvailableAt, 0); assert.equal(h.row().ultimaEliteExitosa, null);
    assert.ok(back.active.enemyHealth > 0);
    now = back.active.returnArrivalAt;
    await rejectsCode(attack(h, back), 409, "expedition_conflict");
    const done = await h.loadExpeditions(h.initial.usuarioId);
    assert.equal(done.active.phase, "completed"); assert.equal(done.active.outcome, outcome); assert.equal(done.active.rewardGranted, false);
    assert.equal(done.profile.gold, 100); assert.equal(done.profile.experience, 0); assert.equal(done.rewardRevision, outcome === "defeat" ? 1 : 0);
    assert.equal(done.profile.currentHealth, outcome === "defeat" ? 0 : 40);
    assert.deepEqual(done.inventory, []); assert.deepEqual(done.active.awardedLoot, []); assert.deepEqual(h.ledger()[0].botin, []);
  }
});

test("Elite cooldown starts at victory, not return: 23h30 boundary, failure/flee do not set it", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const h = harness(); const { snapshot: s } = await start(h, "elite"); now = s.active.arrivalAt;
  basicEnemy(h, "elite");
  const won = await victory(h, await h.loadExpeditions(h.initial.usuarioId), (value) => { now = value; });
  const victoryTime = now;
  assert.equal(h.row().ultimaEliteExitosa.getTime(), victoryTime);
  assert.equal(won.eliteAvailableAt, victoryTime + 84_600_000);
  assert.ok(won.rewardRevision > 0);
  now = won.active.returnArrivalAt;
  const done = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(done.profile.experience, s.active.mission.experience % 100); assert.equal(done.eliteAvailableAt, won.eliteAvailableAt);
  await rejectsCode(start(h, "elite"), 409, "elite_cooldown");
  now = won.eliteAvailableAt - 1;
  await rejectsCode(start(h, "elite"), 409, "elite_cooldown");
  now++;
  assert.equal((await start(h, "elite")).snapshot.active.phase, "outbound");
  assert.equal(h.ledger().length, 2);
});

test("Trade catalog includes embassies globally, including the antimeridian, and excludes players without embassies", async (t) => {
  t.mock.method(Date, "now", () => NOW);
  const own = player("propio", 0, 179.99), close = player("cerca", 0, -179.99), far = player("lejos", 0, -179.8),
    noEmbassy = player("sin embajada", 0, 179.98, false);
  const h = harness(own, [close, far, noEmbassy]);
  const missions = (await h.loadExpeditions(own.usuarioId)).missions.filter((m) => m.kind === "trade");
  assert.equal(missions.length, 2);
  assert.ok(missions.some((mission) => mission.targetPlayerId === close.id));
  assert.ok(missions.some((mission) => mission.targetPlayerId === far.id));
  assert.ok(missions.every((mission) => mission.targetPlayerId !== noEmbassy.id));
  assert.ok(missions.some((mission) => mission.distanceKm > 7));
});

test("Trade resolves both legs offline, grants sender XP/gold and exactly recipient 25% once, increments both revisions", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const recipient = player("receptor", 40.01);
  const h = harness(player(), [recipient]);
  const tokenRecipient = h.progressToken(h.row(recipient.id), h.row(recipient.id).usuario.base);
  const { snapshot: s, request } = await start(h, "trade");
  assert.equal(s.active.enemy, null); assert.equal(s.active.enemyHealth, 0);
  // Even a malformed persisted trade with possible loot must never award objects.
  h.ledger()[0].mission.loot = [{ ...content.EXPEDITION_ITEMS[0], quantity: 99, chance: 100 }];
  now = s.active.arrivalAt;
  const back = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(back.active.phase, "returning"); assert.equal(back.active.outcome, "trade");
  assert.equal(back.active.returnDepartureAt, s.active.arrivalAt); assert.equal(h.row(recipient.id).oro, 100);
  now = s.active.arrivalAt + s.active.mission.durationMs + 86_400_000;
  const done = await h.loadExpeditions(h.initial.usuarioId);
  assert.equal(done.active.phase, "completed"); assert.equal(done.active.rewardGranted, true);
  assert.equal(done.profile.gold, 100 + s.active.mission.gold); assert.equal(done.profile.experience, 25); assert.equal(done.rewardRevision, 1);
  assert.deepEqual(done.inventory, []); assert.deepEqual(done.active.awardedLoot, []); assert.deepEqual(h.ledger()[0].botin, []);
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

test("Shared initiative orders every living party member and enemy by speed with stable tie breaks", () => {
  const order = combat.orderCombatInitiative([
    { id: "member-slow", side: "player", speed: 5, order: 0 },
    { id: "enemy-fast", side: "enemy", speed: 9, order: 2 },
    { id: "member-fast", side: "player", speed: 12, order: 1 },
    { id: "member-tie", side: "player", speed: 9, order: 2 },
    { id: "enemy-tie", side: "enemy", speed: 9, order: 3 },
  ]);
  assert.deepEqual(order.map((entry) => entry.id), ["member-fast", "member-tie", "enemy-fast", "enemy-tie", "member-slow"]);
  assert.equal(combat.nextCombatantId(order.map((entry) => entry.id), "member-fast", new Set(["member-tie", "enemy-fast", "member-slow"])), "member-tie");
  assert.equal(combat.nextCombatantId(order.map((entry) => entry.id), "member-tie", new Set(["enemy-fast", "member-slow"])), "enemy-fast");
});

test("Board missions remain solo even when the requester belongs to a party", async () => {
  const leader = player("leader"), ally = player("ally", 40.01), third = player("ally2", 40.02);
  const h = harness(leader, [ally, third]); h.setParty([leader.id, ally.id, third.id]);
  const first = await start(h);
  assert.deepEqual(first.snapshot.active.participants.map((member) => member.playerId), [leader.id]);

  const allySnapshot = await h.loadExpeditions(ally.usuarioId);
  const allyMission = allySnapshot.missions.find((mission) => mission.kind === "normal");
  const second = await h.mutateExpeditions(ally.usuarioId, {
    action: "start", missionId: allyMission.id, requestId: randomUUID(),
  });
  assert.deepEqual(second.active.participants.map((member) => member.playerId), [ally.id]);
  assert.equal(h.ledger().length, 2, "Party members can independently take solo board missions");
});

test("Exterior party combat shares an authoritative ledger, turn ownership, enemy turns and rewards", async (t) => {
  let now = NOW; t.mock.method(Date, "now", () => now);
  const leader = player("leader"), nearby = player("nearby", 40.01), distant = player("distant", 44);
  for (const member of [leader, nearby]) {
    member.ubicacion = { sceneId: "exterior-world", x: 4096, y: 4096, direction: "down" };
    member.ultimoVisto = new Date(NOW);
  }
  distant.ubicacion = { sceneId: "base", x: 480, y: 768, direction: "up" };
  distant.ultimoVisto = new Date(NOW);
  const h = harness(leader, [nearby, distant]); h.setParty([leader.id, nearby.id, distant.id]);
  const request = { action: "start", requestId: randomUUID(), lat: 40, lng: -3 };
  const started = await h.mutateWorldCombat(leader.usuarioId, request);
  assert.equal(started.active.phase, "battle");
  assert.ok(enemyCatalog.ENEMY_ROSTER.some((enemy) => enemy.id === started.active.enemy.id));
  assert.ok(started.active.enemy.level >= 6 && started.active.enemy.level <= 16, "Server chooses a valid trio difficulty");
  assert.deepEqual(started.active.participants.map((member) => member.playerId), [leader.id, nearby.id, distant.id]);
  assert.ok(Math.abs(started.active.encounterLocation.lat - 40) < 1e-6);
  const row = h.encounters()[0];
  row.enemigo.speed = 1;
  row.participants.forEach((member, index) => { member.velocidad = 15 - index; });
  row.turno = leader.id;
  const shared = await h.mutateWorldCombat(nearby.usuarioId, { action: "status" });
  assert.equal(shared.active.id, started.active.id);
  assert.equal(shared.active.version, started.active.version);
  await rejectsCode(h.mutateWorldCombat(nearby.usuarioId, {
    action: "attack", encounterId: shared.active.id, version: shared.active.version,
  }), 409, "not_your_turn");

  const attackRequest = { action: "attack", encounterId: shared.active.id, version: shared.active.version };
  const firstTurn = await h.mutateWorldCombat(leader.usuarioId, attackRequest);
  assert.equal(firstTurn.active.actingMemberId, nearby.id);
  await rejectsCode(h.mutateWorldCombat(leader.usuarioId, attackRequest), 409, "encounter_conflict");
  assert.ok(firstTurn.active.enemyHealth < shared.active.enemyHealth);
  const seenAfterAttack = await h.mutateWorldCombat(distant.usuarioId, { action: "status" });
  assert.equal(seenAfterAttack.active.enemyHealth, firstTurn.active.enemyHealth);
  assert.equal(seenAfterAttack.active.lastAction.actorMemberId, leader.id);

  let currentRow = h.encounters()[0];
  currentRow.turno = "enemy";
  currentRow.enemigoTurnoAt = new Date(now - 1);
  const beforeHp = currentRow.participants[0].salud;
  const afterEnemy = await h.mutateWorldCombat(distant.usuarioId, { action: "status" });
  assert.equal(afterEnemy.active.version, firstTurn.active.version + 1);
  assert.equal(afterEnemy.active.lastAction.actor, "enemy");
  currentRow = h.encounters()[0];
  assert.ok(currentRow.participants[0].salud < beforeHp);
  assert.equal(h.row(leader.id).saludActual, currentRow.participants[0].salud);

  currentRow.turno = leader.id; currentRow.enemigoTurnoAt = null; currentRow.vidaEnemigo = 1;
  const beforeVersion = currentRow.version;
  const victory = await h.mutateWorldCombat(leader.usuarioId, {
    action: "attack", encounterId: currentRow.id, version: beforeVersion,
  });
  assert.equal(victory.active.outcome, "victory");
  assert.equal(victory.active.rewardGranted, true);
  assert.equal(h.row(leader.id).oro + h.row(nearby.id).oro + h.row(distant.id).oro - 300, currentRow.enemigo.goldReward);
  assert.equal(h.row(leader.id).rewardRevision, 2);
  const resultAtSecondClient = await h.mutateWorldCombat(nearby.usuarioId, { action: "status" });
  assert.equal(resultAtSecondClient.active.outcome, "victory");
  assert.equal(resultAtSecondClient.active.version, victory.active.version);
  await rejectsCode(h.mutateWorldCombat(leader.usuarioId, {
    action: "attack", encounterId: currentRow.id, version: h.encounters()[0].version,
  }), 409, "not_in_battle");
});

test("Enemy level ranges widen with party size exactly as configured and clamp at level one", () => {
  const ranges = [1, 2, 3].map((size) => enemyCatalog.enemyLevelRange(20, size));
  assert.deepEqual(ranges, [
    { min: 15, max: 25 }, { min: 20, max: 30 }, { min: 25, max: 35 },
  ]);
  assert.deepEqual(enemyCatalog.enemyLevelRange(1, 1), { min: 1, max: 6 });
  for (let difference = -5; difference <= 5; difference++) {
    assert.match(enemyCatalog.enemyDifficultyColor(20 + difference, 20), /^hsl\(/);
  }
  assert.equal(enemyCatalog.enemyDifficultyColor(15, 20), "hsl(120 82% 48%)");
  assert.equal(enemyCatalog.enemyDifficultyColor(20, 20), "hsl(60 82% 48%)");
  assert.equal(enemyCatalog.enemyDifficultyColor(25, 20), "hsl(0 82% 48%)");
});