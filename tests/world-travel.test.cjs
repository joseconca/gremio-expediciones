const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./load-typescript.cjs");
const { MobilityManager } = require("../src/game/gameplay/MobilityManager.ts");
const { MenuManager } = require("../src/game/gameplay/MenuManager.ts");
const { RETURN_CART_ANIMATIONS } = require("../src/game/entities/ReturnCart.ts");
const { BASE_RETURN_LOCATION, interpolateJourney } = require("../src/shared/travel.ts");
const { LightingSystem } = require("../src/game/lighting/LightingSystem.ts");
const yieldMicrotasks = () => new Promise((resolve) => setImmediate(resolve));
const initial = (location = BASE_RETURN_LOCATION) => ({ revision: 0, location, journey: null, serverNow: 1000 });

test("location checkpoints every 4 s outside, 12 s inside and immediately on scene change", async () => {
  let location = { ...BASE_RETURN_LOCATION };
  const requests = [];
  const gateway = { async mobility(request) {
    requests.push(request);
    return { ok: true, mobility: { revision: requests.length, location: request.location, journey: null, serverNow: 1000 } };
  } };
  const manager = new MobilityManager(gateway, initial(), () => location, () => {}, () => 0);
  location.x += 20;
  manager.update(11);
  assert.equal(requests.length, 0);
  manager.update(1);
  await yieldMicrotasks();
  assert.equal(requests.length, 1);
  location = { sceneId: "exterior-world", x: 4082, y: 4140, direction: "up" };
  manager.update(0);
  await yieldMicrotasks();
  assert.equal(requests.length, 2);
  location.x += 50;
  manager.update(3.9);
  assert.equal(requests.length, 2);
  manager.update(0.1);
  await yieldMicrotasks();
  assert.equal(requests.length, 3);
  manager.destroy();
});

test("persisted trip interpolates while offline, waits for server arrival and is input-lockable", async () => {
  const location = { sceneId: "exterior-world", x: 3482, y: 4040, direction: "right" };
  const journey = { id: "trip", fromX: 3482, fromY: 4040, toX: 4082, toY: 4040, departureAt: 1000, arrivalAt: 6000 };
  let now = 0;
  let arrivals = 0;
  const manager = new MobilityManager({ async mobility() {
    return { ok: true, mobility: { revision: 2, location: BASE_RETURN_LOCATION, journey: null, serverNow: 7000 } };
  } }, { ...initial(location), journey }, () => location, () => arrivals++, () => now);
  now = 2500;
  assert.equal(manager.getJourneyPosition().x, 3782);
  now = 9000;
  assert.equal(manager.getJourneyPosition().progress, 1);
  assert.equal(arrivals, 0);
  assert.equal((await manager.checkpoint()).ok, false);
  manager.update(4);
  await yieldMicrotasks();
  assert.equal(arrivals, 1);
  assert.equal(manager.getSnapshot().journey, null);
  manager.destroy();
});

test("cart calls checkpoint first, survive lost response and never trust client timestamps", async () => {
  let location = { sceneId: "exterior-world", x: 4000, y: 5000, direction: "up" };
  const requests = [];
  const journey = { id: "server-trip", fromX: 4000, fromY: 5000, toX: 4082, toY: 4040, departureAt: 1000, arrivalAt: 9000 };
  const gateway = { async mobility(request) {
    requests.push(request);
    if (request.action === "checkpoint") return { ok: true, mobility: { revision: 1, location, journey: null, serverNow: 1000 } };
    if (request.action === "call-cart") return { ok: false, code: "network", message: "Respuesta perdida" };
    return { ok: true, mobility: { revision: 2, location, journey, serverNow: 2000 } };
  } };
  const manager = new MobilityManager(gateway, initial(), () => location, () => {}, () => 0);
  const result = await manager.callCart();
  assert.equal(result.ok, true);
  assert.deepEqual(requests.map((request) => request.action), ["checkpoint", "call-cart", "status"]);
  assert.equal(requests[1].revision, 1);
  assert.equal(Object.hasOwn(requests[1], "arrivalAt"), false);
  assert.equal(manager.getSnapshot().journey.id, "server-trip");
  assert.equal((await manager.callCart()).ok, false);
  manager.destroy();
});

