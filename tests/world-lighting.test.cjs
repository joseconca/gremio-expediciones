const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./load-typescript.cjs");
const { VillageProgression } = require("../src/game/gameplay/VillageProgression.ts");
const { calculateVillageExteriorGates } = require("../src/game/gameplay/VillageGateLayout.ts");
const { DayNightSystem } = require("../src/game/lighting/DayNightSystem.ts");
const { getShadowVector } = require("../src/game/lighting/DirectionalLight.ts");
const { SpriteShadowRenderer, shadowSpriteGroundPoint } = require("../src/game/lighting/SpriteShadowRenderer.ts");
const { Building } = require("../src/game/entities/Building.ts");
const { townHallDefinitions } = require("../src/game/data/buildings/townHall.ts");
const { Animator } = require("../src/game/rendering/Animator.ts");
const { SpriteSheet } = require("../src/game/rendering/SpriteSheet.ts");
const { GroundProjection } = require("../src/game/rendering/GroundProjection.ts");
const { BaseScene } = require("../src/game/scenes/BaseScene.ts");
const { PlayerProgression } = require("../src/game/gameplay/PlayerProgression.ts");
const { calculateVillageBounds } = require("../src/shared/village.ts");
const { createVillageMap } = require("../src/game/data/base/baseMap.ts");
const { createVillageCollision } = require("../src/game/data/base/baseCollision.ts");
const { CollisionMap } = require("../src/game/world/CollisionMap.ts");
const { TileMap } = require("../src/game/world/TileMap.ts");
const { tavernDefinition } = require("../src/game/data/buildings/tavern.ts");

test("224 px spacing and symmetric tile steps for odd/even rows; works include their future slot", () => {
  // Synthetic counts exercise the future layout without extending today's building catalogue.
  for (const [count, steps] of [[1, [0]], [2, [0, 0]], [3, [1, 0, 1]], [4, [1, 0, 0, 1]], [7, [3, 2, 1, 0, 1, 2, 3]]]) {
    const buildings = Array.from({ length: count }, (_, index) => ({ type: index === Math.floor(count / 2) ? "town-hall" : "tavern", level: 1 }));
    const placements = new VillageProgression(buildings).getBuildingPlacements();
    assert.deepEqual(placements.map((building) => (building.y - 704) / 32), steps);
    for (let index = 1; index < count; index++) assert.equal(placements[index].x - placements[index - 1].x, 224);
    assert.equal((placements[0].x + placements[count - 1].x + 128) / 2, 496);
  }
  for (const types of [["town-hall", "tavern", "embassy"], ["tavern", "embassy", "town-hall"]]) {
    const placements = new VillageProgression(types.map((type) => ({ type, level: 2 }))).getBuildingPlacements();
    assert.ok(placements.every((building) => building.x >= 0 && building.x + 128 <= 960));
    assert.ok(placements.every((building) => building.x + 64 + 12 <= 960));
  }
  const village = new VillageProgression([{ type: "tavern", level: 1 }, { type: "town-hall", level: 2 }]);
  village.startConstruction("embassy", 3);
  const during = village.getBuildingPlacements();
  village.update(60);
  assert.deepEqual(village.getBuildingPlacements().map(({ x, y }) => ({ x, y })), during.map(({ x, y }) => ({ x, y })));
  const gates = calculateVillageExteriorGates(during, {
    centerX: 496, horizontalClearance: 32, verticalClearance: 192, edgeMargin: 32,
    directions: ["north", "south", "east", "west"],
  }, 960);
  assert.equal(gates.find((gate) => gate.direction === "south").y, 736 + 192);
});

