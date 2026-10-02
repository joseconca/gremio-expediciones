const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./load-typescript.cjs");
const { PlayerProgression } = require("../src/game/gameplay/PlayerProgression.ts");
const { VillageProgression } = require("../src/game/gameplay/VillageProgression.ts");
const { PartyManager } = require("../src/game/gameplay/PartyManager.ts");
const { createEmbajadorDialogue } = require("../src/game/data/dialogues/embajador.ts");
const { KeyboardInput } = require("../src/game/input/KeyboardInput.ts");
const { InputManager } = require("../src/game/input/InputManager.ts");
const { CombatManager } = require("../src/game/gameplay/CombatManager.ts");
const { geographicToWorldPoint, isInsideWorldMap } = require("../src/game/world/WorldLocation.ts");
const { ExpeditionManager } = require("../src/game/gameplay/ExpeditionManager.ts");
const { worldGateway } = require("../src/services/worldGateway.ts");
const { MISSION_BOARD_POSITION } = require("../src/game/entities/MissionBoard.ts");

const yieldMicrotasks = () => new Promise((resolve) => setImmediate(resolve));
function serverSnapshot(token = "token") {
  return {
    progressToken: token, nearbyBases: [], selfPlayerId: "self",
    members: [{ playerId: "self", isLeader: true }, { playerId: "other", displayName: "Compañera" }],
    invitations: [{ id: "invitation", fromDisplayName: "Compañera" }], candidates: [],
  };
}

test("Novato starts at 100 gold and 40/100 HP; level and completed buildings survive hydration", () => {
  const player = new PlayerProgression();
  assert.equal(player.getState().characterClass, "Novato");
  assert.equal(player.getState().gold, 100);
  assert.equal(player.getState().attributes.currentHealth, 40);
  assert.equal(player.getState().attributes.maxHealth, 100);
  player.gainExperience(125);
  player.spendGold(10);
  const state = player.getState();
  const restored = new PlayerProgression({
    name: state.name, characterClass: state.characterClass, level: state.characterLevel,
    experience: state.experience, gold: state.gold, currentHealth: state.attributes.currentHealth,
  });
  assert.deepEqual(restored.getState(), state);
  const village = new VillageProgression();
  assert.equal(village.upgradeTownHall(), true);
  for (const [type, position] of [["tavern", 1], ["embassy", 3]]) {
    assert.equal(village.startConstruction(type, position), true);
    for (let frame = 0; frame < 601; frame++) village.update(0.1);
    assert.equal(village.hasBuilding(type), true);
  }
  const reloaded = new VillageProgression(village.getSavedBuildings());
  assert.equal(reloaded.getTownHallLevel(), 2);
  assert.deepEqual(reloaded.getSavedBuildings(), village.getSavedBuildings());
});

test("4 s polling, companion HUD snapshot, pending saves and conflict stop", async () => {
  const writes = [];
  const player = new PlayerProgression();
  const village = new VillageProgression();
  const gateway = { async sync(progress) {
    writes.push(progress);
    return { ok: true, snapshot: serverSnapshot(`token-${writes.length}`) };
  } };
  const manager = new PartyManager(gateway, player, village, "initial");
  manager.update(0);
  await yieldMicrotasks();
  assert.equal(writes.length, 1);
  assert.equal(manager.getSnapshot().companions[0].displayName, "Compañera");
  player.spendGold(10);
  assert.equal(manager.getSnapshot().syncStatus, "pending");
  manager.update(3.9);
  assert.equal(writes.length, 1);
  manager.update(0.1);
  await yieldMicrotasks();
  assert.equal(writes[1].gold, 90);
  assert.equal(writes[1].progressToken, "token-1");
  gateway.sync = async () => ({ ok: false, code: "progress_conflict", message: "Recarga" });
  manager.update(4);
  await yieldMicrotasks();
  assert.equal(manager.getSnapshot().syncStatus, "conflict");
  let retry = false;
  gateway.sync = async () => { retry = true; };
  player.addGold(1);
  manager.update(4);
  assert.equal(retry, false);
  manager.destroy();
});