test("location conflicts stop writes; menu commands blocked in journey", async () => {
  const location = { sceneId: "exterior-world", x: 4000, y: 5000, direction: "up" };
  let requests = 0;
  const manager = new MobilityManager({ async mobility(request) {
    requests++;
    return request.action === "status"
      ? { ok: true, mobility: { ...initial(), revision: 5 } }
      : { ok: false, code: "location_conflict", message: "Recarga" };
  } }, initial(), () => location, () => {}, () => 0);
  await manager.checkpoint();
  assert.equal(manager.getSnapshot().conflict, true);
  manager.update(12);
  assert.equal(requests, 1);
  let canOpen = false;
  const menu = new MenuManager(manager, () => canOpen);
  menu.toggle();
  assert.equal(menu.getSnapshot().open, false);
  canOpen = true;
  menu.toggle();
  menu.selectTab("party");
  assert.equal(menu.getSnapshot().tab, "party");
  menu.close();
  assert.equal(menu.getSnapshot().open, false);
  manager.destroy();
});

test("cart animation matches the supplied 3x8 sheet and interpolation clamps", () => {
  for (const [index, direction] of ["right", "up", "left", "down"].entries()) {
    assert.deepEqual(RETURN_CART_ANIMATIONS[`move-${direction}`].frames, [0, 1, 2].map((x) => ({ x, y: index * 2 + 1 })));
    assert.equal(RETURN_CART_ANIMATIONS[`idle-${direction}`].frames[0].y, index * 2);
  }
  const trip = { fromX: 0, fromY: 0, toX: 100, toY: 100, departureAt: 10, arrivalAt: 20 };
  assert.equal(interpolateJourney(trip, 0).progress, 0);
  assert.equal(interpolateJourney(trip, 50).progress, 1);
});

test("elliptical contact shadows are removed; interaction radii are independent", () => {
  let circles = 0;
  const ctx = { canvas: { width: 240, height: 360 }, save() {}, restore() {}, beginPath() {}, fill() {}, moveTo() {}, lineTo() { circles++; }, closePath() {} };
  const caster = { getShadowFootprint() { return { x: 0, y: 0, radiusX: 9, radiusY: 4, height: 40, shape: "ellipse" }; } };
  const projection = { project(x, y) { return { x, y, scale: 1 }; } };
  new LightingSystem().renderShadows(ctx, [caster], projection, {});
  assert.equal(circles, 0);
  new LightingSystem({ dayNight: { getState: () => ({ sun: { intensity: 0 } }) } }).renderShadows(ctx, [caster], projection, {});
  assert.equal(circles, 0);
});

test("double network failure preserves exact checkpoint before saving newer movement", async () => {
  let location = { sceneId: "exterior-world", x: 4000, y: 5000, direction: "up" };
  const writes = [];
  let failing = true;
  const gateway = { async mobility(request) {
    if (request.action !== "status") writes.push(request);
    if (failing) return { ok: false, code: "network", message: "Sin conexión" };
    return { ok: true, mobility: { revision: 1, location: request.location, journey: null, serverNow: 1000 } };
  } };
  const manager = new MobilityManager(gateway, initial(), () => location, () => {}, () => 0);
  await manager.checkpoint();
  location = { ...location, x: 4100 };
  failing = false;
  manager.update(4);
  await yieldMicrotasks();
  assert.deepEqual(writes[1], writes[0]);
  assert.equal(manager.getSnapshot().conflict, false);
  manager.destroy();
});

test("ambiguous cart start stays locked until recovered, and destroyed engines send no new cart call", async () => {
  const location = { sceneId: "exterior-world", x: 4000, y: 5000, direction: "up" };
  const failing = new MobilityManager({ async mobility() { return { ok: false, code: "network", message: "Sin conexión" }; } },
    initial(location), () => location, () => {}, () => 0);
  await failing.callCart();
  assert.equal(failing.getSnapshot().travelPending, true);
  const menu = new MenuManager(failing, () => !failing.getSnapshot().travelPending);
  menu.toggle();
  assert.equal(menu.getSnapshot().open, false);
  failing.destroy();
  let finish;
  let cartCalls = 0;
  const manager = new MobilityManager({ async mobility(request) {
    if (request.action === "call-cart") cartCalls++;
    await new Promise((resolve) => { finish = resolve; });
    return { ok: true, mobility: { revision: 1, location, journey: null, serverNow: 1000 } };
  } }, initial(), () => location, () => {}, () => 0);
  const calling = manager.callCart();
  manager.destroy();
  finish();
  await calling;
  assert.equal(cartCalls, 0);
});

test("conflicts never silently adopt a different session's journey or interior location", async () => {
  const location = { sceneId: "tavern-interior", x: 64, y: 48, direction: "down" };
  let statusCalls = 0;
  const manager = new MobilityManager({ async mobility(request) {
    if (request.action === "status") statusCalls++;
    return { ok: false, code: "travel_active", message: "Recarga para ver el viaje" };
  } }, initial(), () => location, () => {}, () => 0);
  await manager.checkpoint();
  assert.equal(manager.getSnapshot().conflict, true);
  assert.equal(statusCalls, 0);
  manager.destroy();
});