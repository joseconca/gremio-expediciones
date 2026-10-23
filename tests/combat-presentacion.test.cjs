require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerPresentacionAtaqueBasico } = require("../src/lib/expediciones/presentacion-combate.ts");
const { obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");
const { resolverHabilidadJugador, resolverAtaqueJugador } = require("../src/lib/expediciones/combate.ts");

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

test("bastón y libro lanzan una esfera arcana en el ataque básico", () => {
  const esperada = {
    modo: "proyectil",
    proyectil: "esfera_arcana",
    elemento: "arcano",
    impacto: "destello",
  };
  assert.deepEqual(obtenerPresentacionAtaqueBasico("baston"), esperada);
  assert.deepEqual(obtenerPresentacionAtaqueBasico("Bastón"), esperada);
  assert.deepEqual(obtenerPresentacionAtaqueBasico("libro"), esperada);
});

test("el básico con bastón/libro compara ataque físico y mágico y mitiga con la defensa correspondiente", () => {
  const randomOriginal = Math.random;
  try {
    for (const [usarMejorAtaqueMagico, danoEsperado] of [[true, 21], [false, 5]]) {
      const valores = [0.5, 0, 0.5, 0.99];
      Math.random = () => valores.shift() ?? 0.99;
      const accion = resolverAtaqueJugador({
        jugadorAtaque: 10,
        jugadorAtaqueMagico: 20,
        usarMejorAtaqueMagico,
        jugadorNivel: 1,
        jugadorProbCritico: 0,
        jugadorDanoCritico: 1.5,
        enemigoDefensa: 100,
        enemigoDefensaMagica: 0,
        enemigoNombre: "Objetivo",
      });
      assert.equal(accion.dano, danoEsperado);
    }
  } finally {
    Math.random = randomOriginal;
  }
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

test("un ataque físico de alcance sin presentación explícita también lanza flecha", () => {
  const habilidad = obtenerHabilidadPorId("tiro_evasivo");
  assert.ok(habilidad);
  assert.equal(habilidad.presentacionVisual, undefined);
  const randomOriginal = Math.random;
  try {
    const valores = [0.5, 0, 0.5, 0.99];
    Math.random = () => valores.shift() ?? 0.99;
    const resultado = resolverHabilidadJugador(habilidad, contextoPrueba);
    assert.deepEqual(resultado.accion.presentacion, {
      modo: "proyectil",
      proyectil: "flecha",
      elemento: "fisico",
      impacto: "golpe",
    });
  } finally {
    Math.random = randomOriginal;
  }
});

test("una habilidad mágica sin presentación explícita recibe un proyectil de forma predeterminada", () => {
  const habilidad = obtenerHabilidadPorId("lanza_arcana");
  assert.ok(habilidad);
  assert.equal(habilidad.presentacionVisual, undefined);

  const randomOriginal = Math.random;
  try {
    const valores = [0.5, 0, 0.5, 0.99];
    Math.random = () => valores.shift() ?? 0.99;
    const resultado = resolverHabilidadJugador(habilidad, contextoPrueba);
    assert.deepEqual(resultado.accion.presentacion, {
      modo: "proyectil",
      proyectil: "esfera_arcana",
      elemento: "arcano",
      impacto: "destello",
    });
  } finally {
    Math.random = randomOriginal;
  }
});

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
