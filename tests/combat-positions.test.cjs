const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "../src/lib/expediciones/posicion-combate.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = new Module(sourcePath, module);
loaded.filename = sourcePath;
loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
loaded._compile(compiled.outputText, sourcePath);
const { aplicarModificadoresPosicion, normalizarPosicionCombate } = loaded.exports;

test("Melé aumenta ambas defensas un 15 % y reduce ambos ataques un 15 %", () => {
  assert.deepEqual(aplicarModificadoresPosicion({
    ataque: 100, ataqueMagico: 80, defensa: 100, defensaMagica: 60,
  }, "mele"), {
    ataque: 85, ataqueMagico: 68, defensa: 115, defensaMagica: 69,
  });
});

test("Centro conserva todas las estadísticas y no muta la entrada", () => {
  const stats = { ataque: 101, ataqueMagico: 93, defensa: 42, defensaMagica: 37 };
  assert.deepEqual(aplicarModificadoresPosicion(stats, "centro"), stats);
  assert.deepEqual(stats, { ataque: 101, ataqueMagico: 93, defensa: 42, defensaMagica: 37 });
});

test("Retaguardia aumenta ambos ataques un 15 % y reduce ambas defensas un 15 %", () => {
  assert.deepEqual(aplicarModificadoresPosicion({
    ataque: 100, ataqueMagico: 80, defensa: 100, defensaMagica: 60,
  }, "retaguardia"), {
    ataque: 115, ataqueMagico: 92, defensa: 85, defensaMagica: 51,
  });
});

test("valores desconocidos pasan a Centro y el ataque no cae por debajo de uno", () => {
  assert.equal(normalizarPosicionCombate("desconocida"), "centro");
  assert.equal(normalizarPosicionCombate(null), "centro");
  assert.deepEqual(aplicarModificadoresPosicion({
    ataque: 1, ataqueMagico: 1, defensa: 0, defensaMagica: 0,
  }, "mele"), { ataque: 1, ataqueMagico: 1, defensa: 0, defensaMagica: 0 });
});

test("schema y migración persisten la preferencia y la instantánea táctica con Centro por defecto", () => {
  const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
  const migrationPath = path.resolve(
    __dirname,
    "../prisma/migrations/20261013190000_posiciones_tacticas_combate/migration.sql",
  );
  const schema = fs.readFileSync(schemaPath, "utf8");
  const migration = fs.readFileSync(migrationPath, "utf8");

  assert.match(schema, /posicionCombate\\s+String\\s+@default\\("centro"\\)/);
  assert.match(schema, /jugadorPosicion\\s+String\\s+@default\\("centro"\\)/);
  assert.match(schema, /enemigoPosicion\\s+String\\s+@default\\("centro"\\)/);
  assert.match(migration, /ADD COLUMN "posicionCombate" TEXT NOT NULL DEFAULT 'centro'/);
  assert.match(migration, /ADD COLUMN "jugadorPosicion" TEXT NOT NULL DEFAULT 'centro'/);
  assert.match(migration, /ADD COLUMN "enemigoPosicion" TEXT NOT NULL DEFAULT 'centro'/);
});
