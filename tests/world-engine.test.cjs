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
const { ENEMY_TURN_DELAY_MS, ATTACK_ANIMATION_MS } = require("../src/shared/combat.ts");
const { geographicToWorldPoint, isInsideWorldMap } = require("../src/game/world/WorldLocation.ts");
const { ExpeditionManager } = require("../src/game/gameplay/ExpeditionManager.ts");
const { worldGateway, loadSession } = require("../src/services/worldGateway.ts");
const { MISSION_BOARD_POSITION } = require("../src/game/entities/MissionBoard.ts");
const { createRequestId } = require("../src/game/core/requestId.ts");
const { expeditionCombatSnapshot } = require("../src/game/gameplay/expeditionCombat.ts");

const yieldMicrotasks = () => new Promise((resolve) => setImmediate(resolve));
test("session lookup rejects empty/malformed successful HTTP responses without crashing or onboarding", async () => {
  const originalFetch = global.fetch;
  try {
    for (const body of ["", "not-json", "null", "[]", "42", "{}", '{"session":false}']) {
      global.fetch = async () => new Response(body, { status: 200 });
      const result = await loadSession();
      assert.equal(result.status, "unavailable", body);
      assert.ok(result.message);
    }
    global.fetch = async () => new Response('{"session":null}', { status: 200 });
    assert.deepEqual(await loadSession(), { status: "ready", session: null });
    global.fetch = async () => new Response("", { status: 401 });
    assert.deepEqual(await loadSession(), { status: "unauthenticated" });
  } finally {
    global.fetch = originalFetch;
  }
});

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

test("F3 cancels native search and toggles debug once per press even with a focused dialog", () => {
  global.window = new EventTarget();
  global.document = new EventTarget();
  global.HTMLElement = class { closest() { return this; } };
  const manager = new InputManager();
  manager.init();
  const key = (type) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, "code", { value: "F3" });
    Object.defineProperty(event, "target", { value: new HTMLElement() });
    window.dispatchEvent(event);
    return event;
  };
  try {
    manager.setBlocked(true);
    assert.equal(key("keydown").defaultPrevented, true);
    assert.equal(manager.wasDebugTogglePressed(), true);
    manager.endFrame();
    assert.equal(key("keydown").defaultPrevented, true);
    assert.equal(manager.wasDebugTogglePressed(), false);
    key("keyup");
    key("keydown");
    assert.equal(manager.wasDebugTogglePressed(), true);
  } finally { manager.destroy(); }
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
  assert.ok(Object.isFrozen(combat.getSnapshot()) && Object.isFrozen(combat.getSnapshot().party));
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
  assert.equal(combat.getSnapshot().phase, "active");
  combat.update(ENEMY_TURN_DELAY_MS);
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

function localCombatFixture(enemyAttributes = {}, clock = () => 10_000) {
  const player = new PlayerProgression();
  const village = new VillageProgression();
  const combat = new CombatManager(player, village, clock);
  const enemy = {
    id: "turn-test", name: "Araña de prueba", sprite: "/sprites/enemies/arana.png",
    experienceReward: 5, goldReward: 2,
    attributes: { ...player.getState().attributes, currentHealth: 100, maxHealth: 100, ...enemyAttributes },
  };
  assert.equal(combat.startEncounter(enemy), true);
  return { player, village, combat, enemy };
}

