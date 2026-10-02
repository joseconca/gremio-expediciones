const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");
require("./load-typescript.cjs");
const contracts = require("../src/shared/equipment.ts");
const world = require("../src/shared/world.ts");
const { VillageProgression } = require("../src/game/gameplay/VillageProgression.ts");
const { EquipmentManager } = require("../src/game/gameplay/EquipmentManager.ts");
const { PartyManager } = require("../src/game/gameplay/PartyManager.ts");
const { PlayerProgression } = require("../src/game/gameplay/PlayerProgression.ts");
const { EquipmentInteriorScene } = require("../src/game/scenes/EquipmentInteriorScene.ts");
const { InputManager } = require("../src/game/input/InputManager.ts");
const { DialogueManager } = require("../src/game/dialogue/DialogueManager.ts");
const { calculateVillageBounds } = require("../src/shared/village.ts");
const { equipmentBuilding } = require("../src/game/data/buildings/armory.ts");
const { BaseScene } = require("../src/game/scenes/BaseScene.ts");
const { TownHallInteriorScene } = require("../src/game/scenes/TownHallInteriorScene.ts");
const { createAlcaldeDialogue } = require("../src/game/data/dialogues/alcalde.ts");
const { worldGateway } = require("../src/services/worldGateway.ts");

function load(file, deps) {
  const filename = path.resolve(__dirname, "..", file);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })((name) => name in deps ? deps[name] : require(name), loaded, loaded.exports);
  return loaded.exports;
}
class MundoError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
function harness() {
  let p = { id: randomUUID(), usuarioId: randomUUID(), nombre: "Prueba", sexo: "chico", clase: "Novato", nivel: 1, experiencia: 0,
    oro: 2000, saludActual: 40, saludMaxima: 100, rewardRevision: 0, viajeRegreso: null,
    equipoMundo: { items: [], receipts: [] }, usuario: { base: { id: randomUUID(), edificios: [{ type: "town-hall", level: 2 }, { type: "armory", level: 1 }, { type: "smithy", level: 1 }] } } };
  let active = false, fail = false, queue = Promise.resolve();
  const http = { MundoError, withWorldLock(work) {
    const operation = queue.then(async () => {
      const draft = structuredClone(p);
      const tx = {
        jugador: {
          async findUnique() { return structuredClone(draft); },
          async findUniqueOrThrow() { return structuredClone(draft); },
          async update({ data }) {
            for (const [key, value] of Object.entries(data)) draft[key] = value && typeof value === "object" && "increment" in value ? draft[key] + value.increment : structuredClone(value);
            if (fail) { fail = false; throw new Error("write failed"); }
            return structuredClone(draft);
          },
        },
        base: { async findUniqueOrThrow() { return structuredClone(draft.usuario.base); }, async update({ data }) { Object.assign(draft.usuario.base, data); return draft.usuario.base; } },
        expedicionMundo: { async findFirst() { return active ? { id: randomUUID() } : null; } },
      };
      const result = await work(tx);
      p = draft;
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  } };
  const jugador = load("src/lib/mundo/jugador.ts", { "@/lib/prisma": {}, "@/shared/world": world, "./geo": {}, "./http": http, "./travel": {} });
  const api = load("src/lib/mundo/equipment.ts", { "@/shared/equipment": contracts, "@/shared/world": world, "./http": http, "./jugador": jugador });
  return {
    api, jugador, get: () => structuredClone(p), change: (change) => Object.assign(p, change),
    active: () => { active = true; }, fail: () => { fail = true; },
    request(action, targetId) { return { action, targetId, requestId: randomUUID(), progressToken: jugador.progressToken(p, p.usuario.base), rewardRevision: p.rewardRevision }; },
    act(body) { return api.equipmentAction(p.usuarioId, body); },
  };
}

test("equipment catalog uses only real PNGs, legacy prices and upgrade formula", () => {
  for (const item of contracts.EQUIPMENT_CATALOG) {
    assert.ok(fs.existsSync(path.join(__dirname, "../public", item.sprite)));
    assert.equal(contracts.equipmentUpgradeCost(item.price, 0), item.price * 5);
    assert.equal(contracts.equipmentUpgradeCost(item.price, 2), item.price * 15);
  }
  for (const name of ["armeria", "herreria", "armeria-herreria"]) {
    const png = fs.readFileSync(path.join(__dirname, `../public/sprites/buildings/${name}.png`));
    assert.equal(png.readUInt32BE(16), 128); assert.equal(png.readUInt32BE(20), 64);
  }
});

test("authoritative purchases create individual owned instances, upgrade only own items, replay charges once", async () => {
  const h = harness();
  const request = h.request("buy", "espada_madera");
  const [a, b] = await Promise.all([h.act(request), h.act(request)]);
  assert.deepEqual(a, b); assert.equal(a.items.length, 1); assert.equal(h.get().oro, 1900); assert.equal(h.get().rewardRevision, 1);
  const buyAgain = await h.act(h.request("buy", "espada_madera"));
  assert.equal(buyAgain.items.length, 2); assert.notEqual(buyAgain.items[0].id, buyAgain.items[1].id);
  const upgrade = h.request("upgrade", a.items[0].id);
  await Promise.all([h.act(upgrade), h.act(upgrade)]);
  assert.equal(h.get().oro, 1300); assert.deepEqual(h.get().equipoMundo.items.map((i) => i.upgrade), [1, 0]);
  await assert.rejects(h.act(h.request("upgrade", randomUUID())), { code: "equipment_not_owned" });
  await assert.rejects(h.act({ ...request, targetId: "tela_andrajosa" }), { code: "request_reused" });
  await assert.rejects(h.act({ ...request, requestId: randomUUID() }), { code: "equipment_conflict" });
});

test("equipment rejects client price/stats/gold, unknown catalog, insufficient gold and corrupt storage", async () => {
  const h = harness();
  for (const field of ["price", "gold", "upgrade", "playerId", "damage"]) await assert.rejects(h.act({ ...h.request("buy", "espada_madera"), [field]: 0 }), { code: "invalid_equipment" });
  await assert.rejects(h.act(h.request("buy", "pocion")), { code: "unknown_equipment" });
  h.change({ oro: 99 });
  await assert.rejects(h.act(h.request("buy", "espada_madera")), { code: "insufficient_gold" });
  assert.equal(h.get().equipoMundo.items.length, 0);
  h.change({ equipoMundo: [] });
  await assert.rejects(h.act({ action: "status" }), { code: "invalid_equipment_store" });
});

test("equipment requires built dependencies and freezes mutations in expedition/cart; transaction rollback is atomic", async () => {
  for (const buildings of [[{ type: "town-hall", level: 2 }], [{ type: "town-hall", level: 2 }, { type: "armory", level: 0 }], [{ type: "town-hall", level: 2 }, { type: "smithy", level: 1 }]]) {
    const h = harness(); const p = h.get(); p.usuario.base.edificios = buildings; h.change(p);
    await assert.rejects(h.act(h.request("buy", "espada_madera")), { code: "building_required" });
  }
  const h = harness(); const request = h.request("buy", "espada_madera"); h.fail();
  await assert.rejects(h.act(request), /write failed/); assert.equal(h.get().oro, 2000); assert.equal(h.get().rewardRevision, 0);
  await h.act(request); assert.equal(h.get().oro, 1900);
  h.active(); await assert.rejects(h.act(h.request("buy", "espada_madera")), { code: "player_busy" });
  assert.equal((await h.act(request)).items.length, 1, "Acknowledging a committed replay is not another mutation");
  const cart = harness(); cart.change({ viajeRegreso: { id: randomUUID() } });
  await assert.rejects(cart.act(cart.request("buy", "espada_madera")), { code: "player_busy" });
});

test("server sync rejects smithy before saved armory and nonadjacent order; stale revisions never undo purchases", async () => {
  const h = harness(); const p = h.get(); p.usuario.base.edificios = [{ type: "town-hall", level: 2 }]; h.change(p);
  const payload = () => ({ ...h.request("buy", "ignored"), characterClass: "Novato", level: 1, experience: 0, gold: 2000, currentHealth: 40, maxHealth: 100,
    buildings: [{ type: "town-hall", level: 2 }, { type: "armory", level: 1 }, { type: "smithy", level: 1 }] });
  await assert.rejects(h.jugador.syncProgress(h.get(), h.get().usuario.base, payload()), { code: "armory_required" });
  const first = payload(); first.buildings.pop(); await h.jugador.syncProgress(h.get(), h.get().usuario.base, first);
  await h.jugador.syncProgress(h.get(), h.get().usuario.base, payload());
  const bad = payload(); bad.buildings.splice(2, 0, { type: "tavern", level: 1 });
  await assert.rejects(h.jugador.syncProgress(h.get(), h.get().usuario.base, bad), { code: "invalid_progress" });
  const stale = payload(); await h.act(h.request("buy", "espada_madera"));
  await h.jugador.syncProgress(h.get(), h.get().usuario.base, stale);
  assert.equal(h.get().oro, 1900); assert.equal(h.get().equipoMundo.items.length, 1);
});

test("smithy construction requires finished armory, uses annex slot, preserves existing order/geometry through hydration", () => {
  const v = new VillageProgression(); v.upgradeTownHall();
  assert.equal(v.startConstruction("smithy", 2), false);
  assert.equal(v.startConstruction("armory", 2), true); assert.equal(v.startConstruction("smithy", 3), false);
  v.update(60);
  const original = v.getBuildingPlacements();
  assert.equal(v.startConstruction("smithy", 1), false); assert.equal(v.startConstruction("smithy", 3), true);
  assert.deepEqual(v.getBuildingPlacements().slice(0, 2), original);
  v.update(60);
  const placements = v.getBuildingPlacements();
  assert.equal(placements[1].x, placements[2].x); assert.equal(placements[1].y, placements[2].y);
  assert.equal(v.getAvailableConstructionPositions("tavern").some((p) => p.position === 3), false);
  assert.equal(v.startConstruction("tavern", 4), true); v.update(60);
  assert.deepEqual(v.getSavedBuildings().map((b) => b.type), ["town-hall", "armory", "smithy", "tavern"]);
  assert.deepEqual(new VillageProgression(v.getSavedBuildings()).getBuildingPlacements(), v.getBuildingPlacements());
  const bounds = calculateVillageBounds(3);
  assert.ok(v.getBuildingPlacements().every((b) => b.x >= bounds.minX && b.x + 128 <= bounds.maxX));
  assert.equal(equipmentBuilding("armory", true).sprite.src, "/sprites/buildings/armeria-herreria.png");
});

function sceneConfig(village) {
  return { canvas: { width: 240, height: 360 }, ctx: {}, input: new InputManager(), dialogueManager: new DialogueManager(), villageProgression: village,
    playerProgression: new PlayerProgression(), combatManager: {}, partyManager: {}, dayNightSystem: {}, sceneManager: { changeScene() {} } };
}
test("interior passages are mutually gated, valid spawns never bounce back, World continues during shop input lock", () => {
  global.Image = class { complete = true; naturalWidth = 128; };
  const v = new VillageProgression([{ type: "town-hall", level: 2 }, { type: "armory", level: 1 }, { type: "smithy", level: 1 }]);
  for (const type of ["armory", "smithy"]) {
    const config = sceneConfig(v);
    config.spawnId = `${type}-passage`;
    const scene = new EquipmentInteriorScene(config, type);
    assert.equal(scene.debugTeleporters.length, 2);
    const transition = scene.debugTeleporters[1];
    assert.equal(transition.targetSceneId, `${type === "armory" ? "smithy" : "armory"}-interior`);
    assert.equal(scene.world.collisionMap.isBlockedRect(scene.player.x + 8, scene.player.y + 50, 12, 6), false);
    let ticks = 0; scene.world.update = () => { ticks++; };
    config.input.setBlocker("equipment", true); scene.update(0.1); assert.equal(ticks, 1);
  }
  const solo = new EquipmentInteriorScene(sceneConfig(new VillageProgression([{ type: "town-hall", level: 2 }, { type: "armory", level: 1 }])), "armory");
  assert.equal(solo.debugTeleporters.length, 2);
  assert.equal(solo.debugTeleporters[1].activate(), false);
  assert.equal(solo.world.collisionMap.isBlockedTile(4, 2), true);
});

test("manager flushes, suspends ambiguous request until exact retry, prevents double taps and adopts revision once", async () => {
  const calls = []; let holds = 0, adopted = 0, flushed = 0;
  const party = { async flush() { flushed++; return true; }, holdSync() { holds++; return () => holds--; }, async suspendSync(action) { return action(); },
    getProfileVersion() { return { progressToken: "token", rewardRevision: 0 }; }, adoptProfile() { adopted++; } };
  let fail = true;
  const gateway = { async equipment(request) { calls.push(structuredClone(request)); return request.action === "buy" && fail ? { ok: false, code: "network", message: "Lost response" } : { ok: true, snapshot: { items: [], profile: {}, progressToken: "next", rewardRevision: 1 } }; } };
  const manager = new EquipmentManager(gateway, party, () => true, () => "armory-interior");
  await Promise.all([manager.buy("espada_madera"), manager.buy("espada_madera")]);
  assert.equal(calls.length, 1); assert.equal(holds, 1); assert.equal(manager.isBlocking(), true);
  manager.close(); assert.equal(manager.getSnapshot().pending, true);
  fail = false; await manager.retry();
  assert.deepEqual(calls[0], calls[1]); assert.equal(flushed, 1); assert.equal(adopted, 1); assert.equal(holds, 0);
  manager.destroy(); await manager.buy("espada_madera"); assert.equal(calls.length, 2);
});

test("party ignores lower authoritative revisions after equipment purchase", () => {
  const player = new PlayerProgression(); const party = new PartyManager({}, player, new VillageProgression(), "token");
  const profile = { name: "Prueba", characterClass: "Novato", level: 1, experience: 0, gold: 0, currentHealth: 40, maxHealth: 100 };
  party.adoptProfile(profile, "new", 2); party.adoptProfile({ ...profile, gold: 100 }, "old", 1);
  assert.equal(player.getState().gold, 0); assert.equal(party.getProfileVersion().progressToken, "new"); party.destroy();
});

test("mayor offers armory first, annex after completion, and reports failed save without pretending work started", async () => {
  const v = new VillageProgression([{ type: "town-hall", level: 2 }]);
  const options = () => Object.fromEntries(["tavern", "embassy", "armory", "smithy"].map((type) => [type, v.getAvailableConstructionPositions(type)]));
  const choices = () => createAlcaldeDialogue(2, options()).nodes.find((node) => node.id === "building-options").choices;
  assert.ok(choices().some((choice) => choice.nextNodeId === "armory-position"));
  assert.ok(!choices().some((choice) => choice.nextNodeId === "smithy-position"));
  v.startConstruction("armory", 2); v.update(60);
  assert.ok(choices().some((choice) => choice.nextNodeId === "smithy-position"));
  const config = sceneConfig(v);
  config.partyManager = { async flush() { return false; }, getSnapshot() { return { syncMessage: "Sin conexión" }; } };
  const scene = new TownHallInteriorScene(config);
  scene.onNpcChoice("build:smithy:3");
  assert.match(config.dialogueManager.getCurrentNode().text, /comprobando/);
  await new Promise(setImmediate);
  assert.equal(v.getState().construction, null);
  assert.equal(config.dialogueManager.getCurrentNode().text, "Sin conexión");
  config.partyManager.flush = async () => true;
  scene.onNpcChoice("build:smithy:3");
  config.dialogueManager.close();
  await new Promise(setImmediate);
  assert.equal(v.getState().construction.type, "smithy");
  assert.equal(config.dialogueManager.isActive(), false, "Async completion must not reopen a closed dialogue");
});

test("annex construction leaves armory usable, opens live interior passage and all five buildings fit dynamic village", () => {
  global.Image = class { complete = true; naturalWidth = 128; };
  const v = new VillageProgression([{ type: "town-hall", level: 2 }, { type: "armory", level: 1 }]);
  const interior = new EquipmentInteriorScene(sceneConfig(v), "armory");
  assert.equal(interior.world.collisionMap.isBlockedTile(4, 2), true);
  v.startConstruction("smithy", 3);
  const scene = new BaseScene(sceneConfig(v));
  const armory = v.getBuildingPlacements().find((building) => building.type === "armory");
  assert.equal(scene.constructionSite.x, armory.x + 74);
  assert.equal(scene.constructionSite.footprint.width, 44);
  const entrance = equipmentBuilding("armory").entrance;
  assert.equal(scene.collisionSystem.canOccupy(scene.player, armory.x + entrance.exit.offsetX, armory.y + entrance.exit.offsetY), true);
  v.update(60); interior.update(0.1);
  assert.equal(interior.world.collisionMap.isBlockedTile(4, 2), false);
  assert.equal(interior.debugTeleporters[1].activate(), true);
  for (const type of ["tavern", "embassy"]) { assert.equal(v.startConstruction(type, v.getSavedBuildings().length + 1), true); v.update(60); }
  scene.update(0.1);
  assert.equal(scene.villageObjects.filter((object) => object.definition).length, 4, "Smithy is rendered by the composite, never a duplicate sprite");
  const map = scene.world.tileMap;
  for (const building of v.getBuildingPlacements()) {
    assert.ok(building.x >= map.originX && building.x + 128 <= map.originX + map.width * map.tileSize);
  }
  assert.equal(scene.getSpawnPoint("armory-exit").x, v.getBuildingPlacements().find((building) => building.type === "armory").x + 28);
  assert.equal(scene.getSpawnPoint("smithy-exit").x, v.getBuildingPlacements().find((building) => building.type === "smithy").x + 70);
});

test("failed status reads can close offline; queued purchase revalidates interior after flush", async () => {
  let holds = 0, calls = 0, currentScene = "armory-interior";
  const party = { async flush() { return true; }, holdSync() { holds++; return () => holds--; }, async suspendSync(action) { return action(); }, getProfileVersion() { return { progressToken: "token", rewardRevision: 0 }; } };
  const manager = new EquipmentManager({ async equipment() { calls++; return { ok: false, code: "network", message: "Offline" }; } }, party, () => true, () => currentScene);
  manager.open("inventory"); await new Promise(setImmediate);
  assert.equal(manager.getSnapshot().pending, false); assert.equal(holds, 0);
  manager.close(); assert.equal(manager.isBlocking(), false);
  party.flush = async () => { currentScene = "base"; return true; };
  await manager.buy("espada_madera"); assert.equal(calls, 1);
  assert.match(manager.getSnapshot().error, /edificio/);
  manager.destroy();
});

test("equipment HTTP adapter rejects malformed success envelopes and preserves ambiguous mutation for retry", async () => {
  const originalFetch = global.fetch;
  try {
    for (const payload of [{}, { ok: true }, { ok: true, snapshot: { items: [] } }, { ok: false }]) {
      global.fetch = async () => new Response(JSON.stringify(payload), { status: 200 });
      const result = await worldGateway.equipment({ action: "status" });
      assert.equal(result.ok, false); assert.equal(result.code, "invalid_response");
    }
  } finally { global.fetch = originalFetch; }
});

test("authoritative equipment adoption keeps construction completed during request pending for the next sync", () => {
  const v = new VillageProgression([{ type: "town-hall", level: 2 }, { type: "armory", level: 1 }]);
  const player = new PlayerProgression();
  const party = new PartyManager({}, player, v, "token");
  const release = party.holdSync();
  v.startConstruction("smithy", 3); v.update(60);
  party.adoptProfile({ name: "Prueba", characterClass: "Novato", level: 1, experience: 0, gold: 0, currentHealth: 40, maxHealth: 100 }, "purchased", 1);
  assert.equal(party.getSnapshot().syncStatus, "pending");
  assert.equal(v.hasBuilding("smithy"), true);
  release(); party.destroy();
});