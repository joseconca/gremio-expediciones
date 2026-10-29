require("./load-typescript.cjs");

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  COMIDAS_TABERNA,
  aplicarEfectoComida,
  obtenerComidaTaberna,
} = require("../src/lib/comidasTaberna.ts");

const atributosBase = {
  ataque: 100,
  ataqueMagico: 80,
  defensa: 50,
  velocidad: 30,
  probCritico: 0.2,
};

test("la taberna ofrece recetas en tres niveles con costes positivos", () => {
  assert.equal(COMIDAS_TABERNA.length, 9);
  assert.ok(COMIDAS_TABERNA.every((comida) => comida.coste > 0));
  assert.equal(obtenerComidaTaberna("carne-cazadora").coste, 20);
  assert.deepEqual(
    COMIDAS_TABERNA.reduce((niveles, comida) => {
      niveles[comida.nivelRequerido] += 1;
      return niveles;
    }, { 1: 0, 2: 0, 3: 0 }),
    { 1: 3, 2: 3, 3: 3 },
  );
  assert.equal(obtenerComidaTaberna("comida-inexistente"), null);
});

test("las recetas básicas modifican solo la estadística indicada", () => {
  const carne = aplicarEfectoComida(atributosBase, "carne-cazadora");
  assert.equal(carne.ataque, 113);
  assert.equal(carne.ataqueMagico, 80);
  assert.equal(carne.defensa, 50);

  assert.equal(aplicarEfectoComida(atributosBase, "caldo-guardian").defensa, 58);
  assert.equal(aplicarEfectoComida(atributosBase, "setas-arcanas").ataqueMagico, 91);
});

test("las recetas de nivel 2 combinan efectos", () => {
  const guiso = aplicarEfectoComida(atributosBase, "raices-vigorizantes");
  assert.equal(guiso.velocidad, 33);
  assert.equal(guiso.defensa, 58);

  const brocheta = aplicarEfectoComida(atributosBase, "brocheta-especiada");
  assert.equal(brocheta.ataque, 113);
  assert.ok(Math.abs(brocheta.probCritico - 0.3) < 1e-10);

  const desayuno = aplicarEfectoComida(atributosBase, "desayuno-explorador");
  assert.equal(desayuno.velocidad, 33);
});

test("las recetas de nivel 3 tienen bonificaciones combinadas y potentes", () => {
  const campeon = aplicarEfectoComida(atributosBase, "banquete-campeon");
  assert.equal(campeon.ataque, 118);
  assert.equal(campeon.defensa, 61);
  assert.ok(Math.abs(campeon.probCritico - 0.3) < 1e-10);

  const arcano = aplicarEfectoComida(atributosBase, "festin-arcano");
  assert.equal(arcano.ataqueMagico, 99);
  assert.equal(arcano.velocidad, 33);
  assert.equal(arcano.defensa, 58);

  const asedio = aplicarEfectoComida(atributosBase, "racion-de-asedio");
  assert.equal(asedio.ataque, 123);
  assert.equal(asedio.defensa, 61);
});

test("una receta desconocida deja los atributos intactos", () => {
  assert.deepEqual(aplicarEfectoComida(atributosBase, "desconocida"), atributosBase);
});
