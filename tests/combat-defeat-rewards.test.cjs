require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerEnemigoPorId } = require("../src/lib/enemigos.ts");
const { crearEnemigosEnCombate } = require("../src/lib/expediciones/enemigos-combate.ts");
const {
  calcularRecompensasParcialesDerrota,
} = require("../src/lib/expediciones/recompensas-derrota.ts");
const {
  calcularExperienciaBaseGanada,
  calcularOroEnemigo,
} = require("../src/lib/expediciones/dificultad.ts");

function rosterDePrueba() {
  const definiciones = ["slime_acido", "rata_gigante", "goblin_explorador"]
    .map((id) => obtenerEnemigoPorId(id))
    .filter(Boolean);
  assert.equal(definiciones.length, 3);
  return crearEnemigosEnCombate(definiciones, "normal");
}

test("la derrota entrega oro, XP y recursos parciales por cada enemigo abatido", () => {
  const enemigos = rosterDePrueba().map((enemigo, indice) => ({
    ...enemigo,
    hp: indice === 0 ? 0 : enemigo.hp,
  }));
  const recompensaMision = { oro: 101, madera: 9, piedra: 6, metal: 3 };
  const resultado = calcularRecompensasParcialesDerrota({
    enemigos,
    recompensaMision,
    dificultadMision: 3,
    nivelBase: 1,
    modoDificultad: "normal",
  });
  const abatido = obtenerEnemigoPorId(enemigos[0].enemigoId);

  assert.ok(abatido);
  assert.equal(resultado.enemigosDerrotados.length, 1);
  assert.equal(resultado.oroPorEnemigos, calcularOroEnemigo(abatido.botin, enemigos[0].difMin));
  assert.equal(
    resultado.experienciaPorEnemigos,
    calcularExperienciaBaseGanada(enemigos[0].difMin, 1, "normal"),
  );
  assert.equal(resultado.oroConsolacion, 20);
  assert.equal(resultado.experienciaConsolacion, Math.floor(
    calcularExperienciaBaseGanada(3, 1, "normal") * 0.1,
  ));
  assert.deepEqual(
    {
      madera: resultado.recompensa.madera,
      piedra: resultado.recompensa.piedra,
      metal: resultado.recompensa.metal,
    },
    { madera: 3, piedra: 2, metal: 1 },
  );
  assert.equal(resultado.oro, resultado.oroConsolacion + resultado.oroPorEnemigos);
  assert.equal(resultado.experiencia, resultado.experienciaConsolacion + resultado.experienciaPorEnemigos);
});

test("una derrota sin enemigos abatidos solo conserva la recompensa de consolación", () => {
  const enemigos = rosterDePrueba();
  const resultado = calcularRecompensasParcialesDerrota({
    enemigos,
    recompensaMision: { oro: 100, madera: 9, piedra: 6, metal: 3 },
    dificultadMision: 2,
    nivelBase: 1,
    modoDificultad: "normal",
  });

  assert.equal(resultado.enemigosDerrotados.length, 0);
  assert.equal(resultado.oroPorEnemigos, 0);
  assert.equal(resultado.experienciaPorEnemigos, 0);
  assert.equal(resultado.oro, 20);
  assert.equal(resultado.experiencia, Math.floor(
    calcularExperienciaBaseGanada(2, 1, "normal") * 0.1,
  ));
  assert.deepEqual(
    {
      madera: resultado.recompensa.madera,
      piedra: resultado.recompensa.piedra,
      metal: resultado.recompensa.metal,
    },
    { madera: 0, piedra: 0, metal: 0 },
  );
});

test("si todos los enemigos están derrotados, la proporción de recursos nunca supera el 100 %", () => {
  const enemigos = rosterDePrueba().map((enemigo) => ({ ...enemigo, hp: 0 }));
  const resultado = calcularRecompensasParcialesDerrota({
    enemigos,
    recompensaMision: { oro: 100, madera: 9, piedra: 6, metal: 3 },
    dificultadMision: 3,
    nivelBase: 1,
    modoDificultad: "normal",
  });

  assert.equal(resultado.enemigosDerrotados.length, 3);
  assert.deepEqual(
    {
      madera: resultado.recompensa.madera,
      piedra: resultado.recompensa.piedra,
      metal: resultado.recompensa.metal,
    },
    { madera: 9, piedra: 6, metal: 3 },
  );
});