test("combat initiative: faster enemy waits exactly 1000 simulated ms; ties and faster player act first", () => {
  for (const speed of [4, 5]) {
    const { combat } = localCombatFixture({ speed });
    assert.equal(combat.getSnapshot().turn, "player");
    assert.equal(combat.getSnapshot().enemyTurnAt, null);
    combat.update(10_000);
    assert.equal(combat.getSnapshot().lastAction, null);
  }
  let now = 10_000;
  const { combat, player } = localCombatFixture({ speed: 6 }, () => now);
  const initial = combat.getSnapshot();
  assert.equal(initial.turn, "enemy");
  assert.equal(initial.enemyTurnAt, 11_000);
  now += 1_000_000;
  for (const delta of [0, -1, NaN, Infinity]) combat.update(delta);
  combat.update(999);
  assert.strictEqual(combat.getSnapshot(), initial);
  assert.equal(player.getState().attributes.currentHealth, 40);
  combat.update(1);
  const attacked = combat.getSnapshot();
  assert.equal(attacked.turn, "player");
  assert.equal(attacked.enemyTurnAt, null);
  assert.deepEqual(attacked.lastAction, { id: 1, actor: "enemy", kind: "attack", damage: 6, at: 11_000, targetEnemyId: "turn-test", targetMemberId: "local-player" });
  assert.equal(player.getState().attributes.currentHealth, 34);
  combat.update(10_000);
  assert.strictEqual(combat.getSnapshot(), attacked);
});

test("player attack only damages enemy; pending enemy turn guards spam and action IDs drive animations", () => {
  const { combat, player, village } = localCombatFixture();
  const initial = combat.getSnapshot();
  combat.act("attack");
  const attack = combat.getSnapshot();
  assert.equal(attack.enemy.attributes.currentHealth, 94);
  assert.equal(player.getState().attributes.currentHealth, 40);
  assert.equal(attack.turn, "enemy");
  assert.equal(attack.actingMemberId, "turn-test");
  assert.deepEqual(attack.lastAction, { id: 1, actor: "player", kind: "attack", damage: 6, at: 10_000,
    actorMemberId: "local-player", targetEnemyId: "turn-test" });
  const resources = village.getResourcesSnapshot();
  for (const action of ["attack", "flee", "item", "skill"]) combat.act(action);
  combat.selectMenu("items");
  assert.equal(combat.usePotion(), false);
  combat.closeResult();
  assert.equal(combat.startEncounter(localCombatFixture().enemy), false);
  assert.strictEqual(combat.getSnapshot(), attack);
  assert.strictEqual(village.getResourcesSnapshot(), resources);
  assert.equal(initial.enemy.attributes.currentHealth, 100);
  combat.update(ATTACK_ANIMATION_MS);
  assert.strictEqual(combat.getSnapshot(), attack);
  combat.update(ENEMY_TURN_DELAY_MS - ATTACK_ANIMATION_MS - 1);
  assert.equal(player.getState().attributes.currentHealth, 40);
  combat.update(1);
  const counterattack = combat.getSnapshot();
  assert.equal(counterattack.lastAction.id, 2);
  assert.equal(counterattack.lastAction.actor, "enemy");
  assert.equal(counterattack.lastAction.at, 11_000);
  assert.equal(player.getState().attributes.currentHealth, 34);
  assert.equal(counterattack.turn, "player");
  combat.act("attack");
  assert.equal(combat.getSnapshot().lastAction.id, 3);
  assert.equal(combat.getSnapshot().lastAction.actor, "player");
  assert.equal(counterattack.enemy.attributes.currentHealth, 94);
  assert.equal(attack.party[0].attributes.currentHealth, 40);
  assert.ok(Object.isFrozen(attack) && Object.isFrozen(attack.party) && Object.isFrozen(attack.party[0]));
  assert.ok(Object.isFrozen(attack.enemy.attributes) && Object.isFrozen(attack.lastAction));
});

