const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const origin = process.env.WORLD_TEST_URL ?? "http://localhost:3100";
const emails = [];
const password = randomBytes(24).toString("hex");

async function call(account, route, body, method) {
  const response = await fetch(`${origin}/api/${route}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { "Content-Type": "application/json", ...(account?.cookie ? { Cookie: account.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const cookies = response.headers.getSetCookie();
  if (account && cookies.length) account.cookie = cookies[0].split(";")[0];
  return { status: response.status, data: await response.json() };
}
async function load(account) {
  const result = await call(account, "mundo/jugador"); assert.equal(result.status, 200);
  account.session = result.data.session; return account.session;
}
function progress(account, changes = {}) {
  const s = account.session, p = s.player;
  return { progressToken: s.progressToken, buildingToken: s.buildingToken, rewardRevision: s.rewardRevision,
    characterClass: p.characterClass, level: p.level, experience: p.experience, gold: p.gold,
    currentHealth: p.currentHealth, maxHealth: p.maxHealth, buildings: s.base.buildings, ...changes };
}
async function sync(account, changes) {
  const result = await call(account, "mundo/sync", progress(account, changes)); assert.equal(result.status, 200, JSON.stringify(result.data));
  await load(account); return result.data;
}
function command(account, action, targetId) {
  return { action, targetId, requestId: randomUUID(), progressToken: account.session.progressToken, rewardRevision: account.session.rewardRevision };
}

test("equipment HTTP: disposable accounts, authoritative purchases/upgrades/replay and persistence", { timeout: 60000 }, async (t) => {
  try {
    const accounts = [];
    const lat = -65 - Math.random() * 3;
    for (let i = 0; i < 2; i++) {
      const email = `equipment-${randomUUID()}@test.local`; emails.push(email);
      const account = { email };
      assert.equal((await call(account, "auth/register", { email, nombre: `Equipo ${i}`, password })).status, 201);
      assert.equal((await call(account, "mundo/jugador", { baseName: `Forja ${i}`, playerName: `Armero ${i}`, sex: "chico", lat: lat + i * 0.01, lng: -120 })).status, 200);
      await load(account); accounts.push(account);
    }
    const [a, b] = accounts;
    const buildings = [{ type: "town-hall", level: 2 }, { type: "armory", level: 1 }, { type: "smithy", level: 1 }];
    await t.test("authentication, saved armory dependency and maximum extended catalog", async () => {
      assert.equal((await call(null, "mundo/equipo")).status, 401);
      assert.equal((await call(a, "mundo/equipo", command(a, "buy", "espada_madera"))).status, 403);
      assert.equal((await call(a, "mundo/sync", progress(a, { buildings }))).data.code, "armory_required");
      for (const account of accounts) {
        await sync(account, { buildings: buildings.slice(0, 2), gold: 2000 });
        await sync(account, { buildings: [...buildings, { type: "tavern", level: 1 }, { type: "embassy", level: 1 }] });
      }
      const bad = [...buildings]; bad.splice(2, 0, { type: "tavern", level: 1 });
      assert.equal((await call(a, "mundo/sync", progress(a, { buildings: bad }))).status, 400);
    });
    let itemA, itemB;
    await t.test("buy: real DB instances, concurrent replay and strict rejection of client price", async () => {
      const req = command(a, "buy", "espada_madera");
      assert.equal((await call(a, "mundo/equipo", { ...req, price: 0 })).status, 400);
      const results = await Promise.all([call(a, "mundo/equipo", req), call(a, "mundo/equipo", req)]);
      assert.ok(results.every((r) => r.status === 200), JSON.stringify(results));
      assert.deepEqual(results[0].data, results[1].data);
      itemA = results[0].data.snapshot.items[0]; assert.equal(results[0].data.snapshot.profile.gold, 1900);
      await load(a);
      const purchased = await call(b, "mundo/equipo", command(b, "buy", "tela_andrajosa"));
      assert.equal(purchased.status, 200); itemB = purchased.data.snapshot.items[0]; await load(b);
      assert.equal((await call(a, "mundo/equipo", command(a, "buy", "invented"))).status, 400);
    });
    await t.test("upgrade: ownership, exact server price, concurrent replay and stale sync profile reset", async () => {
      assert.equal((await call(a, "mundo/equipo", command(a, "upgrade", itemB.id))).data.code, "equipment_not_owned");
      const stale = progress(a);
      const req = command(a, "upgrade", itemA.id);
      const results = await Promise.all([call(a, "mundo/equipo", req), call(a, "mundo/equipo", req)]);
      assert.ok(results.every((r) => r.status === 200)); assert.equal(results[0].data.snapshot.profile.gold, 1400);
      assert.equal(results[0].data.snapshot.items[0].upgrade, 1);
      const oldSave = await call(a, "mundo/sync", stale); assert.equal(oldSave.status, 200); assert.equal(oldSave.data.profileReset, true);
      await load(a); assert.equal(a.session.player.gold, 1400);
      const db = await prisma.jugador.findUniqueOrThrow({ where: { id: a.session.player.id } });
      assert.equal(db.equipoMundo.items[0].upgrade, 1); assert.equal(db.rewardRevision, 2);
    });
    await t.test("both interiors persist; logout/login restores inventory, gold and annex order", async () => {
      for (const sceneId of ["armory-interior", "smithy-interior"]) {
        const result = await call(a, "mundo/jugador", { action: "checkpoint", revision: a.session.mobility.revision, location: { sceneId, x: 64, y: 48, direction: "down" } }, "PATCH");
        assert.equal(result.status, 200); await load(a); assert.equal(a.session.mobility.location.sceneId, sceneId);
      }
      assert.equal((await call(a, "auth/logout", {})).status, 200);
      assert.equal((await call(a, "auth/login", { email: a.email, password })).status, 200); await load(a);
      const result = await call(a, "mundo/equipo"); assert.equal(result.status, 200);
      assert.deepEqual(result.data.snapshot.items, [{ ...itemA, upgrade: 1 }]); assert.equal(result.data.snapshot.profile.gold, 1400);
      assert.deepEqual(a.session.base.buildings.map((item) => item.type), ["town-hall", "armory", "smithy", "tavern", "embassy"]);
    });
    await t.test("active expedition freezes equipment and result replay never duplicates rewards or items", async () => {
      assert.equal((await call(a, "mundo/jugador", { action: "checkpoint", revision: a.session.mobility.revision, location: { sceneId: "base", x: 480, y: 768, direction: "down" } }, "PATCH")).status, 200);
      const catalog = (await call(a, "mundo/expediciones")).data.snapshot;
      const mission = catalog.missions.find((m) => m.kind === "trade" && m.targetPlayerId === b.session.player.id);
      assert.ok(mission);
      const started = await call(a, "mundo/expediciones", { action: "start", missionId: mission.id, requestId: randomUUID() }); assert.equal(started.status, 200);
      await load(a);
      assert.equal((await call(a, "mundo/equipo", command(a, "upgrade", itemA.id))).data.code, "player_busy");
      // Advance only this run's disposable ledger, not wall clock or user data.
      await prisma.expedicionMundo.update({ where: { id: started.data.snapshot.active.id }, data: { arrivalAt: new Date(Date.now() - mission.durationMs - 1000) } });
      const complete = (await call(a, "mundo/expediciones")).data.snapshot;
      assert.equal(complete.active.phase, "completed");
      const repeated = (await call(a, "mundo/expediciones")).data.snapshot;
      assert.deepEqual(repeated.profile, complete.profile);
      const equipment = (await call(a, "mundo/equipo")).data.snapshot;
      assert.deepEqual(equipment.items, [{ ...itemA, upgrade: 1 }]); assert.equal(equipment.profile.gold, complete.profile.gold);
    });
  } finally {
    await prisma.usuario.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  }
});