test("changes made during a pending save remain pending; actions wait for embassy sync", async () => {
  const player = new PlayerProgression();
  const village = new VillageProgression();
  let finish;
  let count = 0;
  const gateway = {
    sync: async () => {
      count++;
      if (count === 1) await new Promise((resolve) => { finish = resolve; });
      return { ok: true, snapshot: serverSnapshot() };
    },
    invite: async () => ({ ok: false, message: "Party completa" }),
  };
  const manager = new PartyManager(gateway, player, village, "initial");
  manager.update(0);
  village.upgradeTownHall();
  finish();
  await yieldMicrotasks();
  assert.equal(manager.getSnapshot().syncStatus, "pending");
  const result = await manager.invite("other");
  assert.equal(count, 2);
  assert.deepEqual(result, { ok: false, message: "Party completa" });
  const dialogue = createEmbajadorDialogue(manager.getSnapshot());
  assert.ok(dialogue.nodes[0].choices.some((choice) => choice.eventId === "party-reject:invitation"));
  manager.destroy();
});

test("keyboard aliases, blur, editable UI, blocked input and virtual D-pad", () => {
  global.window = new EventTarget();
  global.document = new EventTarget();
  global.HTMLElement = class { closest() { return null; } };
  const input = new KeyboardInput();
  input.init();
  const key = (type, code, target = window) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, "code", { value: code });
    if (target !== window) Object.defineProperty(event, "target", { value: target });
    window.dispatchEvent(event);
  };
  key("keydown", "KeyW");
  key("keydown", "ArrowUp");
  key("keyup", "KeyW");
  assert.equal(input.isHeld("up"), true);
  window.dispatchEvent(new Event("blur"));
  assert.equal(input.isHeld("up"), false);
  const field = new HTMLElement();
  field.closest = () => field;
  key("keydown", "KeyW", field);
  assert.equal(input.isHeld("up"), false);
  input.destroy();
  const manager = new InputManager();
  manager.init();
  const virtual = new Event("VirtualDPad");
  Object.defineProperty(virtual, "detail", { value: { dir: "right", action: "add" } });
  document.dispatchEvent(virtual);
  assert.equal(manager.isDirectionHeld("right"), true);
  manager.setBlocked(true);
  assert.equal(manager.isDirectionHeld("right"), false);
  window.dispatchEvent(new Event("blur"));
  manager.setBlocked(false);
  assert.equal(manager.isDirectionHeld("right"), false);
  manager.destroy();
});

test("lost save acknowledgements retry the same payload before publishing newer changes", async () => {
  const player = new PlayerProgression();
  const village = new VillageProgression();
  const writes = [];
  const gateway = { async sync(body) {
    writes.push(body);
    return writes.length === 1
      ? { ok: false, code: "network", message: "Respuesta perdida" }
      : { ok: true, snapshot: serverSnapshot("acknowledged") };
  } };
  const manager = new PartyManager(gateway, player, village, "initial");
  player.spendGold(10);
  manager.update(0);
  await yieldMicrotasks();
  player.spendGold(5);
  manager.update(4);
  await yieldMicrotasks();
  assert.strictEqual(writes[0], writes[1]);
  assert.equal(writes[1].gold, 90);
  assert.equal(manager.getSnapshot().syncStatus, "pending");
  manager.update(4);
  await yieldMicrotasks();
  assert.equal(writes[2].gold, 85);
  assert.equal(writes[2].progressToken, "acknowledged");
  assert.equal(manager.getSnapshot().syncStatus, "saved");
  manager.destroy();
});

test("bases across the date line stay inside the local map", () => {
  const point = geographicToWorldPoint({ lat: 0, lng: -179.999 }, { lat: 0, lng: 179.999 });
  assert.equal(isInsideWorldMap(point), true);
  assert.ok(Math.abs(point.x - 4096) < 100);
});