test("menus consume no turn; potion heals missing local HP once and consumes one player turn", () => {
  const { combat, player, village } = localCombatFixture();
  combat.act("skill");
  combat.act("item");
  combat.selectMenu("root");
  assert.equal(combat.getSnapshot().turn, "player");
  assert.equal(combat.getSnapshot().lastAction, null);
  assert.equal(combat.getSnapshot().enemyTurnAt, null);
  const potions = village.getResourcesSnapshot().potions;
  assert.equal(combat.usePotion(), true);
  assert.equal(player.getState().attributes.currentHealth, 70);
  assert.equal(village.getResourcesSnapshot().potions, potions - 1);
  assert.deepEqual(combat.getSnapshot().lastAction, { id: 1, actor: "player", kind: "item", damage: -30, at: 10_000,
    actorMemberId: "local-player", targetMemberId: "local-player" });
  assert.equal(combat.usePotion(), false);
  combat.update(1000);
  assert.equal(player.getState().attributes.currentHealth, 64);
  const snapshot = combat.getSnapshot();
  assert.equal(combat.usePotion(), false);
  assert.strictEqual(combat.getSnapshot(), snapshot);
  combat.act("flee");
  const fled = combat.getSnapshot();
  assert.deepEqual(fled.lastAction, { id: 3, actor: "player", kind: "flee", damage: 0, at: 11_000 });
  combat.update(100_000);
  assert.strictEqual(combat.getSnapshot(), fled);

  const healthy = new PlayerProgression();
  healthy.setHealth(100);
  const healthyVillage = new VillageProgression();
  const full = new CombatManager(healthy, healthyVillage);
  full.startEncounter(localCombatFixture().enemy);
  const healthyPotions = healthyVillage.getResourcesSnapshot().potions;
  assert.equal(full.usePotion(), false);
  assert.equal(healthyVillage.getResourcesSnapshot().potions, healthyPotions);
  assert.equal(full.getSnapshot().turn, "player");
  assert.equal(full.getSnapshot().lastAction, null);
  assert.equal(full.getSnapshot().enemyTurnAt, null);
  full.act("attack");
  assert.equal(full.getSnapshot().turn, "enemy");

  const almostFull = new PlayerProgression();
  almostFull.setHealth(95);
  const partial = new CombatManager(almostFull, new VillageProgression());
  partial.startEncounter(localCombatFixture().enemy);
  assert.equal(partial.usePotion(), true);
  assert.equal(partial.getSnapshot().lastAction.damage, -5);
  assert.equal(almostFull.getState().attributes.currentHealth, 100);
});

test("fatal attack grants local rewards once without enemy retaliation, including reentrant actions", () => {
  const { combat, player } = localCombatFixture({ currentHealth: 1, maxHealth: 1, physicalAttack: 1000 });
  player.subscribe(() => combat.act("attack"));
  combat.act("attack");
  const victory = combat.getSnapshot();
  assert.equal(victory.phase, "victory");
  assert.equal(victory.lastAction.actor, "player");
  assert.equal(victory.enemyTurnAt, null);
  assert.equal(player.getState().gold, 102);
  assert.equal(player.getState().experience, 5);
  assert.equal(player.getState().attributes.currentHealth, 40);
  for (const action of ["attack", "flee", "skill", "item"]) combat.act(action);
  assert.equal(combat.usePotion(), false);
  combat.update(100_000);
  assert.strictEqual(combat.getSnapshot(), victory);
  assert.equal(player.getState().gold, 102);
  assert.equal(player.getState().experience, 5);
  combat.closeResult();
  const closed = combat.getSnapshot();
  assert.equal(closed.enemyTurnAt, null);
  assert.equal(closed.lastAction, null);
  combat.update(100_000);
  assert.strictEqual(combat.getSnapshot(), closed);
});

