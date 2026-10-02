require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { battleHeroSprite: sprite } = require("../src/game/data/battleSprites.ts");
const { heroAnimations } = require("../src/game/data/heroAnimations.ts");

test("battle hero uses the existing sheet and right-facing rows", () => {
  assert.equal(sprite.src, "/sprites/sheets/characters/hero.png");
  assert.equal(sprite.frameWidth, 32);
  assert.equal(sprite.frameHeight, 64);
  assert.equal(sprite.columns, 4);
  assert.equal(sprite.rows, 9);
  assert.equal(sprite.idle.row, 4);
  assert.equal(sprite.attack.row, 8);
  assert.equal(sprite.frameWidth * sprite.columns, 128);
  assert.equal(sprite.frameHeight * sprite.rows, 576);
});

test("battle animation timing and steps are derived from hero animations", () => {
  for (const [name, definition] of [["idle-right", sprite.idle], ["attack-right", sprite.attack]]) {
    const animation = heroAnimations[name];
    assert.equal(definition.frameCount, animation.frames.length);
    assert.equal(definition.frameDuration, animation.frameDuration);
    assert.equal(definition.frameCount, 4);
    assert.ok(definition.row < sprite.rows);
    assert.deepEqual(animation.frames.map((frame) => frame.x), [0, 1, 2, 3]);
    assert.ok(animation.frames.every((frame) => frame.y === definition.row));
  }
  assert.equal(sprite.idle.frameCount * sprite.idle.frameDuration, 0.8);
  assert.equal(sprite.attack.frameCount * sprite.attack.frameDuration, 0.4);
});