test("four time environments at exact boundaries, wrapping and live injected clock", () => {
  let hour = 0;
  const cycle = new DayNightSystem(() => hour);
  for (const [time, phase] of [[0, "night"], [6.999, "night"], [7, "morning"], [10.999, "morning"], [11, "day"], [16.999, "day"], [17, "dusk"], [20.999, "dusk"], [21, "night"], [24, "night"], [-1, "night"]]) {
    hour = time;
    cycle.update();
    assert.equal(cycle.getState().phase, phase);
    assert.ok(cycle.getState().ambient.alpha >= 0 && cycle.getState().ambient.alpha <= 1);
  }
  const samples = [9, 14, 19, 23].map((time) => new DayNightSystem(() => time).getState());
  assert.equal(new Set(samples.map((state) => JSON.stringify(state.ambient))).size, 4);
  assert.ok(samples[3].ambient.alpha > samples[2].ambient.alpha);
  assert.ok(samples[0].ambient.alpha > samples[1].ambient.alpha);
  for (const boundary of [7, 11, 17, 21, 24]) {
    const before = new DayNightSystem(() => boundary - 0.0001).getState().ambient;
    const after = new DayNightSystem(() => boundary).getState().ambient;
    for (const key of ["r", "g", "b", "alpha"]) assert.ok(Math.abs(before[key] - after[key]) < 0.1);
  }
});

test("shadow lies opposite solar azimuth, stretches at low sun, vanishes at night", () => {
  for (const hour of [8, 14, 20]) {
    const sun = new DayNightSystem(() => hour).getState().sun;
    const shadow = getShadowVector(sun, 100);
    assert.ok(shadow.x * Math.cos(sun.azimuth) + shadow.y * Math.sin(sun.azimuth) < 0);
    assert.ok(Math.hypot(shadow.x, shadow.y) <= 160 + 1e-9);
    if (hour === 8) assert.ok(shadow.x < 0);
    if (hour === 20) assert.ok(shadow.x > 0);
  }
  const noon = getShadowVector(new DayNightSystem(() => 14).getState().sun, 100);
  const morning = getShadowVector(new DayNightSystem(() => 8).getState().sun, 100);
  assert.ok(noon.y < 0);
  assert.ok(Math.hypot(morning.x, morning.y) > Math.hypot(noon.x, noon.y));
  assert.deepEqual(getShadowVector(new DayNightSystem(() => 23).getState().sun, 100), { x: 0, y: 0 });
});

test("sprite shadow keeps its full baseline fixed and shears height without rotating", () => {
  const sprite = { anchorX: 16, anchorY: 64 };
  const footprint = { x: 100, y: 200, radiusY: 4 };
  for (const sweep of [{ x: -80, y: 0 }, { x: 80, y: 0 }, { x: 0, y: -80 }, { x: 40, y: -40 }, { x: 40, y: 40 }]) {
    assert.deepEqual(shadowSpriteGroundPoint(sprite, footprint, sweep, 16, 64), { x: footprint.x, y: footprint.y });
    const tip = shadowSpriteGroundPoint(sprite, footprint, sweep, 16, 0);
    assert.equal(tip.x, footprint.x + sweep.x);
    assert.equal(tip.y, footprint.y + (sweep.y === 0 ? -8 : sweep.y));
    const left = shadowSpriteGroundPoint(sprite, footprint, sweep, 0, 64);
    const right = shadowSpriteGroundPoint(sprite, footprint, sweep, 32, 64);
    assert.deepEqual(left, { x: 84, y: 200 });
    assert.deepEqual(right, { x: 116, y: 200 });
    const middle = shadowSpriteGroundPoint(sprite, footprint, sweep, 16, 32);
    assert.equal(middle.x, (tip.x + footprint.x) / 2);
    assert.equal(middle.y, (tip.y + footprint.y) / 2);
    const cross = (right.x - left.x) * (tip.y - footprint.y);
    assert.notEqual(cross, 0);
  }
  assert.deepEqual(shadowSpriteGroundPoint(sprite, footprint, { x: 0, y: 0 }, 16, 0), { x: 100, y: 200 });
});

