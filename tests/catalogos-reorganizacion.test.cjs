require('./load-typescript.cjs');
const test = require("node:test");
const assert = require("node:assert/strict");

const { CLASES, obtenerAncestrosClase } = require("../src/lib/progresion/clases.ts");

const { CLASES_BASE, CLASES_NUEVAS } = require("../src/lib/catalogos/clases.ts");
const { HABILIDADES, HABILIDADES_BASE } = require("../src/lib/habilidades.ts");
const { HABILIDADES_NUEVAS } = require("../src/lib/progresion/generar-habilidades.ts");
const { HABILIDADES_TRONCALES, HABILIDADES_EVOLUCIONES } = require("../src/lib/catalogos/habilidades.ts");

test("las definiciones de clases solo tienen un propietario y una API publica", () => {
  const originales = Object.keys(CLASES_BASE);
  const nuevas = Object.keys(CLASES_NUEVAS);
  assert.equal(new Set([...originales, ...nuevas]).size, originales.length + nuevas.length);
  assert.deepEqual(Object.keys(CLASES).sort(), [...originales, ...nuevas].sort());
  for (const id of Object.keys(CLASES)) {
    assert.equal(CLASES[id].id, id);
    assert.ok(CLASES[id].requisitos.every(r => CLASES[r.claseId]));
  }
  assert.ok(obtenerAncestrosClase("berserker").includes("espadachin"));
});

test("el catalogo base conserva los datos y el orden de cada profesion", () => {
  const conjuntos = [HABILIDADES_NUEVAS, HABILIDADES_TRONCALES, HABILIDADES_EVOLUCIONES];
  assert.equal(HABILIDADES_BASE.length, conjuntos.reduce((n, c) => n + c.length, 0));
  assert.deepEqual(
    HABILIDADES_BASE.map(h => h.id),
    conjuntos.flatMap(c => c.map(h => h.id))
  );
  assert.equal(new Set(HABILIDADES_BASE.map(h => h.id)).size, HABILIDADES_BASE.length);
});

test("la API de habilidades conserva todas las profesiones y las 367 habilidades v2", () => {
  assert.equal(HABILIDADES.length, 367);
  assert.equal(new Set(HABILIDADES.map(h => h.id)).size, HABILIDADES.length);
  for (const h of HABILIDADES) assert.ok(CLASES[h.claseId], h.id);
  assert.equal(HABILIDADES.filter(h => h.tipo === "activa").length, 245);
  assert.equal(HABILIDADES.filter(h => h.tipo === "pasiva").length, 122);
});

test("catálogos únicos y adaptadores sin definiciones duplicadas", () => {
  const { DEFINICIONES_CLASES, CLASES_BASE: base, CLASES_NUEVAS: avanzadas } = require("../src/lib/catalogos/clases.ts");
  const catalogo = require("../src/lib/catalogos/habilidades.ts");
  assert.equal(base, CLASES_BASE);
  assert.equal(avanzadas, CLASES_NUEVAS);
  assert.equal(Object.keys(DEFINICIONES_CLASES).length, Object.keys(CLASES).length);
  assert.equal(catalogo.HABILIDADES_TRONCALES, HABILIDADES_TRONCALES);
  assert.equal(catalogo.HABILIDADES_EVOLUCIONES, HABILIDADES_EVOLUCIONES);
  assert.equal(require("../src/lib/progresion/habilidades/diseno-habilidades.ts").DISENO_HABILIDADES, catalogo.DISENO_HABILIDADES);
  assert.ok(Object.keys(catalogo.NOMBRES_REDISENIO).length > 0);
  assert.ok(Object.keys(catalogo.CATALOGO_TECNICAS_ADICIONALES).length > 0);
  assert.equal(new Set(Object.keys(DEFINICIONES_CLASES)).size, Object.keys(CLASES).length);
});


test("un único catálogo editable para objetos y criaturas sin romper las APIs", () => {
  const { OBJETOS: DATOS_OBJETOS } = require("../src/lib/catalogos/objetos.ts");
  const { ENEMIGOS_BASE, JEFES_ELITE_BASE, TABLAS_LOOT } = require("../src/lib/catalogos/enemigos.ts");
  const { OBJETOS, obtenerObjetoPorId } = require("../src/lib/objetos.ts");
  const { ENEMIGOS, JEFES_ELITE, obtenerEnemigoPorId } = require("../src/lib/enemigos.ts");
  assert.equal(OBJETOS, DATOS_OBJETOS);
  assert.ok(OBJETOS.length > 0);
  assert.equal(ENEMIGOS.length, ENEMIGOS_BASE.length);
  assert.equal(JEFES_ELITE.length, JEFES_ELITE_BASE.length);
  assert.ok(ENEMIGOS.length > 0);
  assert.ok(JEFES_ELITE.length > 0);
  assert.equal(new Set(OBJETOS.map(x => x.id)).size, OBJETOS.length);
  assert.equal(new Set([...ENEMIGOS, ...JEFES_ELITE].map(x => x.id)).size, ENEMIGOS.length + JEFES_ELITE.length);
  for (const objeto of OBJETOS) assert.equal(obtenerObjetoPorId(objeto.id), objeto);
  for (const enemigo of [...ENEMIGOS, ...JEFES_ELITE]) assert.equal(obtenerEnemigoPorId(enemigo.id), enemigo);
  assert.ok(TABLAS_LOOT.comun.length > 0);
});

test("la fachada histórica conserva las mismas APIs de base, progresión y sprites", () => {
  const configuracion = require("../src/lib/configuracionJuego.ts");
  const tipos = require("../src/lib/tiposJuego.ts");
  const edificios = require("../src/lib/base/edificios.ts");
  const mejoras = require("../src/lib/base/mejoras.ts");
  const escuela = require("../src/lib/base/escuela.ts");
  const experiencia = require("../src/lib/progresion/experiencia.ts");
  const estadisticas = require("../src/lib/progresion/estadisticas.ts");
  const sprites = require("../src/lib/sprites/heroes.ts");

  assert.equal(tipos.CONFIGURACION_EDIFICIOS, edificios.CONFIGURACION_EDIFICIOS);
  assert.equal(configuracion.calcularCosteEdificio, edificios.calcularCosteEdificio);
  assert.equal(configuracion.REQUISITOS_EDIFICIOS, edificios.REQUISITOS_EDIFICIOS);
  assert.equal(configuracion.calcularCosteAtributo, mejoras.calcularCosteAtributo);
  assert.equal(configuracion.CONFIGURACION_ATRIBUTOS, mejoras.CONFIGURACION_ATRIBUTOS);
  assert.equal(configuracion.puedeAprenderHabilidad, escuela.puedeAprenderHabilidad);
  assert.equal(configuracion.experienciaParaNivel, experiencia.experienciaParaNivel);
  assert.equal(configuracion.calcularEstadisticasBase, estadisticas.calcularEstadisticasBase);
  assert.equal(configuracion.obtenerSpriteHeroe, sprites.obtenerSpriteHeroe);
  assert.equal(configuracion.obtenerRutaSpritesheetHeroe, sprites.obtenerRutaSpritesheetHeroe);

  assert.equal(configuracion.calcularCosteEdificio("taberna", 0).oro, 630);
  assert.equal(configuracion.calcularCosteAtributo("velocidad", 0), 100);
  assert.equal(configuracion.experienciaParaNivel(1), 500);
  assert.equal(configuracion.puedeAprenderHabilidad("raro", 2), true);
});