test("enemy fatal attack clamps HP, ends battle and cannot act after result closes or leaks into next battle", () => {
  const { combat, player, enemy } = localCombatFixture({ speed: 6, physicalAttack: 1000 });
  combat.update(5000);
  const defeat = combat.getSnapshot();
  assert.equal(defeat.phase, "defeat");
  assert.equal(defeat.party[0].attributes.currentHealth, 0);
  assert.equal(player.getState().attributes.currentHealth, 0);
  assert.equal(player.getState().gold, 100);
  assert.equal(player.getState().experience, 0);
  assert.equal(defeat.lastAction.at, 11_000);
  combat.update(10_000);
  combat.act("attack");
  assert.strictEqual(combat.getSnapshot(), defeat);
  combat.closeResult();
  assert.equal(combat.startEncounter(enemy), false);
  player.setHealth(40);
  assert.equal(combat.startEncounter({ ...enemy, attributes: { ...enemy.attributes, speed: 5, physicalAttack: 8 } }), true);
  assert.equal(combat.getSnapshot().lastAction, null);
  combat.update(100_000);
  assert.equal(player.getState().attributes.currentHealth, 40);
  combat.act("flee");
  assert.equal(combat.getSnapshot().lastAction.id, 2);
});

test("party supports only supplied living members, rotates alive attackers and keeps pending initiative", () => {
  const { combat, player } = localCombatFixture({ speed: 6, currentHealth: 1000, maxHealth: 1000 });
  const member = { id: "companion", name: "Compañera", isLocalPlayer: false,
    spriteSrc: "/provided.png", attributes: { ...player.getState().attributes, physicalAttack: 20, speed: 100 } };
  assert.equal(combat.getSnapshot().party.length, 1);
  assert.equal(combat.getSnapshot().party[0].spriteSrc, "/sprites/sheets/characters/hero.png");
  assert.equal(combat.addPartyMember({ ...member, attributes: { ...member.attributes, currentHealth: 0 } }), false);
  assert.equal(combat.addPartyMember({ ...member, attributes: { ...member.attributes, currentHealth: NaN } }), false);
  assert.equal(combat.addPartyMember({ ...member, isLocalPlayer: true }), false);
  combat.update(600);
  assert.equal(combat.addPartyMember(member), true);
  assert.equal(combat.addPartyMember(member), false);
  assert.equal(combat.addPartyMember({ ...member, id: "third", spriteSrc: undefined }), true);
  assert.equal(combat.addPartyMember({ ...member, id: "fourth" }), false);
  assert.equal(combat.getSnapshot().enemyTurnAt, 11_000);
  assert.equal(combat.getSnapshot().turn, "enemy");
  assert.equal(combat.getSnapshot().party[1].spriteSrc, "/provided.png");
  assert.equal(combat.getSnapshot().party[2].spriteSrc, "/sprites/sheets/characters/hero.png");
  member.attributes.physicalAttack = 999;
  combat.update(399);
  assert.equal(player.getState().attributes.currentHealth, 40);
  combat.update(1);
  assert.equal(combat.getSnapshot().actingMemberId, "local-player");
  for (const [actor, expectedDamage] of [["local-player", 6], ["companion", 16], ["third", 16]]) {
    assert.equal(combat.getSnapshot().actingMemberId, actor);
    combat.act("attack");
    assert.equal(combat.getSnapshot().lastAction.damage, expectedDamage);
    assert.equal(combat.getSnapshot().lastAction.actorMemberId, actor);
    combat.update(1000);
  }
  assert.equal(combat.getSnapshot().actingMemberId, "local-player");
});

