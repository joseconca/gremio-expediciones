require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { OBJETOS, obtenerObjetoPorId, obtenerRanuraObjeto, calcularEstadisticasObjeto } = require("../src/lib/objetos.ts");
const { generarSufijoObjeto, obtenerNombreObjetoConSufijo } = require("../src/lib/sufijosObjetos.ts");
const { tirarBotinEnemigo } = require("../src/lib/lootObjetos.ts");
const { ENEMIGOS, JEFES_ELITE } = require("../src/lib/enemigos.ts");
const { LIMITE_INVENTARIO_OBJETOS } = require("../src/lib/inventario.ts");

test("los objetos básicos y comunes no generan sufijo", () => {
  assert.deepEqual(generarSufijoObjeto({ rareza: "basico" }, false, () => 0), {
    sufijoId: null,
    bonificaciones: {},
  });
  assert.deepEqual(generarSufijoObjeto({ rareza: "comun" }, true, () => 0), {
    sufijoId: null,
    bonificaciones: {},
  });
});

test("los objetos poco comunes, raros y épicos generan sufijos del tier correcto", () => {
  const pocoComun = generarSufijoObjeto({ rareza: "poco_comun" }, false, () => 0);
  assert.equal(pocoComun.sufijoId, "veloz");
  assert.deepEqual(pocoComun.bonificaciones, { velocidad: 1 });

  const raro = generarSufijoObjeto({ rareza: "raro" }, false, () => 0);
  assert.equal(raro.sufijoId, "del_guardian");
  assert.deepEqual(raro.bonificaciones, { defensa: 2, defensaMagica: 1 });

  const epico = generarSufijoObjeto({ rareza: "epico" }, false, () => 0);
  assert.equal(epico.sufijoId, "del_titan");
  assert.deepEqual(epico.bonificaciones, { hpMaximo: 18, defensa: 2 });
});

test("solo los jefes pueden generar sufijos legendarios", () => {
  const normal = generarSufijoObjeto({ rareza: "legendario" }, false, () => 0);
  assert.equal(normal.sufijoId, "del_titan");

  const jefe = generarSufijoObjeto({ rareza: "raro" }, true, () => 0);
  assert.equal(jefe.sufijoId, "del_dragon");
  assert.deepEqual(jefe.bonificaciones, { ataque: 4, probCritico: 0.04 });
  assert.equal(obtenerNombreObjetoConSufijo("Espada de madera", jefe.sufijoId), "Espada de madera del dragón");
});

test("el botín utiliza la tabla de pesos y conserva sufijo y estadísticas propios", () => {
  const botin = tirarBotinEnemigo({
    id: "boss-test",
    nombre: "Jefe de prueba",
    hp: 100,
    ataque: 10,
    defensa: 5,
    velocidad: 5,
    botin: 20,
    difMin: 1,
    esJefe: true,
    probabilidadBotin: 1,
    tablaLoot: [{ objetoId: "espada_runa", peso: 1 }],
  }, () => 0);

  assert.ok(botin);
  assert.equal(botin.objeto.id, "espada_runa");
  assert.equal(botin.sufijoId, "del_dragon");
  assert.equal(botin.bonificaciones.ataque, 4);
  assert.equal(calcularEstadisticasObjeto(botin.objeto, 0, botin.bonificaciones).ataque, 14);
});

test("todas las tablas loot apuntan a objetos existentes y los jefes tienen mejor probabilidad", () => {
  const enemigos = [...ENEMIGOS, ...JEFES_ELITE];
  for (const enemigo of enemigos) {
    assert.ok(enemigo.probabilidadBotin !== undefined);
    assert.ok(enemigo.tablaLoot && enemigo.tablaLoot.length > 0);
    for (const entrada of enemigo.tablaLoot) {
      assert.ok(obtenerObjetoPorId(entrada.objetoId), `Objeto inexistente en ${enemigo.id}: ${entrada.objetoId}`);
      assert.ok(entrada.peso > 0);
    }
  }
  for (const jefe of JEFES_ELITE) {
    assert.equal(jefe.esJefe, true);
    assert.ok(jefe.probabilidadBotin >= 0.7);
  }
  assert.ok(ENEMIGOS.every((enemigo) => enemigo.esJefe === false));
});

test("el catálogo cubre las diez ranuras y el inventario limita a 30 instancias", () => {
  const ranuras = new Set(OBJETOS.map(obtenerRanuraObjeto).filter(Boolean));
  for (const ranura of [
    "arma",
    "mano_secundaria",
    "casco",
    "armadura",
    "pantalones",
    "botas",
    "guantes",
    "collar",
    "anillo",
  ]) {
    assert.ok(ranuras.has(ranura), `Falta cubrir la ranura ${ranura}`);
  }
  assert.equal(LIMITE_INVENTARIO_OBJETOS, 30);
});
