const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash, randomUUID, randomBytes } = require("node:crypto");
require("./load-typescript.cjs");
const { prisma } = require("../src/lib/prisma.ts");
const { PlayerProgression } = require("../src/game/gameplay/PlayerProgression.ts");
const { VillageProgression } = require("../src/game/gameplay/VillageProgression.ts");
const { PartyManager } = require("../src/game/gameplay/PartyManager.ts");
const { BASE_RETURN_LOCATION, EXTERIOR_HOME_POSITION, CART_SPEED, MIN_TRIP_DURATION_MS } = require("../src/shared/travel.ts");

const origin = process.env.WORLD_TEST_URL ?? "http://localhost:3100";
const runId = `smoke-${randomUUID()}`;
const password = randomBytes(24).toString("hex");
const accounts = [];

async function request(path, account, body, method) {
  const response = await fetch(`${origin}${path}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { "Content-Type": "application/json", ...(account?.cookie ? { Cookie: account.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const cookies = response.headers.getSetCookie();
  if (account && cookies.length) account.cookie = cookies[0].split(";")[0];
  return { status: response.status, data: await response.json() };
}
async function register(index) {
  const account = { email: `${runId}-${index}@test.local`, nombre: `${runId}-${index}`, password };
  accounts.push(account);
  const result = await request("/api/auth/register", account, account);
  assert.equal(result.status, 201);
  assert.ok(account.cookie);
  return account;
}
async function load(account) {
  const result = await request("/api/mundo/jugador", account);
  assert.equal(result.status, 200);
  account.session = result.data.session;
  return account.session;
}
function progress(session, changes = {}) {
  return {
    progressToken: session.progressToken,
    rewardRevision: session.rewardRevision,
    buildingToken: session.buildingToken,
    characterClass: session.player.characterClass, level: session.player.level,
    experience: session.player.experience, gold: session.player.gold,
    currentHealth: session.player.currentHealth, maxHealth: session.player.maxHealth,
    buildings: session.base.buildings, ...changes,
  };
}
async function sync(account, changes) {
  const result = await request("/api/mundo/sync", account, progress(account.session, changes));
  assert.equal(result.status, 200);
  await load(account);
  return result.data;
}
async function party(account, body, status = 200) {
  const result = await request("/api/mundo/party", account, body);
  assert.equal(result.status, status);
  return result;
}

test("world HTTP flow (isolated disposable accounts, cleaned in finally)", { timeout: 60_000 }, async (t) => {
  try {
    let a, b, c, d, location;
    await t.test("unauthenticated access, registration, credentials and new-player session", async () => {
      assert.equal((await request("/api/mundo/jugador")).status, 401);
      assert.equal((await request("/api/mundo/sync", null, {})).status, 401);
      assert.equal((await request("/api/auth/register", null, null)).status, 400);
      assert.equal((await request("/api/auth/login", null, null)).status, 400);
      [a, b, c, d] = await Promise.all([0, 1, 2, 3].map(register));
      assert.equal(await load(a), null);
      assert.equal((await request("/api/auth/register", null, a)).status, 409);
      assert.equal((await request("/api/auth/login", null, { email: a.email, password: "incorrect" })).status, 401);
    });

    await t.test("creation defaults, 199.9 m rejection, date line and idempotent foundation", async () => {
      location = { lat: -55 - Math.random() * 5, lng: 179.9998 };
      const creation = { ...location, baseName: "Poblado A", playerName: "Novata A", sex: "chica" };
      assert.equal((await request("/api/mundo/jugador", a, { ...creation, sex: "invalid" })).status, 400);
      assert.equal((await request("/api/mundo/jugador", a, creation)).status, 200);
      const session = await load(a);
      assert.equal(session.player.sex, "chica");
      assert.equal(session.player.characterClass, "Novato");
      assert.equal(session.player.gold, 100);
      assert.equal(session.player.currentHealth, 40);
      assert.equal(session.player.maxHealth, 100);
      const near = { ...creation, playerName: "Novato B", sex: "chico", lat: location.lat + 199.9 / 6_371_000 * 180 / Math.PI };
      const rejected = await request("/api/mundo/jugador", b, near);
      assert.equal(rejected.status, 409);
      assert.equal(rejected.data.code, "base_too_close");
      assert.equal((await request("/api/mundo/jugador", b, { ...near, lat: location.lat, lng: -179.9998 })).status, 409);
      assert.equal((await request("/api/mundo/jugador", b, { ...near, lat: location.lat + 0.004 })).status, 200);
      assert.equal((await request("/api/mundo/jugador", c, { ...creation, baseName: "Poblado C", lat: location.lat + 0.008 })).status, 200);
      const repeats = await Promise.all([
        request("/api/mundo/jugador", d, { ...creation, lat: location.lat + 0.012 }),
        request("/api/mundo/jugador", d, { ...creation, lat: location.lat + 0.012 }),
      ]);
      assert.ok(repeats.every((result) => result.status === 200));
      assert.equal(repeats[0].data.session.player.id, repeats[1].data.session.player.id);
      await Promise.all([a, b, c, d].map(load));
      assert.ok(a.session.nearbyBases.some((base) => base.playerId === b.session.player.id));
    });

    await t.test("engine construction and 4 s HTTP sync restore profile, gold, level and building order", async () => {
      const player = new PlayerProgression({
        name: a.session.player.name, characterClass: "Novato", level: 1, experience: 0, gold: 100, currentHealth: 40,
      });
      const village = new VillageProgression(a.session.base.buildings);
      const gateway = { async sync(body) {
        const result = await request("/api/mundo/sync", a, body);
        return result.status === 200 ? { ok: true, snapshot: result.data } : { ok: false, ...result.data };
      } };
      const manager = new PartyManager(gateway, player, village, a.session.progressToken);
      const tick = (seconds) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error("La sincronización no terminó en 20 s."));
        }, 20_000);
        const unsubscribe = manager.subscribe(() => {
          const state = manager.getSnapshot();
          if (state.syncStatus === "saved") { clearTimeout(timeout); unsubscribe(); resolve(); }
          else if (state.syncStatus === "error" || state.syncStatus === "conflict") { clearTimeout(timeout); unsubscribe(); reject(new Error(state.syncMessage)); }
        });
        manager.update(seconds);
      });
      try {
        await tick(0);
        // Snapshot listeners run before the in-flight request finishes unwinding.
        await new Promise((resolve) => setImmediate(resolve));
        village.upgradeTownHall();
        for (const [type, position] of [["tavern", 1], ["embassy", 3]]) {
          assert.equal(village.startConstruction(type, position), true);
          for (let frame = 0; frame < 601; frame++) village.update(0.1);
        }
        player.gainExperience(125);
        player.spendGold(10);
        await tick(4);
        const restored = await load(a);
        assert.equal(restored.player.name, "Novata A");
        assert.equal(restored.player.sex, "chica");
        assert.equal(restored.player.level, 2);
        assert.equal(restored.player.gold, 90);
        assert.equal(restored.player.currentHealth, 50);
        assert.equal(restored.player.maxHealth, 110);
        assert.deepEqual(restored.base.buildings, village.getSavedBuildings());
      } finally { manager.destroy(); }
    });

    await t.test("invalid saves and obsolete tabs cannot overwrite persisted progress", async () => {
      const stale = progress(a.session);
      assert.equal((await request("/api/mundo/sync", a, {})).status, 400);
      assert.equal((await request("/api/mundo/sync", a, { ...stale, buildings: [] })).status, 400);
      const ambiguousSave = { ...stale, gold: 88 };
      assert.equal((await request("/api/mundo/sync", a, ambiguousSave)).status, 200);
      // Simulate losing the successful response and retrying its exact payload.
      assert.equal((await request("/api/mundo/sync", a, ambiguousSave)).status, 200);
      await load(a);
      await sync(a, { gold: 89 });
      const conflict = await request("/api/mundo/sync", a, { ...stale, gold: 100, buildings: [{ type: "town-hall", level: 1 }] });
      assert.equal(conflict.status, 409);
      assert.equal(conflict.data.code, "progress_conflict");
      await load(a);
      assert.equal(a.session.player.gold, 89);
      assert.equal(a.session.base.buildings.length, 3);
    });

    await t.test("both embassies required; reject, accept, duplicate response and leave", async () => {
      await party(a, { action: "invite", targetPlayerId: b.session.player.id }, 403);
      const buildings = [{ type: "town-hall", level: 2 }, { type: "tavern", level: 1 }, { type: "embassy", level: 1 }];
      await sync(b, { buildings });
      await party(a, { action: "invite", targetPlayerId: b.session.player.id });
      let view = await sync(b);
      assert.equal(view.invitations.length, 1);
      await party(a, { action: "respond", invitationId: view.invitations[0].id, accept: true }, 410);
      await party(b, { action: "respond", invitationId: view.invitations[0].id, accept: false });
      assert.equal((await sync(b)).invitations.length, 0);
      await party(a, { action: "invite", targetPlayerId: b.session.player.id });
      view = await sync(b);
      const invitationId = view.invitations[0].id;
      await party(b, { action: "respond", invitationId, accept: true });
      await party(b, { action: "respond", invitationId, accept: true }, 410);
      assert.equal((await sync(a)).members.length, 2);
      assert.equal((await sync(b)).members.length, 2);
      await party(b, { action: "leave" });
      assert.equal((await sync(a)).members.length, 0);
      assert.equal((await sync(b)).members.length, 0);
    });

    await t.test("3-player capacity, only leader invites, expired invitations and cancellation commit", async () => {
      const buildings = [{ type: "town-hall", level: 2 }, { type: "embassy", level: 1 }];
      await sync(c, { buildings });
      await sync(d, { buildings });
      await party(a, { action: "invite", targetPlayerId: b.session.player.id });
      await party(b, { action: "respond", invitationId: (await sync(b)).invitations[0].id, accept: true });
      await party(b, { action: "invite", targetPlayerId: c.session.player.id }, 403);
      await party(a, { action: "invite", targetPlayerId: c.session.player.id });
      await party(c, { action: "respond", invitationId: (await sync(c)).invitations[0].id, accept: true });
      await party(a, { action: "invite", targetPlayerId: d.session.player.id }, 409);
      await party(a, { action: "leave" });
      assert.ok((await sync(b)).members.some((member) => member.playerId === b.session.player.id && member.isLeader));
      await party(b, { action: "leave" });
      await party(a, { action: "invite", targetPlayerId: d.session.player.id });
      let invitation = (await sync(d)).invitations[0];
      await prisma.invitacionParty.update({ where: { id: invitation.id }, data: { expira: new Date(0) } });
      await party(d, { action: "respond", invitationId: invitation.id, accept: true }, 410);
      await party(a, { action: "invite", targetPlayerId: d.session.player.id });
      invitation = (await sync(d)).invitations[0];
      await party(b, { action: "invite", targetPlayerId: a.session.player.id });
      await party(a, { action: "respond", invitationId: (await sync(a)).invitations[0].id, accept: true });
      await party(d, { action: "respond", invitationId: invitation.id, accept: true }, 410);
      assert.equal((await prisma.invitacionParty.findUnique({ where: { id: invitation.id } })).estado, "CANCELADA");
      await party(a, { action: "leave" });
    });

    await t.test("returning account login restores the same character and nearby embassy markers", async () => {
      await request("/api/auth/logout", a, {});
      assert.equal((await request("/api/mundo/jugador", a)).status, 401);
      assert.equal((await request("/api/auth/login", a, { email: a.email, password })).status, 200);
      const session = await load(a);
      assert.equal(session.player.gold, 89);
      assert.equal(session.player.level, 2);
      assert.equal(session.base.name, "Poblado A");
      assert.ok(session.nearbyBases.find((base) => base.playerId === b.session.player.id).hasEmbassy);
    });

    const exteriorLocation = { sceneId: "exterior-world", x: 3500, y: 4400, direction: "right" };
    const mobilityProgress = new Map();
    let savedJourney, journeyRevision;
    async function reloadMobility(account) {
      const session = await load(account);
      const before = mobilityProgress.get(account);
      assert.equal(session.progressToken, before.progressToken);
      assert.equal(session.player.gold, before.gold);
      return session.mobility;
    }

    await t.test("mobility PATCH requires authentication; checkpoints persist and reject stale revisions", async () => {
      assert.equal((await request("/api/mundo/jugador", null, {
        action: "checkpoint", revision: 0, location: exteriorLocation,
      }, "PATCH")).status, 401);
      await load(a);
      mobilityProgress.set(a, { progressToken: a.session.progressToken, gold: a.session.player.gold });
      const revision = a.session.mobility.revision;
      assert.ok(Number.isInteger(revision) && revision >= 0);
      const checkpoint = await request("/api/mundo/jugador", a, {
        action: "checkpoint", revision, location: exteriorLocation,
      }, "PATCH");
      assert.equal(checkpoint.status, 200);
      assert.equal(checkpoint.data.mobility.revision, revision + 1);
      assert.deepEqual(checkpoint.data.mobility.location, exteriorLocation);
      assert.equal(checkpoint.data.mobility.journey, null);
      const restored = await reloadMobility(a);
      assert.equal(restored.revision, revision + 1);
      assert.deepEqual(restored.location, exteriorLocation);
      assert.equal(restored.journey, null);
      const stale = await request("/api/mundo/jugador", a, {
        action: "checkpoint", revision, location: BASE_RETURN_LOCATION,
      }, "PATCH");
      assert.equal(stale.status, 409);
      assert.equal(stale.data.code, "location_conflict");
      const unchanged = await reloadMobility(a);
      assert.equal(unchanged.revision, restored.revision);
      assert.deepEqual(unchanged.location, exteriorLocation);
      assert.equal(unchanged.journey, null);
    });

    await t.test("mobility checkpoints reject an unbuilt tavern without changing progress", async () => {
      await load(d);
      mobilityProgress.set(d, { progressToken: d.session.progressToken, gold: d.session.player.gold });
      assert.ok(d.session.base.buildings.some((building) => building.type === "embassy" && building.level >= 1));
      assert.ok(!d.session.base.buildings.some((building) => building.type === "tavern" && building.level >= 1));
      const before = d.session.mobility;
      const rejected = await request("/api/mundo/jugador", d, {
        action: "checkpoint", revision: before.revision,
        location: { sceneId: "tavern-interior", x: 80, y: 80, direction: "up" },
      }, "PATCH");
      assert.equal(rejected.status, 403);
      assert.equal(rejected.data.code, "scene_unavailable");
      const unchanged = await reloadMobility(d);
      assert.equal(unchanged.revision, before.revision);
      assert.deepEqual(unchanged.location, before.location);
      assert.deepEqual(unchanged.journey, before.journey);
    });

    await t.test("return cart uses server destination and times; concurrent calls share one persisted journey", async () => {
      const before = await reloadMobility(a);
      for (const field of ["departureAt", "arrivalAt"]) {
        const injected = await request("/api/mundo/jugador", a, {
          action: "call-cart", revision: before.revision, [field]: Date.now(),
        }, "PATCH");
        assert.equal(injected.status, 400);
        assert.equal(injected.data.code, "invalid_body");
      }
      const unchanged = await reloadMobility(a);
      assert.equal(unchanged.revision, before.revision);
      assert.deepEqual(unchanged.location, exteriorLocation);
      assert.equal(unchanged.journey, null);
      const calls = await Promise.all([0, 1].map(() => request("/api/mundo/jugador", a, {
        action: "call-cart", revision: before.revision,
      }, "PATCH")));
      assert.ok(calls.every((result) => result.status === 200));
      const mobility = calls[0].data.mobility;
      savedJourney = mobility.journey;
      journeyRevision = before.revision + 1;
      assert.ok(savedJourney && typeof savedJourney.id === "string" && savedJourney.id.length > 0);
      assert.deepEqual(calls[1].data.mobility.journey, savedJourney);
      for (const result of calls) {
        assert.equal(result.data.mobility.revision, journeyRevision);
        assert.deepEqual(result.data.mobility.location, exteriorLocation);
      }
      assert.equal(savedJourney.fromX, exteriorLocation.x);
      assert.equal(savedJourney.fromY, exteriorLocation.y);
      assert.equal(savedJourney.toX, EXTERIOR_HOME_POSITION.x);
      assert.equal(savedJourney.toY, EXTERIOR_HOME_POSITION.y);
      assert.ok(Number.isSafeInteger(savedJourney.departureAt));
      assert.ok(Number.isSafeInteger(savedJourney.arrivalAt));
      // Concurrent HTTP requests may be processed in either order; the second
      // response acknowledges the original departure with a newer serverNow.
      assert.ok(savedJourney.departureAt >= before.serverNow);
      assert.ok(calls.every((result) => savedJourney.departureAt <= result.data.mobility.serverNow));
      const duration = Math.max(MIN_TRIP_DURATION_MS, Math.ceil(Math.hypot(
        exteriorLocation.x - EXTERIOR_HOME_POSITION.x,
        exteriorLocation.y - EXTERIOR_HOME_POSITION.y,
      ) / CART_SPEED * 1000));
      assert.equal(savedJourney.arrivalAt - savedJourney.departureAt, duration);
      const restored = await reloadMobility(a);
      assert.equal(restored.revision, journeyRevision);
      assert.deepEqual(restored.location, exteriorLocation);
      assert.deepEqual(restored.journey, savedJourney);
      await party(a, { action: "leave" }, 409);
      const blocked = await request("/api/mundo/jugador", a, {
        action: "checkpoint", revision: journeyRevision, location: BASE_RETURN_LOCATION,
      }, "PATCH");
      assert.equal(blocked.status, 409);
      assert.equal(blocked.data.code, "travel_active");
      const stillTravelling = await reloadMobility(a);
      assert.equal(stillTravelling.revision, journeyRevision);
      assert.deepEqual(stillTravelling.location, exteriorLocation);
      assert.deepEqual(stillTravelling.journey, savedJourney);
    });

    await t.test("offline return resolves exactly once and stale checkpoints cannot overwrite arrival", async () => {
      assert.ok(savedJourney && Number.isInteger(journeyRevision));
      const now = Date.now();
      const expiredJourney = { ...savedJourney, departureAt: now - 10_000, arrivalAt: now - 1 };
      assert.ok(expiredJourney.arrivalAt - expiredJourney.departureAt >= MIN_TRIP_DURATION_MS);
      // Only this run's account A is changed; preserve the server-issued journey and endpoints.
      await prisma.jugador.update({
        where: { id: a.session.player.id }, data: { viajeRegreso: expiredJourney },
      });
      const arrived = await reloadMobility(a);
      assert.equal(arrived.revision, journeyRevision + 1);
      assert.deepEqual(arrived.location, BASE_RETURN_LOCATION);
      assert.equal(arrived.journey, null);
      const reloaded = await reloadMobility(a);
      assert.equal(reloaded.revision, arrived.revision);
      assert.deepEqual(reloaded.location, BASE_RETURN_LOCATION);
      assert.equal(reloaded.journey, null);
      const stale = await request("/api/mundo/jugador", a, {
        action: "checkpoint", revision: journeyRevision, location: exteriorLocation,
      }, "PATCH");
      assert.equal(stale.status, 409);
      assert.equal(stale.data.code, "location_conflict");
      const unchanged = await reloadMobility(a);
      assert.equal(unchanged.revision, arrived.revision);
      assert.deepEqual(unchanged.location, BASE_RETURN_LOCATION);
      assert.equal(unchanged.journey, null);
    });

    async function expedition(account, body, status = 200, code) {
      const result = await request("/api/mundo/expediciones", account, body);
      assert.equal(result.status, status, JSON.stringify(result.data));
      assert.equal(result.data.ok, status === 200);
      if (code) assert.equal(result.data.code, code);
      return result.data.snapshot;
    }

    async function checkpointBase(account) {
      await load(account);
      const result = await request("/api/mundo/jugador", account, {
        action: "checkpoint", revision: account.session.mobility.revision, location: BASE_RETURN_LOCATION,
      }, "PATCH");
      assert.equal(result.status, 200);
      assert.deepEqual((await load(account)).mobility.location, BASE_RETURN_LOCATION);
    }

    async function expireExpeditionLeg(account, active, field) {
      assert.ok(["arrivalAt", "returnArrivalAt", "enemyTurnAt"].includes(field));
      // Only dates on A's own server-created ledger are advanced, never stats or outcomes.
      assert.equal(account, a);
      const row = await prisma.expedicionMundo.findUniqueOrThrow({ where: { id: active.id } });
      assert.equal(row.jugadorId, account.session.player.id);
      await prisma.expedicionMundo.update({
        where: { id: row.id }, data: { [field]: new Date(Date.now() - 1) },
      });
    }

    async function resolveHttpEnemyTurn(account, snapshot) {
      const before = snapshot;
      assert.equal(before.active.turn, "enemy");
      assert.ok(Number.isSafeInteger(before.active.enemyTurnAt));
      assert.ok(before.active.enemyTurnAt >= before.serverNow);
      const row = await prisma.expedicionMundo.findUniqueOrThrow({ where: { id: before.active.id } });
      assert.equal(row.enemyTurnAt.getTime(), before.active.enemyTurnAt);
      // Capture the server-derived deadline before expiring only this disposable ledger.
      await expireExpeditionLeg(account, before.active, "enemyTurnAt");
      snapshot = await expedition(account, { action: "status" });
      const damage = Math.min(before.active.playerHealth, Math.max(1, before.active.enemy.attack -
        (5 + Math.max(0, before.profile.level - 1))));
      assert.equal(snapshot.active.playerHealth, before.active.playerHealth - damage);
      assert.equal(snapshot.active.enemyHealth, before.active.enemyHealth);
      assert.equal(snapshot.profile.currentHealth, snapshot.active.playerHealth);
      assert.equal(snapshot.active.version, before.active.version + 1);
      assert.equal(snapshot.rewardRevision, before.rewardRevision + 1);
      assert.equal(snapshot.active.turn, "player"); assert.equal(snapshot.active.enemyTurnAt, null);
      assert.deepEqual(snapshot.active.lastAction, {
        id: snapshot.active.version, actor: "enemy", kind: "attack", damage, at: snapshot.serverNow,
      });
      const repeated = await expedition(account);
      assert.deepEqual(repeated.active, snapshot.active); assert.deepEqual(repeated.profile, snapshot.profile);
      assert.equal(repeated.rewardRevision, snapshot.rewardRevision);
      return snapshot;
    }

    async function winExpedition(account, snapshot) {
      assert.equal(snapshot.active.phase, "battle");
      const enemy = snapshot.active.enemy;
      const attack = 8 + Math.max(0, snapshot.profile.level - 1);
      const defense = 5 + Math.max(0, snapshot.profile.level - 1);
      const turns = Math.ceil(snapshot.active.enemyHealth / Math.max(1, attack - enemy.defense));
      assert.ok(turns <= 30, "Selected mission must be winnable within 30 attacks");
      assert.ok(snapshot.active.playerHealth > (turns - 1 + (snapshot.active.turn === "enemy" ? 1 : 0)) * Math.max(1, enemy.attack - defense),
        "Selected mission must leave enough health for victory");
      for (let turn = 0; turn < 30 && snapshot.active.phase === "battle"; turn++) {
        if (snapshot.active.turn === "enemy") snapshot = await resolveHttpEnemyTurn(account, snapshot);
        assert.equal(snapshot.active.turn, "player");
        const command = { action: "attack", expeditionId: snapshot.active.id, version: snapshot.active.version };
        const before = snapshot;
        snapshot = await expedition(account, command);
        assert.equal(snapshot.active.version, before.active.version + 1);
        assert.equal(snapshot.rewardRevision, before.rewardRevision +
          (snapshot.active.outcome === "victory" && snapshot.active.mission.kind === "elite" ? 1 : 0));
        assert.equal(snapshot.active.playerHealth, before.active.playerHealth);
        assert.deepEqual(snapshot.profile, before.profile);
        assert.deepEqual(snapshot.active.lastAction, {
          id: snapshot.active.version, actor: "player", kind: "attack",
          damage: before.active.enemyHealth - snapshot.active.enemyHealth, at: snapshot.serverNow,
        });
        if (snapshot.active.phase === "battle") {
          assert.equal(snapshot.active.turn, "enemy");
          assert.equal(snapshot.active.enemyTurnAt, snapshot.serverNow + 1000);
          for (const action of ["attack", "flee"]) await expedition(account, {
            action, expeditionId: snapshot.active.id, version: snapshot.active.version,
          }, 409, "not_your_turn");
        } else {
          assert.equal(snapshot.active.turn, "player"); assert.equal(snapshot.active.enemyTurnAt, null);
        }
        await expedition(account, command, 409, "expedition_conflict");
        const repeated = await expedition(account);
        assert.deepEqual(repeated.active, snapshot.active);
        assert.deepEqual(repeated.profile, snapshot.profile);
        assert.deepEqual(snapshot.inventory, before.inventory);
        assert.deepEqual(repeated.inventory, snapshot.inventory);
        assert.deepEqual(snapshot.active.awardedLoot, []);
        assert.equal(repeated.rewardRevision, snapshot.rewardRevision);
      }
      assert.equal(snapshot.active.phase, "returning", "Combat must finish within 30 attacks");
      assert.equal(snapshot.active.outcome, "victory");
      assert.equal(snapshot.active.rewardGranted, false);
      assert.equal(snapshot.active.returnArrivalAt - snapshot.active.returnDepartureAt, snapshot.active.mission.durationMs);
      return snapshot;
    }

    function assertReward(before, after, expectedMission) {
      assert.equal(after.active.mission.id, expectedMission.id);
      assert.equal(after.active.mission.gold, expectedMission.gold);
      assert.equal(after.active.mission.experience, expectedMission.experience);
      const totalExperience = before.profile.experience + expectedMission.experience;
      const levels = Math.floor(totalExperience / 100);
      assert.equal(after.profile.gold, before.profile.gold + expectedMission.gold);
      assert.equal(after.profile.experience, totalExperience % 100);
      assert.equal(after.profile.level, before.profile.level + levels);
      assert.equal(after.profile.maxHealth, before.profile.maxHealth + levels * 10);
      assert.equal(after.profile.currentHealth, before.profile.currentHealth + levels * 10);
      assert.equal(after.rewardRevision, before.rewardRevision + 1);
      assert.notEqual(after.progressToken, before.progressToken);
      assert.equal(after.active.phase, "completed");
      assert.equal(after.active.rewardGranted, true);
      // An empty roll is valid: all preview chances are below 100%.
      const awarded = expectedMission.kind === "trade" ? [] : (expectedMission.loot ?? [])
        .filter((item) => createHash("sha256").update(`${after.active.id}:${item.id}`)
          .digest().readUInt32BE(0) / 0x1_0000_0000 < item.chance / 100)
        .map(({ id, name, quantity }) => ({ id, name, quantity }));
      assert.deepEqual(after.active.awardedLoot, awarded);
      const inventory = new Map(before.inventory.map((item) => [item.id, { ...item }]));
      for (const item of awarded) {
        inventory.set(item.id, { ...item, quantity: (inventory.get(item.id)?.quantity ?? 0) + item.quantity });
      }
      assert.deepEqual(after.inventory, [...inventory.values()]);
    }

    function assertCatalog(snapshot) {
      const combatMissions = snapshot.missions.filter((mission) => mission.kind !== "trade");
      assert.equal(combatMissions.filter((mission) => mission.kind === "normal").length, 3);
      assert.equal(combatMissions.filter((mission) => mission.kind === "elite").length, 1);
      assert.equal(new Set(combatMissions.map((mission) => mission.name)).size, 4);
      for (const mission of combatMissions) {
        assert.ok(Number.isInteger(mission.enemyLevel));
        assert.ok(mission.enemyLevel >= Math.max(1, snapshot.profile.level - 3));
        assert.ok(mission.enemyLevel <= snapshot.profile.level + 3);
        assert.equal(mission.enemy.level, mission.enemyLevel);
        assert.ok(mission.id.includes(`:${snapshot.profile.level}:`));
        assert.ok(mission.description.length > 30);
        const growth = mission.enemyLevel - 1;
        const elite = mission.kind === "elite";
        assert.equal(mission.enemy.maxHealth, elite ? 35 + growth * 4 : 12 + mission.enemyLevel * 2);
        assert.equal(mission.enemy.attack, elite ? 3 + growth : 1 + Math.floor(growth / 3));
        assert.equal(mission.enemy.defense, elite ? 3 + Math.floor(growth / 3) : 0);
        assert.equal(mission.enemy.speed, (mission.enemy.sprite.endsWith("arana.png") ? 6 : 3) + Math.floor(mission.enemyLevel / 4));
        const gold = elite ? 60 + mission.distanceKm * 10 + growth * 12 : 15 + mission.distanceKm * 5 + growth * 4;
        const experience = elite ? 75 + mission.distanceKm * 4 + growth * 15 : 25 + mission.distanceKm * 2 + growth * 5;
        for (const [field, base] of [["gold", gold], ["experience", experience]]) {
          assert.ok(Number.isInteger(mission[field]));
          assert.ok(mission[field] >= Math.max(1, Math.floor(base * 0.8)) && mission[field] <= Math.ceil(base * 1.2));
        }
        assert.deepEqual(mission.loot.map((item) => item.id), ["world-potion", "world-ration", "world-relic"]);
        assert.ok(mission.loot.every((item) => item.name.length > 0 && item.chance > 0 && item.chance < 100 &&
          Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= (elite ? 3 : 2)));
      }
    }

    function weakestNormal(snapshot) {
      assertCatalog(snapshot);
      const missions = snapshot.missions.filter((mission) => mission.kind === "normal");
      return missions.reduce((weakest, mission) => mission.enemyLevel < weakest.enemyLevel ? mission : weakest);
    }

    async function assertPersistedMission(account, snapshot, mission) {
      const row = await prisma.expedicionMundo.findUniqueOrThrow({ where: { id: snapshot.active.id } });
      assert.equal(row.jugadorId, account.session.player.id);
      // PostgreSQL JSON numbers may differ in their last geographic decimal.
      const content = (value) => {
        const result = { ...value };
        delete result.lat;
        delete result.lng;
        delete result.distanceKm;
        return result;
      };
      assert.deepEqual(content(snapshot.active.mission), content(mission));
      assert.deepEqual(content(row.mission), content(mission));
      assert.ok(Math.abs(row.mission.lat - mission.lat) < 1e-9);
      assert.ok(Math.abs(row.mission.lng - mission.lng) < 1e-9);
      assert.ok(Math.abs(row.mission.distanceKm - mission.distanceKm) < 1e-9);
      assert.deepEqual(snapshot.active.enemy, mission.enemy);
      assert.deepEqual(row.enemy, mission.enemy);
      assert.equal(row.enemyHealth, mission.enemy.maxHealth);
      assert.deepEqual(row.botin, []);
      assert.deepEqual(snapshot.active.awardedLoot, []);
      assert.equal(row.playerSpeed, 5); assert.equal(snapshot.active.playerSpeed, 5);
      assert.equal(row.turn, "player"); assert.equal(snapshot.active.turn, "player");
      assert.equal(row.enemyTurnAt, null); assert.equal(snapshot.active.enemyTurnAt, null);
      assert.equal(row.lastAction, null); assert.equal(snapshot.active.lastAction, null);
    }

    async function assertSavedExpedition(account, snapshot) {
      const session = await load(account);
      assert.deepEqual(session.player, snapshot.profile);
      assert.equal(session.rewardRevision, snapshot.rewardRevision);
      assert.equal(session.progressToken, snapshot.progressToken);
      const player = await prisma.jugador.findUniqueOrThrow({ where: { id: session.player.id } });
      assert.deepEqual(player.inventarioMundo, snapshot.inventory);
      if (snapshot.active) {
        const ledger = await prisma.expedicionMundo.findUniqueOrThrow({ where: { id: snapshot.active.id } });
        assert.deepEqual(ledger.botin, snapshot.active.awardedLoot);
        assert.equal(ledger.turn, snapshot.active.turn);
        assert.equal(ledger.enemyTurnAt?.getTime() ?? null, snapshot.active.enemyTurnAt);
        assert.deepEqual(ledger.lastAction, snapshot.active.lastAction);
        assert.equal(ledger.playerSpeed, snapshot.active.playerSpeed);
      }
      const repeated = await expedition(account, { action: "status" });
      assert.deepEqual(repeated.active, snapshot.active);
      assert.deepEqual(repeated.profile, snapshot.profile);
      assert.equal(repeated.rewardRevision, snapshot.rewardRevision);
      assert.equal(repeated.progressToken, snapshot.progressToken);
      assert.deepEqual(repeated.inventory, snapshot.inventory);
    }

    await t.test("expedition authentication and strict payloads reject forged rewards, enemies, loot and client times", async () => {
      await expedition(null, undefined, 401);
      await expedition(null, { action: "status" }, 401);
      const before = await expedition(a);
      assert.equal(before.active, null);
      assert.deepEqual(before.inventory, []);
      const mission = weakestNormal(before);
      for (const field of ["gold", "experience", "rewardGranted", "departureAt", "arrivalAt", "returnArrivalAt", "ultimaEliteExitosa"]) {
        await expedition(a, {
          action: "start", missionId: mission.id, requestId: randomUUID(), [field]: Date.now(),
        }, 400, "invalid_body");
      }
      const forgedFields = {
        turn: "player", enemyTurnAt: 0, playerSpeed: 999,
        lastAction: { id: 1, actor: "player", kind: "attack", damage: 999, at: 0 },
        enemyLevel: 1, enemy: { ...mission.enemy, maxHealth: 1, attack: 0, defense: 0 },
        loot: [{ id: "world-relic", name: "Fragmento de reliquia", quantity: 999999, chance: 100 }],
        awardedLoot: [{ id: "world-relic", name: "Fragmento de reliquia", quantity: 999999 }],
        inventory: [{ id: "world-potion", name: "Poción curativa", quantity: 999999 }],
      };
      for (const [field, value] of Object.entries(forgedFields)) {
        for (const command of [
          { action: "start", missionId: mission.id, requestId: randomUUID() },
          { action: "attack", expeditionId: randomUUID(), version: 0 },
          { action: "flee", expeditionId: randomUUID(), version: 0 },
          { action: "status" },
        ]) {
          await expedition(a, { ...command, [field]: value }, 400, "invalid_body");
        }
      }
      await expedition(a, { action: "status", gold: 999999 }, 400, "invalid_body");
      await expedition(a, { action: "start", missionId: mission.id, requestId: "invalid" }, 400, "invalid_request");
      const unchanged = await expedition(a, { action: "status" });
      assert.equal(unchanged.active, null);
      assert.deepEqual(unchanged.profile, before.profile);
      assert.deepEqual(unchanged.inventory, before.inventory);
      assert.equal(unchanged.rewardRevision, before.rewardRevision);
      assert.equal(await prisma.expedicionMundo.count({ where: { jugadorId: a.session.player.id } }), 0);
    });

    await t.test("normal HTTP expedition: concurrent UUID replay, versioned combat and exactly-once rewards recover stale sync", async () => {
      await checkpointBase(a);
      await sync(a, { currentHealth: 40 });
      // Seed only this disposable player's new JSON inventory, never legacy objects.
      const initialInventory = [{ id: "world-potion", name: "Poción curativa", quantity: 2 }];
      await prisma.jugador.update({ where: { id: a.session.player.id }, data: { inventarioMundo: initialInventory } });
      const stale = progress(a.session);
      const before = await expedition(a);
      assert.equal(before.profile.currentHealth, 40);
      assert.deepEqual(before.inventory, initialInventory);
      const mission = weakestNormal(before);
      assert.ok(mission);
      assert.equal(mission.enemyLevel, Math.min(...before.missions.filter((candidate) => candidate.kind === "normal")
        .map((candidate) => candidate.enemyLevel)));
      const command = { action: "start", missionId: mission.id, requestId: randomUUID() };
      const starts = await Promise.all([expedition(a, command), expedition(a, command)]);
      assert.equal(starts[0].active.id, starts[1].active.id);
      let snapshot = starts[0];
      assert.equal(snapshot.active.phase, "outbound");
      assert.equal(snapshot.active.mission.id, mission.id);
      assert.ok(Math.abs(snapshot.active.mission.lng - mission.lng) < 1e-9);
      assert.ok(Math.abs(snapshot.active.mission.lat - mission.lat) < 1e-9);
      assert.deepEqual(snapshot.active.origin, { lat: a.session.base.lat, lng: a.session.base.lng });
      assert.equal(snapshot.active.arrivalAt - snapshot.active.departureAt, mission.durationMs);
      assert.ok(snapshot.active.departureAt >= before.serverNow && snapshot.active.departureAt <= snapshot.serverNow);
      await assertPersistedMission(a, snapshot, mission);
      assert.deepEqual(snapshot.inventory, before.inventory);
      assert.deepEqual((await expedition(a, command)).active, snapshot.active);
      assert.equal(await prisma.expedicionMundo.count({ where: { jugadorId: a.session.player.id, requestId: command.requestId } }), 1);
      await expireExpeditionLeg(a, snapshot.active, "arrivalAt");
      snapshot = await expedition(a);
      snapshot = await winExpedition(a, snapshot);
      assert.equal(snapshot.profile.gold, before.profile.gold);
      assert.equal(snapshot.profile.experience, before.profile.experience);
      const returning = snapshot;
      await expireExpeditionLeg(a, snapshot.active, "returnArrivalAt");
      const completed = await Promise.all([expedition(a), expedition(a)]);
      snapshot = completed[0];
      assertReward(returning, snapshot, mission);
      assert.deepEqual(completed[1].profile, snapshot.profile);
      assert.deepEqual(completed[1].active, snapshot.active);
      assert.deepEqual(completed[1].inventory, snapshot.inventory);
      assert.equal(completed[1].rewardRevision, snapshot.rewardRevision);
      const replayed = await expedition(a, command);
      assert.deepEqual(replayed.active, snapshot.active);
      assert.deepEqual(replayed.inventory, snapshot.inventory);
      assert.equal(replayed.rewardRevision, snapshot.rewardRevision);
      const recovered = await request("/api/mundo/sync", a, stale);
      assert.equal(recovered.status, 200);
      assert.equal(recovered.data.profileReset, true);
      assert.deepEqual(recovered.data.profile, snapshot.profile);
      assert.equal(recovered.data.rewardRevision, snapshot.rewardRevision);
      assert.equal(recovered.data.progressToken, snapshot.progressToken);
      await assertSavedExpedition(a, snapshot);
      assert.deepEqual(a.session.base.buildings, stale.buildings);
      assert.equal((await request("/api/auth/logout", a, {})).status, 200);
      assert.equal((await request("/api/auth/login", a, { email: a.email, password })).status, 200);
      await assertSavedExpedition(a, snapshot);
    });

    await t.test("elite HTTP victory sets server cooldown for 23h30 and persists rewards/revision", async () => {
      await checkpointBase(a);
      await sync(a, { currentHealth: 100 });
      const before = await expedition(a);
      assert.equal(before.profile.currentHealth, 100);
      assertCatalog(before);
      const mission = before.missions.find((candidate) => candidate.kind === "elite");
      assert.ok(mission);
      assert.equal(before.eliteAvailableAt, 0);
      let snapshot = await expedition(a, { action: "start", missionId: mission.id, requestId: randomUUID() });
      await assertPersistedMission(a, snapshot, mission);
      await expireExpeditionLeg(a, snapshot.active, "arrivalAt");
      snapshot = await winExpedition(a, await expedition(a));
      const player = await prisma.jugador.findUniqueOrThrow({ where: { id: a.session.player.id } });
      assert.ok(player.ultimaEliteExitosa instanceof Date);
      assert.equal(player.ultimaEliteExitosa.getTime(), snapshot.active.returnDepartureAt);
      assert.equal(snapshot.eliteAvailableAt, player.ultimaEliteExitosa.getTime() + (23 * 60 + 30) * 60_000);
      assert.ok(snapshot.eliteAvailableAt > snapshot.serverNow);
      const returning = snapshot;
      await expireExpeditionLeg(a, snapshot.active, "returnArrivalAt");
      snapshot = await expedition(a);
      assertReward(returning, snapshot, mission);
      assert.equal(snapshot.eliteAvailableAt, returning.eliteAvailableAt);
      const currentElite = snapshot.missions.find((candidate) => candidate.kind === "elite");
      await expedition(a, { action: "start", missionId: currentElite.id, requestId: randomUUID() }, 409, "elite_cooldown");
      await assertSavedExpedition(a, snapshot);
      const saved = await sync(a);
      assert.equal(saved.profileReset, false);
      assert.deepEqual(saved.profile, snapshot.profile);
      assert.equal(saved.rewardRevision, snapshot.rewardRevision);
      await assertSavedExpedition(a, snapshot);
      assert.equal((await request("/api/auth/logout", a, {})).status, 200);
      assert.equal((await request("/api/auth/login", a, { email: a.email, password })).status, 200);
      await assertSavedExpedition(a, snapshot);
    });

    await t.test("trade HTTP credits live B exactly one integral quarter and stale recipient sync cannot undo payment", async () => {
      await checkpointBase(a);
      const staleRecipient = progress(await load(b));
      const recipientBefore = await expedition(b);
      const before = await expedition(a);
      assertCatalog(before);
      const mission = before.missions.find((candidate) => candidate.kind === "trade" && candidate.targetPlayerId === b.session.player.id);
      assert.ok(mission, "Choose this run's live account B, never an arbitrary nearby base");
      assert.equal(mission.gold % 4, 0);
      assert.ok(Number.isInteger(mission.gold / 4));
      const command = { action: "start", missionId: mission.id, requestId: randomUUID() };
      let snapshot = await expedition(a, command);
      assert.equal(snapshot.active.phase, "outbound");
      assert.equal(snapshot.active.enemy, null);
      assert.equal(mission.enemyLevel, undefined);
      assert.equal(mission.enemy, undefined);
      assert.equal(mission.loot, undefined);
      assert.equal(mission.experience, 25);
      await expireExpeditionLeg(a, snapshot.active, "arrivalAt");
      snapshot = await expedition(a);
      assert.equal(snapshot.active.phase, "returning");
      assert.equal(snapshot.active.outcome, "trade");
      assert.equal(snapshot.active.rewardGranted, false);
      assert.equal(snapshot.active.returnArrivalAt - snapshot.active.returnDepartureAt, mission.durationMs);
      assert.deepEqual(snapshot.profile, before.profile);
      assert.deepEqual((await expedition(b)).profile, recipientBefore.profile);
      await expireExpeditionLeg(a, snapshot.active, "returnArrivalAt");
      snapshot = await expedition(a);
      assertReward(before, snapshot, mission);
      const recipient = await expedition(b);
      assert.deepEqual(recipient.profile, { ...recipientBefore.profile, gold: recipientBefore.profile.gold + mission.gold / 4 });
      assert.equal(recipient.rewardRevision, recipientBefore.rewardRevision + 1);
      assert.deepEqual(recipient.inventory, recipientBefore.inventory);
      assert.notEqual(recipient.progressToken, recipientBefore.progressToken);
      assert.ok(Number.isInteger(recipient.profile.gold));
      assert.deepEqual((await expedition(a, command)).active, snapshot.active);
      const recovered = await request("/api/mundo/sync", b, staleRecipient);
      assert.equal(recovered.status, 200);
      assert.equal(recovered.data.profileReset, true);
      assert.deepEqual(recovered.data.profile, recipient.profile);
      assert.equal(recovered.data.rewardRevision, recipient.rewardRevision);
      await assertSavedExpedition(a, snapshot);
      await assertSavedExpedition(b, recipient);
      assert.deepEqual(b.session.base.buildings, staleRecipient.buildings);

      // Reward recovery must not authorize an old tab to replace a newer building save.
      const buildings = b.session.base.buildings.map((building) => building.type === "embassy" ? { ...building, level: 2 } : building);
      await sync(b, { buildings });
      const conflict = await request("/api/mundo/sync", b, staleRecipient);
      assert.equal(conflict.status, 409);
      assert.equal(conflict.data.code, "progress_conflict");
      await load(b);
      assert.deepEqual(b.session.base.buildings, buildings);
      const savedSender = await sync(a);
      const savedRecipient = await sync(b);
      assert.equal(savedSender.profileReset, false);
      assert.equal(savedRecipient.profileReset, false);
      await assertSavedExpedition(a, snapshot);
      const recipientAfterBuilding = await expedition(b);
      assert.deepEqual(recipientAfterBuilding.profile, recipient.profile);
      assert.equal(recipientAfterBuilding.rewardRevision, recipient.rewardRevision);
      await assertSavedExpedition(b, recipientAfterBuilding);
    });

    await t.test("old mission JSON without preview fields returns safely without loot or touching legacy state", async () => {
      await checkpointBase(a);
      await sync(a, { currentHealth: 100 });
      const before = await expedition(a);
      const mission = weakestNormal(before);
      const legacyState = () => prisma.usuario.findUniqueOrThrow({
        where: { email: a.email },
        select: {
          oro: true, madera: true, piedra: true, metal: true, edificios: true,
          baseCoords: true, ultimaMisionElite: true, personaje: true, expedicionActiva: true,
        },
      });
      const legacyBefore = await legacyState();
      let snapshot = await expedition(a, { action: "start", missionId: mission.id, requestId: randomUUID() });
      const oldMission = { ...snapshot.active.mission };
      for (const field of ["description", "enemyLevel", "enemy", "loot"]) delete oldMission[field];
      // Emulate a pre-upgrade ledger while preserving its server-issued enemy and rewards.
      const oldEnemy = { ...snapshot.active.enemy };
      delete oldEnemy.level;
      delete oldEnemy.speed;
      await prisma.expedicionMundo.update({
        where: { id: snapshot.active.id }, data: { mission: oldMission, enemy: oldEnemy },
      });
      await expireExpeditionLeg(a, snapshot.active, "arrivalAt");
      snapshot = await expedition(a);
      assert.equal(snapshot.active.mission.enemyLevel, undefined);
      assert.equal(snapshot.active.mission.loot, undefined);
      assert.deepEqual(snapshot.active.enemy, oldEnemy);
      snapshot = await winExpedition(a, snapshot);
      const returning = snapshot;
      await expireExpeditionLeg(a, snapshot.active, "returnArrivalAt");
      snapshot = await expedition(a);
      assertReward(returning, snapshot, oldMission);
      assert.deepEqual(snapshot.inventory, before.inventory);
      assert.deepEqual(snapshot.active.awardedLoot, []);
      await assertSavedExpedition(a, snapshot);
      assert.deepEqual(await legacyState(), legacyBefore);
    });
  } finally {
    // Only this run's disposable accounts are touched, including failed registrations.
    const users = await prisma.usuario.findMany({ where: { email: { in: accounts.map((account) => account.email) } }, select: { id: true } });
    const players = await prisma.jugador.findMany({ where: { usuarioId: { in: users.map((user) => user.id) } }, select: { id: true } });
    await prisma.party.deleteMany({ where: { liderId: { in: players.map((player) => player.id) } } });
    await prisma.usuario.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    await prisma.$disconnect();
  }
});