test("fallen local member is skipped while supplied allies keep fighting; only local HP updates progression", () => {
  const { combat, player } = localCombatFixture({ physicalAttack: 1000, currentHealth: 1000, maxHealth: 1000, speed: 1000 });
  const ally = { id: "ally", name: "Aliado", isLocalPlayer: false, attributes: { ...player.getState().attributes } };
  assert.equal(combat.addPartyMember(ally), true);
  combat.act("attack");
  combat.update(1000);
  assert.equal(combat.getSnapshot().phase, "active");
  assert.equal(combat.getSnapshot().actingMemberId, "ally");
  assert.equal(player.getState().attributes.currentHealth, 0);
  assert.equal(combat.usePotion(), false);
  combat.act("attack");
  combat.update(1000);
  assert.equal(combat.getSnapshot().phase, "defeat");
  assert.equal(combat.getSnapshot().party[1].attributes.currentHealth, 0);
  assert.equal(ally.attributes.currentHealth, 40);
  assert.equal(player.getState().attributes.currentHealth, 0);
  assert.equal(combat.addPartyMember({ ...ally, id: "late" }), false);
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

test("request UUID works in mobile LAN HTTP without randomUUID and keeps v4/variant bits", () => {
  const source = { getRandomValues(bytes) { bytes.fill(255); return bytes; } };
  assert.equal(createRequestId(source), "ffffffff-ffff-4fff-bfff-ffffffffffff");
  assert.match(createRequestId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(createRequestId(), createRequestId());
  assert.throws(() => createRequestId({}), /HTTPS/);
});

function expeditionFixture() {
  return { serverNow: Date.now(), missions: [], active: null, eliteAvailableAt: 0,
    profile: { id: "self", name: "Aventurero", sex: "chico", characterClass: "Novato", level: 1,
      experience: 0, gold: 100, currentHealth: 40, maxHealth: 100 }, progressToken: "initial", rewardRevision: 0 };
}

test("one mobile tap during slow polling waits, starts once and retries the same UUID on lost response", async () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const secureRandom = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: { getRandomValues: secureRandom } });
  let releasePoll;
  let polls = 0;
  const starts = [];
  const party = { flush: async () => true, suspendSync: async (action) => action(), adoptProfile() {} };
  const manager = new ExpeditionManager({ async expedition(request) {
    if (request.action === "status") {
      polls++;
      if (polls === 2) await new Promise((resolve) => { releasePoll = resolve; });
      return { ok: true, snapshot: expeditionFixture() };
    }
    starts.push(request);
    return starts.length === 1
      ? { ok: false, code: "network", message: "Respuesta perdida" }
      : { ok: true, snapshot: { ...expeditionFixture(), active: { id: "trip", phase: "outbound" } } };
  } }, party, { checkpoint: async () => ({ ok: true }) }, () => true);
  try {
    manager.openBoard();
    await yieldMicrotasks();
    manager.update(4);
    await yieldMicrotasks();
    const tapped = manager.start("normal:test");
    await manager.start("normal:test");
    assert.equal(manager.getSnapshot().busy, true);
    assert.equal(starts.length, 0);
    releasePoll();
    await tapped;
    assert.equal(starts.length, 1);
    assert.match(starts[0].requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    manager.update(4);
    await yieldMicrotasks();
    assert.equal(starts.length, 2);
    assert.equal(starts[0].requestId, starts[1].requestId);
    assert.equal(manager.getSnapshot().data.active.phase, "outbound");
  } finally { Object.defineProperty(globalThis, "crypto", originalCrypto); manager.destroy(); }
});

test("mobile combat tap during poll uses refreshed version rather than disappearing", async () => {
  let releasePoll;
  let polls = 0;
  const attacks = [];
  const manager = new ExpeditionManager({ async expedition(request) {
    if (request.action === "status") {
      polls++;
      if (polls === 2) await new Promise((resolve) => { releasePoll = resolve; });
      return { ok: true, snapshot: { ...expeditionFixture(), active: { id: "trip", phase: "battle", version: polls } } };
    }
    attacks.push(request);
    return { ok: true, snapshot: { ...expeditionFixture(), active: { id: "trip", phase: "returning" } } };
  } }, { suspendSync: async (action) => action(), adoptProfile() {} }, {}, () => true);
  try {
    manager.openBoard();
    await yieldMicrotasks();
    manager.update(4);
    await yieldMicrotasks();
    const tapped = manager.act("attack");
    assert.equal(manager.getSnapshot().busy, true);
    releasePoll();
    await tapped;
    assert.deepEqual(attacks, [{ action: "attack", expeditionId: "trip", version: 2 }]);
  } finally { manager.destroy(); }
});

test("queued departure revalidates latest status and cannot launch after another active expedition", async () => {
  let releasePoll;
  let polls = 0;
  let starts = 0;
  const manager = new ExpeditionManager({ async expedition(request) {
    if (request.action === "start") starts++;
    polls++;
    if (polls === 2) await new Promise((resolve) => { releasePoll = resolve; });
    return { ok: true, snapshot: { ...expeditionFixture(), active: polls === 2 ? { id: "other", phase: "outbound" } : null } };
  } }, { suspendSync: async (action) => action(), adoptProfile() {} }, {}, () => true);
  try {
    manager.openBoard();
    await yieldMicrotasks();
    manager.update(4);
    await yieldMicrotasks();
    const tapped = manager.start("normal:test");
    releasePoll();
    await tapped;
    assert.equal(starts, 0);
    assert.match(manager.getSnapshot().error, /otro viaje/);
    assert.equal(manager.getSnapshot().busy, false);
  } finally { manager.destroy(); }
});

test("expedition battle automatically opens the common combat view and commands stay server-owned", async () => {
  const requests = [];
  const fixture = expeditionFixture();
  const active = { id: "trip", phase: "battle", version: 2,
    enemy: { name: "Araña de cristal", sprite: "/sprites/enemies/arana.png", level: 3, attack: 2, defense: 0, maxHealth: 18 },
    enemyHealth: 18, playerHealth: 40, playerMaxHealth: 100, outcome: null, log: "Encuentro.",
    mission: { gold: 27, experience: 34 } };
  const manager = new ExpeditionManager({ async expedition(request) {
    requests.push(request);
    return { ok: true, snapshot: { ...fixture, active: request.action === "attack"
      ? { ...active, phase: "returning", outcome: "victory", enemyHealth: 0, version: 3 } : active } };
  } }, { suspendSync: async (action) => action(), adoptProfile() {} }, {}, () => true);
  try {
    manager.openBoard();
    await yieldMicrotasks();
    assert.equal(manager.getSnapshot().open, false);
    assert.equal(manager.getSnapshot().battleOpen, true);
    manager.openBoard();
    assert.equal(manager.getSnapshot().battleOpen, false);
    manager.openBattle();
    assert.equal(manager.getSnapshot().open, false);
    assert.equal(manager.getSnapshot().battleOpen, true);
    const overlay = expeditionCombatSnapshot(manager.getSnapshot().data);
    assert.equal(overlay.phase, "active");
    assert.equal(overlay.enemy.attributes.currentHealth, 18);
    assert.match(overlay.enemy.name, /Nv\. 3/);
    assert.equal(manager.battleController.usePotion(), false);
    manager.battleController.act("attack");
    await yieldMicrotasks();
    const attack = requests.find((request) => request.action === "attack");
    assert.ok(attack);
    assert.equal(attack.version, 2);
    assert.equal(expeditionCombatSnapshot(manager.getSnapshot().data).phase, "victory");
    assert.equal(manager.getSnapshot().battleOpen, true);
    manager.battleController.closeResult();
    assert.equal(manager.getSnapshot().battleOpen, false);
    assert.equal(manager.getSnapshot().open, true);
  } finally { manager.destroy(); }
});

test("old expeditions still project into common overlay without enemy level or loot", () => {
  const data = { ...expeditionFixture(), active: { id: "old", phase: "returning", version: 3, outcome: "fled",
    enemy: { name: "Araña", sprite: "/sprites/enemies/arana.png", attack: 1, defense: 0, maxHealth: 14 },
    enemyHealth: 6, playerHealth: 39, playerMaxHealth: 100, log: "Retirada", mission: { gold: 20, experience: 25 } } };
  assert.equal(expeditionCombatSnapshot(data).phase, "fled");
  assert.equal(expeditionCombatSnapshot(data).enemy.name, "Araña");
  const delivered = { ...data, active: { ...data.active, phase: "completed", outcome: "victory", rewardGranted: true } };
  assert.match(expeditionCombatSnapshot(delivered).log, /Botín entregado/);
  assert.doesNotMatch(expeditionCombatSnapshot(delivered).log, /pendiente/);
});

test("expedition adapter forwards initiative, speeds and confirmed animation metadata", () => {
  const action = { id: 3, actor: "enemy", kind: "attack", damage: 4, at: 1000 };
  const data = { ...expeditionFixture(), active: { id: "trip", phase: "battle", version: 3,
    enemy: { name: "Araña", sprite: "/sprites/enemies/arana.png", speed: 8, attack: 7, defense: 0, maxHealth: 20 },
    enemyHealth: 15, playerHealth: 36, playerMaxHealth: 100, log: "Ataque enemigo",
    mission: { gold: 20, experience: 25 }, playerSpeed: 5, turn: "enemy", enemyTurnAt: 2000, lastAction: action } };
  const view = expeditionCombatSnapshot(data);
  assert.equal(view.turn, "enemy");
  assert.equal(view.enemy.attributes.speed, 8);
  assert.equal(view.party[0].attributes.speed, 5);
  assert.equal(view.party[0].spriteSrc, "/sprites/sheets/characters/hero.png");
  assert.strictEqual(view.lastAction, action);
  assert.equal(view.enemyTurnAt, 2000);
});

test("expedition polls due enemy turn promptly with throttle, never attacks or resolves locally", async () => {
  let now = 0;
  let polls = 0;
  let attacks = 0;
  const manager = new ExpeditionManager({ async expedition(request) {
    if (request.action === "attack") attacks++;
    else polls++;
    return { ok: true, snapshot: { ...expeditionFixture(), active: { id: "trip", phase: "battle", version: 1,
      turn: "enemy", enemyTurnAt: 1000, enemy: { name: "Araña" } } } };
  } }, { suspendSync: async (action) => action(), adoptProfile() {} }, {}, () => true);
  manager.serverNow = () => now;
  try {
    manager.update(0);
    await yieldMicrotasks();
    assert.equal(polls, 1);
    await manager.act("attack");
    assert.equal(attacks, 0);
    now = 999;
    manager.update(0.1);
    assert.equal(polls, 1);
    now = 1000;
    manager.update(0.1);
    await yieldMicrotasks();
    assert.equal(polls, 2);
    for (let frame = 0; frame < 30; frame++) manager.update(0.01);
    assert.equal(polls, 2);
    now = 1500;
    manager.update(0.01);
    await yieldMicrotasks();
    assert.equal(polls, 3);
  } finally { manager.destroy(); }
});

test("combat manager supports target selection for groups and auto-targets a lone enemy", () => {
  const player = new PlayerProgression();
  const manager = new CombatManager(player, new VillageProgression());
  const first = { id: "first", name: "Primer enemigo", sprite: "/first.png", experienceReward: 1, goldReward: 1,
    attributes: { ...player.getState().attributes, currentHealth: 1, maxHealth: 1, speed: 1 } };
  const second = { ...first, id: "second", name: "Segundo enemigo", sprite: "/second.png" };
  assert.equal(manager.startEncounterGroup([first]), true);
  assert.equal(manager.getSnapshot().selectedTargetId, "first");
  assert.equal(manager.selectTarget("first"), false, "single enemy requires no target menu");
  manager.act("attack");
  assert.equal(manager.getSnapshot().phase, "victory");
  manager.closeResult();
  assert.equal(manager.startEncounterGroup([first, second]), true);
  assert.equal(manager.selectTarget("second"), true);
  manager.act("attack");
  assert.equal(manager.getSnapshot().lastAction.targetEnemyId, "second");
  assert.equal(manager.getSnapshot().enemies.find((enemy) => enemy.id === "second").attributes.currentHealth, 0);
  assert.equal(manager.getSnapshot().enemies.find((enemy) => enemy.id === "first").attributes.currentHealth, 1);
});