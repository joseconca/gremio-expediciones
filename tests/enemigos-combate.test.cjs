require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  crearEnemigosEnCombate,
  leerEnemigosEnCombate,
  obtenerEnemigoVivoPorId,
  crearEnemigoLegacy,
} = require("../src/lib/expediciones/enemigos-combate.ts");

function enemigo(id, difMin, overrides = {}) {
  return {
    id,
    nombre: id,
    difMin,
    hp: 50,
    ataque: 10,
    ataqueMagico: 12,
    defensa: 5,
    defensaMagica: 6,
    velocidad: 8,
    botin: 10,
    rareza: "comun",
    ...overrides,
  };
}

test("un enemigo empieza centrado; dos y tres se distribuyen por melé, centro y retaguardia", () => {
  const uno = crearEnemigosEnCombate([enemigo("slime", 0)], "normal");
  assert.equal(uno.length, 1);
  assert.deepEqual([uno[0].posicion, uno[0].columna, uno[0].casilla], ["centro", 1, 4]);

  const dos = crearEnemigosEnCombate([enemigo("slime", 2), enemigo("rata", 1)], "normal");
  assert.deepEqual(dos.map((e) => e.casilla), [1, 4]);
  assert.deepEqual(dos.map((e) => e.posicion), ["mele", "centro"]);

  const tres = crearEnemigosEnCombate([
    enemigo("slime", 2), enemigo("rata", 1), enemigo("goblin", 0),
  ], "normal");
  assert.deepEqual(tres.map((e) => e.casilla), [1, 4, 7]);
  assert.deepEqual(tres.map((e) => e.posicion), ["mele", "centro", "retaguardia"]);
});

test("cada enemigo conserva sus atributos y se escala según su propia amenaza", () => {
  const roster = crearEnemigosEnCombate([
    enemigo("alto", 6),
    enemigo("bajo", 2),
  ], "normal");
  assert.ok(roster[0].hpMaximo > roster[1].hpMaximo);
  assert.ok(roster[0].ataque > roster[1].ataque);
  assert.equal(roster[0].enemigoId, "alto");
  assert.equal(roster[1].enemigoId, "bajo");
  assert.notEqual(roster[0].id, roster[1].id);
  assert.deepEqual(roster.map((e) => e.efectos), [[], []]);
});

test("la persistencia JSON se valida y selecciona solo enemigos vivos", () => {
  const roster = crearEnemigosEnCombate([
    enemigo("uno", 2),
    enemigo("dos", 1),
  ], "normal");
  const decodificado = leerEnemigosEnCombate(JSON.parse(JSON.stringify(roster)));
  assert.equal(decodificado.length, 2);
  assert.equal(obtenerEnemigoVivoPorId(decodificado, "enemigo-2").enemigoId, "dos");
  assert.equal(obtenerEnemigoVivoPorId(decodificado, "no-existe"), null);
  const conDerrotado = decodificado.map((e) => e.id === "enemigo-1" ? { ...e, hp: 0 } : e);
  assert.equal(obtenerEnemigoVivoPorId(conDerrotado).id, "enemigo-2");
  assert.equal(leerEnemigosEnCombate({ enemigoId: "invalid" }).length, 0);
});

test("los combates anteriores se adaptan al formato nuevo con un enemigo", () => {
  const legacy = crearEnemigoLegacy({
    enemigoId: "slime",
    enemigoNombre: "Slime",
    enemigoHp: 12,
    enemigoHpMaximo: 50,
    enemigoAtaque: 8,
    enemigoDefensa: 3,
    enemigoVelocidad: 5,
    enemigoProbCritico: 0.1,
    enemigoDanoCritico: 1.5,
    enemigoNivel: 2,
    efectos: [],
  });
  assert.ok(legacy);
  assert.equal(legacy.id, "enemigo-1");
  assert.equal(legacy.hp, 12);
  assert.equal(legacy.nombre, "Slime");
  assert.equal(crearEnemigoLegacy({ enemigoId: "slime" }), null);
});

test("la formación rechaza grupos vacíos y grupos mayores que nueve", () => {
  assert.throws(() => crearEnemigosEnCombate([], "normal"), RangeError);
  assert.throws(() => crearEnemigosEnCombate(
    Array.from({ length: 10 }, (_, i) => enemigo("enemy-" + i, 1)),
    "normal",
  ), RangeError);
});