function mockCanvas() {
  const calls = [];
  const canvas = { width: 240, height: 360, calls };
  const ctx = {
    canvas, globalCompositeOperation: "source-over",
    save() {}, restore() {}, transform(...args) { calls.push(["transform", ...args]); },
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, clip() {},
    drawImage(...args) { calls.push(["draw", this.globalCompositeOperation, ...args]); },
    fillRect(...args) { calls.push(["fill", this.globalCompositeOperation, ...args]); },
  };
  canvas.getContext = () => ctx;
  return canvas;
}

test("shadow triangles overlap image cells by one screen pixel without stretching or sampling outside the mask", () => {
  const renderer = new SpriteShadowRenderer();
  const canvas = mockCanvas();
  const mask = { width: 128, height: 128 };
  renderer.drawTriangle(canvas.getContext("2d"), mask, 16, 16, 16, 16,
    [{ x: 0, y: 0 }, { x: 32, y: 0 }, { x: 0, y: 8 }],
    { x: 0, y: 0 }, 32, 0, 0, 8);
  const draw = canvas.calls.find((call) => call[0] === "draw");
  assert.deepEqual(draw.slice(3), [15.5, 14, 17, 20, -0.5, -2, 17, 20]);
  const edgeCanvas = mockCanvas();
  renderer.drawTriangle(edgeCanvas.getContext("2d"), mask, 0, 0, 16, 16,
    [{ x: 0, y: 0 }, { x: 32, y: 0 }, { x: 0, y: 8 }],
    { x: 0, y: 0 }, 32, 0, 0, 8);
  const edge = edgeCanvas.calls.find((call) => call[0] === "draw");
  assert.deepEqual(edge.slice(3), [0, 0, 16.5, 18, 0, 0, 16.5, 18]);
});

test("mask recombines building layers, uses source-in alpha and caches per animated frame", () => {
  global.Image = class {
    complete = true;
    naturalWidth = 128;
  };
  const building = new Building({ x: 100, y: 200, definition: townHallDefinitions[2] });
  // Simulate the actual image-load callback without browser automation.
  building.spriteSheet.image.onload();
  const sprite = building.getShadowSprite();
  assert.equal(sprite.parts.length, 3);
  assert.deepEqual(sprite.parts.map((part) => part.sy), [0, 128, 256]);
  assert.ok(sprite.parts.every((part) => part.y === 0));
  assert.equal(sprite.width, 128);
  assert.equal(sprite.height, 128);
  const canvases = [];
  global.document = { createElement() { const canvas = mockCanvas(); canvases.push(canvas); return canvas; } };
  const renderer = new SpriteShadowRenderer();
  const target = mockCanvas();
  const projection = new GroundProjection({ horizonScreenRatio: -0.8, groundFocusRatio: 0.72, cameraDepth: 320, focalLength: 320 });
  const reference = { worldX: 164, worldY: 200, screenX: 120, screenY: 245 };
  const footprint = building.getShadowFootprint();
  const draw = () => renderer.render(target.getContext("2d"), sprite, footprint, { x: 40, y: -40 }, projection, reference);
  draw(); draw();
  assert.equal(canvases.length, 1);
  assert.equal(canvases[0].calls.filter((call) => call[0] === "draw").length, 3);
  assert.ok(canvases[0].calls.some((call) => call[0] === "fill" && call[1] === "source-in"));
  assert.ok(target.calls.some((call) => call[0] === "transform"));
  const sheet = new SpriteSheet({ src: "/hero.png", frameWidth: 32, frameHeight: 64 });
  sheet.image.onload();
  const animator = new Animator(sheet, { walk: { frames: [{ x: 0, y: 0 }, { x: 1, y: 0 }], frameDuration: 0.1 } });
  animator.play("walk");
  const first = animator.getShadowSprite();
  assert.strictEqual(animator.getShadowSprite(), first);
  animator.update(0.1);
  assert.notStrictEqual(animator.getShadowSprite(), first);
  animator.update(0.1);
  assert.strictEqual(animator.getShadowSprite(), first);
});

