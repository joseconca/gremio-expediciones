require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { battleHeroSprite: sprite } = require("../src/game/data/battleSprites.ts");
const { heroAnimations } = require("../src/game/data/heroAnimations.ts");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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

test("battle motion and damage siblings have distinct keys for repeated attacks on both sides", () => {
  const filename = path.resolve(__dirname, "../src/components/game/BattleOverlay.tsx");
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  });
  const spriteComponent = () => null;
  const jsx = (type, props, key) => ({ type, props, key });
  const dependencies = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useEffect() {}, useRef: () => ({ current: null }) },
    "next/image": { default: () => null },
    "./BattleCharacterSprite": { default: spriteComponent },
    "@/shared/combat": { ATTACK_ANIMATION_MS: 500 },
    "@/shared/enemies": { enemyDifficultyColor: () => "hsl(60 82% 48%)" },
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", outputText)((name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  const render = loaded.exports.default;
  const attributes = { currentHealth: 40, maxHealth: 100, speed: 5 };
  for (const count of [1, 3]) {
    const party = Array.from({ length: count }, (_, index) => ({ id: `member-${index}`, name: `Member ${index}`,
      attributes, isLocalPlayer: index === 0 }));
    for (let id = 1; id <= 20; id++) {
      for (const actor of ["player", "enemy"]) {
        const snapshot = { phase: "active", menu: "root", turn: "player", party, log: "Attack", actingMemberId: "member-0",
          enemy: { id: "goblin_explorador", name: "Goblin", sprite: "/test.png", attributes },
          lastAction: { id, actor, kind: "attack", damage: 6, at: 1000, targetMemberId: "member-0" } };
        const tree = render({ manager: {}, snapshot, potionCount: 1, presentationNow: 1000 });
        let sprites = 0;
        let damageLabels = 0;
        function inspect(node) {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) { node.forEach(inspect); return; }
          if (node.type === spriteComponent) sprites++;
          if (node.type === "span" && node.props.className === "damage") damageLabels++;
          const children = [node.props?.children].flat(Infinity).filter((child) => child && typeof child === "object");
          const keys = children.filter((child) => child.key !== undefined && child.key !== null).map((child) => child.key);
          assert.equal(new Set(keys).size, keys.length, `Duplicate sibling key for ${actor} attack ${id}`);
          children.forEach(inspect);
        }
        inspect(tree);
        assert.equal(sprites, count);
        assert.equal(damageLabels, 1);
      }
    }
  }
});