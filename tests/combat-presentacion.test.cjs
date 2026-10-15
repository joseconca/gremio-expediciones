require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerPresentacionAtaqueBasico } = require("../src/lib/expediciones/presentacion-combate.ts");

test("un arco produce una presentación de proyectil físico", () => {
  assert.deepEqual(obtenerPresentacionAtaqueBasico("arco"), {
    modo: "proyectil",
    proyectil: "flecha",
    elemento: "fisico",
    impacto: "golpe",
  });
});

test("el subtipo de arma se normaliza sin distinguir mayúsculas o espacios", () => {
  assert.equal(obtenerPresentacionAtaqueBasico("  ARCO ")?.proyectil, "flecha");
});

test("armas de melé o tipos ausentes conservan la presentación heredada", () => {
  assert.equal(obtenerPresentacionAtaqueBasico("espada"), undefined);
  assert.equal(obtenerPresentacionAtaqueBasico(undefined), undefined);
  assert.equal(obtenerPresentacionAtaqueBasico(null), undefined);
});