test("town-hall doors, entrance triggers and return spawns follow row movements", () => {
  global.Image = class { complete = true; naturalWidth = 128; };
  const village = new VillageProgression([{ type: "town-hall", level: 2 }, { type: "tavern", level: 1 }]);
  const scene = new BaseScene({
    canvas: { width: 240, height: 360 }, ctx: {}, input: {}, sceneManager: {},
    dialogueManager: {}, villageProgression: village, playerProgression: new PlayerProgression(),
    combatManager: {}, partyManager: {}, dayNightSystem: new DayNightSystem(() => 14),
  });
  const verify = () => {
    const hall = village.getBuildingPlacements().find((building) => building.type === "town-hall");
    const spawn = scene.getSpawnPoint("town-hall-exit");
    assert.equal(spawn.x, hall.x + 48);
    assert.equal(spawn.y, hall.y - 16);
    const entrance = scene.villageEntranceObjects.find((object) => object.targetSceneId === "town-hall-interior");
    assert.equal(entrance.x, hall.x + 48);
    assert.equal(entrance.y, hall.y + townHallDefinitions[2].entrance.trigger.offsetY);
    const doors = scene.villageEntranceObjects.filter((object) => object.definition);
    assert.ok(doors.some((door) => door.x === hall.x + 64 && door.y === hall.y));
    assert.equal(scene.villageEntranceObjects.filter((object) => object.targetSceneId === "town-hall-interior").length, 1);
  };
  verify();
  village.startConstruction("embassy", 3);
  scene.syncVillageLayout();
  verify();
  village.update(60);
  scene.syncVillageLayout();
  verify();
  for (const [type, spawnId] of [["tavern", "tavern-exit"], ["embassy", "embassy-exit"]]) {
    const building = village.getBuildingPlacements().find((placement) => placement.type === type);
    const spawn = scene.getSpawnPoint(spawnId);
    assert.equal(spawn.x, building.x + 64);
    assert.equal(spawn.y, building.y + 40);
  }
});

test("village bounds grow with plots, preserve checkpoints and contain all seven synthetic buildings", () => {
  let previousWidth = 0;
  let previousHeight = 0;
  for (const count of [1, 2, 3, 4, 7]) {
    const bounds = calculateVillageBounds(count);
    const buildings = Array.from({ length: count }, (_, index) => ({ type: index === 0 ? "town-hall" : "tavern", level: 2 }));
    for (const placement of new VillageProgression(buildings).getBuildingPlacements()) {
      assert.ok(placement.x >= bounds.minX + 64);
      assert.ok(placement.x + 128 <= bounds.maxX - 64);
      assert.ok(placement.y - 128 >= bounds.minY);
      assert.ok(placement.y + 192 < bounds.maxY);
    }
    assert.ok(bounds.width > previousWidth);
    assert.ok(bounds.height >= previousHeight);
    assert.ok(480 >= bounds.minX && 480 < bounds.maxX);
    assert.ok(768 + 56 < bounds.maxY);
    previousWidth = bounds.width;
    previousHeight = bounds.height;
  }
  assert.ok(calculateVillageBounds(1).width < 960);
  assert.ok(calculateVillageBounds(1).height < 1440);
  assert.ok(calculateVillageBounds(7).minX < 0);
});

test("map origin and resize retain local collision indexing without allocating a new map", () => {
  const collision = new CollisionMap(createVillageCollision(1));
  const map = new TileMap(createVillageMap(1));
  assert.equal(collision.isBlockedRect(480, 818, 12, 6), false);
  assert.equal(collision.isBlockedRect(0, 0, 12, 6), true);
  collision.resize(createVillageCollision(7));
  map.resize(createVillageMap(7));
  assert.equal(collision.originX, map.originX);
  assert.equal(collision.isBlockedRect(collision.originX + 4, collision.originY + 4, 12, 6), false);
  assert.equal(collision.isBlockedRect(collision.originX - 2, collision.originY, 12, 6), true);
  assert.equal(collision.isBlockedTile(0, 0), false);
});

