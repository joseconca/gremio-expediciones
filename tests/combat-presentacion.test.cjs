require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerPresentacionAtaqueBasico } = require("../src/lib/expediciones/presentacion-combate.ts");
const { obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");
const { resolverHabilidadJugador } = require("../src/lib/expediciones/combate.ts");

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

test("Bola de fuego declara área adyacente además de su presentación de explosión", () => {
  const bola = obtenerHabilidadPorId("bola_fuego");
  assert.equal(bola?.presentacionVisual?.modo, "proyectil");
  assert.equal(bola?.presentacionVisual?.impacto, "explosion");
  assert.deepEqual(bola?.objetivo, { equipo: "enemigo", patron: "adyacentes" });
});

test("las habilidades de proyectil declaran una presentación explícita por elemento", () => {
  assert.equal(obtenerHabilidadPorId("chispa_mago")?.presentacionVisual?.proyectil, "esfera_arcana");
  assert.equal(obtenerHabilidadPorId("chispa_mago")?.presentacionVisual?.elemento, "arcano");
  assert.equal(obtenerHabilidadPorId("bola_fuego")?.presentacionVisual?.proyectil, "bola_fuego");
  assert.equal(obtenerHabilidadPorId("bola_fuego")?.presentacionVisual?.elemento, "fuego");
  assert.equal(obtenerHabilidadPorId("descarga_elemental")?.presentacionVisual?.proyectil, "rayo");
  assert.equal(obtenerHabilidadPorId("drenaje_vital")?.presentacionVisual?.proyectil, "orbe_sombra");
});

const contextoPrueba = {
  jugadorAtaque: 20,
  jugadorAtaqueMagico: 30,
  jugadorDefensa: 10,
  jugadorDefensaMagica: 10,
  enemigoDefensa: 5,
  enemigoDefensaMagica: 5,
  jugadorNivel: 5,
  jugadorHp: 20,
  jugadorHpMaximo: 100,
  jugadorProbCritico: 0.1,
  jugadorDanoCritico: 1.5,
  enemigoNombre: "Enemigo de prueba",
  jugadorPrecision: 75,
  enemigoEvasion: 0,
};

test("el resultado de habilidad conserva el metadato de proyectil en acierto y fallo", () => {
  const habilidad = obtenerHabilidadPorId("bola_fuego");
  assert.ok(habilidad);

  const randomOriginal = Math.random;
  try {
    const valoresAcierto = [0.5, 0.1, 0.5, 0.99];
    Math.random = () => valoresAcierto.shift() ?? 0.99;
    const acierto = resolverHabilidadJugador(habilidad, contextoPrueba);
    assert.deepEqual(acierto.accion.presentacion, habilidad.presentacionVisual);
    assert.equal(acierto.accion.tipo, "habilidad");

    const valoresFallo = [0];
    Math.random = () => valoresFallo.shift() ?? 0;
    const fallo = resolverHabilidadJugador(habilidad, contextoPrueba);
    assert.deepEqual(fallo.accion.presentacion, habilidad.presentacionVisual);
    assert.equal(fallo.accion.tipo, "fallo");
  } finally {
    Math.random = randomOriginal;
  }
});