test("combat overlay state: menus, potion, flee, victory and no duplicate rewards", () => {
  const player = new PlayerProgression();
  const village = new VillageProgression();
  const combat = new CombatManager(player, village);
  const enemy = {
    id: "test", name: "Enemigo de prueba", sprite: "/test.png", experienceReward: 5, goldReward: 2,
    attributes: { ...player.getState().attributes, currentHealth: 1, maxHealth: 1 },
  };
  assert.equal(combat.startEncounter(enemy), true);
  combat.act("skill");
  assert.equal(combat.getSnapshot().menu, "skills");
  combat.act("item");
  assert.equal(combat.getSnapshot().menu, "items");
  assert.equal(combat.usePotion(), true);
  assert.equal(player.getState().attributes.currentHealth, 70);
  combat.act("flee");
  assert.equal(combat.getSnapshot().phase, "fled");
  combat.closeResult();
  assert.equal(combat.isEncounterOpen(), false);
  combat.startEncounter(enemy);
  combat.act("attack");
  assert.equal(combat.getSnapshot().phase, "victory");
  assert.equal(player.getState().gold, 102);
  combat.act("attack");
  assert.equal(player.getState().gold, 102);
});

test("HTTP envelope reaches expedition controller without erasing ordinary local spending", async () => {
  const fetchOriginal = global.fetch;
  let gold = 100;
  const profile = () => ({ id: "self", name: "Aventurero", sex: "chico", characterClass: "Novato", level: 1,
    experience: 0, gold, currentHealth: 40, maxHealth: 100 });
  global.fetch = async () => new Response(JSON.stringify({ ok: true, snapshot: {
    serverNow: Date.now(), missions: [], active: null, eliteAvailableAt: 0,
    profile: profile(), progressToken: "initial", rewardRevision: 0,
  } }), { headers: { "Content-Type": "application/json" } });
  const player = new PlayerProgression();
  const village = new VillageProgression();
  const party = new PartyManager(worldGateway, player, village, "initial");
  const manager = new ExpeditionManager(worldGateway, party, { checkpoint: async () => ({ ok: true }) }, () => true);
  try {
    manager.openBoard();
    await yieldMicrotasks();
    assert.ok(manager.getSnapshot().data);
    assert.equal(manager.isActive(), false);
    gold = 90;
    player.spendGold(20);
    manager.update(4);
    await yieldMicrotasks();
    assert.equal(player.getState().gold, 80);
    assert.equal(manager.getSnapshot().data.profile.gold, 90);
    assert.deepEqual(MISSION_BOARD_POSITION, { x: 464, y: 768 });
  } finally { global.fetch = fetchOriginal; manager.destroy(); party.destroy(); }
});

test("reward snapshot resets profile once and stale save acknowledgements cannot erase it", async () => {
  const player = new PlayerProgression();
  const village = new VillageProgression();
  let reset = true;
  const profile = { id: "self", name: "Aventurero", sex: "chico", characterClass: "Novato", level: 2,
    experience: 5, gold: 150, currentHealth: 70, maxHealth: 110 };
  const gateway = { async sync(progress) {
    if (reset) { reset = false; return { ok: true, snapshot: { ...serverSnapshot("reward"), profile, rewardRevision: 1, profileReset: true } }; }
    assert.equal(progress.gold, 150);
    assert.equal(progress.rewardRevision, 1);
    return { ok: true, snapshot: { ...serverSnapshot("reward"), rewardRevision: 1 } };
  } };
  const party = new PartyManager(gateway, player, village, "old");
  assert.equal(await party.flush(), true);
  assert.equal(player.getState().gold, 150);
  assert.equal(player.getState().characterLevel, 2);
  assert.equal(await party.flush(), true);
  party.destroy();
});