test("entrance sits behind its door, cannot teleport closed, and facade leaves a passage", () => {
  global.Image = class { complete = true; naturalWidth = 128; };
  const village = new VillageProgression([{ type: "town-hall", level: 2 }, { type: "tavern", level: 1 }]);
  let transitions = 0;
  const scene = new BaseScene({
    canvas: { width: 240, height: 360 }, ctx: {}, input: {}, sceneManager: { changeScene() { transitions++; } },
    dialogueManager: {}, villageProgression: village, playerProgression: new PlayerProgression(),
    combatManager: {}, partyManager: {}, dayNightSystem: new DayNightSystem(() => 14),
  });
  const placement = village.getBuildingPlacements().find((building) => building.type === "tavern");
  const door = scene.villageEntranceObjects.find((object) => object.definition && object.x === placement.x + 64);
  const trigger = scene.villageEntranceObjects.find((object) => object.targetSceneId === "tavern-interior");
  assert.equal(trigger.activate(), false);
  assert.equal(transitions, 0);
  const doorBack = door.y + door.definition.collider.offsetY;
  assert.ok(trigger.y + trigger.colliders[0].height <= doorBack);
  assert.equal(scene.collisionSystem.canOccupy(scene.player, placement.x + 50, placement.y - 60), false);
  door.state = "open";
  assert.equal(scene.collisionSystem.canOccupy(scene.player, placement.x + 50, placement.y - 60), true);
  assert.equal(trigger.activate(), true);
  assert.equal(transitions, 1);
  assert.equal(tavernDefinition.entrance.door.offsetX, 64);
});

test("base resizes when a construction starts without rebuilding the world or player", () => {
  global.Image = class { complete = true; naturalWidth = 128; };
  const village = new VillageProgression([{ type: "town-hall", level: 2 }]);
  const scene = new BaseScene({
    canvas: { width: 240, height: 360 }, ctx: {}, input: {}, sceneManager: {},
    dialogueManager: {}, villageProgression: village, playerProgression: new PlayerProgression(),
    combatManager: {}, partyManager: {}, dayNightSystem: new DayNightSystem(() => 14),
  });
  const world = scene.world;
  const player = scene.player;
  const width = world.width;
  village.startConstruction("tavern", 1);
  scene.syncVillageLayout();
  assert.strictEqual(scene.world, world);
  assert.strictEqual(scene.player, player);
  assert.ok(world.width > width);
  assert.equal(world.width, world.tileMap.width * world.tileMap.tileSize);
  assert.equal(world.width, world.collisionMap.width * world.collisionMap.tileSize);
  const plot = village.getBuildingPlacements().find((building) => building.underConstruction);
  player.x = plot.x + 50;
  player.y = plot.y - 60;
  assert.equal(scene.collisionSystem.canOccupy(player, player.x, player.y), true);
  village.update(60);
  scene.syncVillageLayout();
  assert.equal(scene.collisionSystem.canOccupy(player, player.x, player.y), true);
  assert.notEqual(player.y, plot.y - 60);
});

test("late dusk is darker by 20:15 and smoothly approaches night without changing its schedule", () => {
  const sample = (hour) => new DayNightSystem(() => hour).getState();
  const early = sample(19);
  const late = sample(20.25);
  const night = sample(21);
  assert.equal(late.phase, "dusk");
  assert.ok(Math.abs(late.ambient.alpha - 0.485) < 1e-9);
  assert.ok(late.ambient.alpha > early.ambient.alpha);
  assert.ok(late.ambient.alpha < night.ambient.alpha);
  assert.ok(late.ambient.r < early.ambient.r);
  assert.ok(late.sun.intensity > 0);
  assert.equal(night.phase, "night");
  assert.equal(night.sun.intensity, 0);
  for (const boundary of [19, 20, 20.5, 21]) {
    const before = sample(boundary - 0.0001).ambient;
    const after = sample(boundary).ambient;
    for (const key of ["r", "g", "b", "alpha"]) assert.ok(Math.abs(before[key] - after[key]) < 0.1);
  }
});