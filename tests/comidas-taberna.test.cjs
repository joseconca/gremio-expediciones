require("./load-typescript.cjs");

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  COMIDAS_TABERNA,
  aplicarEfectoComida,
  comidaOtorgaIniciativa,
  obtenerComidaTaberna,
} = require("../src/lib/comidasTaberna.ts");

const atributosBase = {
  ataque: 100,
  ataqueMagico: 80,
  defensa: 50,
  velocidad: 30,
  probCritico: 0.2,
};

test("la taberna ofrece comidas con costes y efectos definidos", () => {
  assert.equal(COMIDAS_TABERNA.length, 6);
  assert.ok(COMIDAS_TABERNA.every((comida) => comida.coste > 0));
  assert.equal(obtenerComidaTaberna("carne-cazadora").coste, 8);
  assert.equal(obtenerComidaTaberna("comida-inexistente"), null);
});

test("la carne aumenta solo el ataque físico en un 10 %", () => {
  const resultado = aplicarEfectoComida(atributosBase, "carne-cazadora");
  assert.equal(resultado.ataque, 110);
  assert.equal(resultado.ataqueMagico, 80);
  assert.equal(resultado.defensa, 50);
});

test("cada receta aplica su bonificación al atributo correcto", () => {
  assert.equal(aplicarEfectoComida(atributosBase, "caldo-guardian").defensa, 55);
  assert.equal(aplicarEfectoComida(atributosBase, "setas-arcanas").ataqueMagico, 88);
  assert.equal(aplicarEfectoComida(atributosBase, "raices-vigorizantes").velocidad, 33);
  assert.equal(aplicarEfectoComida(atributosBase, "brocheta-especiada").probCritico, 0.3);
});

test("el desayuno del explorador concede iniciativa garantizada", () => {
  assert.equal(comidaOtorgaIniciativa("desayuno-explorador"), true);
  assert.equal(comidaOtorgaIniciativa("carne-cazadora"), false);
});

test("una receta desconocida deja los atributos intactos", () => {
  assert.deepEqual(aplicarEfectoComida(atributosBase, "desconocida"), atributosBase);
});
