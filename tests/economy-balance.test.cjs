require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { OBJETOS, obtenerObjetoPorId, calcularCosteRecursosMejora, calcularCosteMejoraObjeto } = require("../src/lib/objetos.ts");
const { COMIDAS_TABERNA } = require("../src/lib/comidasTaberna.ts");
const { MISIONES_POR_DURACION } = require("../src/lib/generadorMisiones.ts");
const { calcularOroBaseComercio, calcularRecompensaComercio } = require("../src/lib/expediciones/comercio.ts");
const { CONFIGURACION_DIFICULTAD } = require("../src/lib/expediciones/dificultad.ts");
const { JEFES_ELITE } = require("../src/lib/enemigos.ts");
const { PRECIOS_RECURSOS, calcularPrecioRecurso } = require("../src/lib/economia.ts");
const { calcularCosteEdificio } = require("../src/lib/configuracionJuego.ts");

test("el catálogo completo contiene precios positivos y progresión coherente entre equipo", () => {
  assert.ok(OBJETOS.every((item) => Number.isFinite(item.precio) && item.precio > 0));
  assert.deepEqual(["espada_madera","espada_hierro","espada_acero","espada_runa"].map((id) => obtenerObjetoPorId(id).precio), [100,800,1800,6500]);
  assert.deepEqual(["tela_andrajosa","armadura_cuero","armadura_hierro","armadura_acero"].map((id) => obtenerObjetoPorId(id).precio), [100,650,2200,5200]);
  const maldito = obtenerObjetoPorId("anillo_maldito");
  assert.equal(maldito.precio, 3200);
  assert.equal(maldito.ataqueBase, 6);
  assert.equal(maldito.hpMaximoBase, -20);
  assert.equal(maldito.defensaBase, -4);
  assert.equal(maldito.velocidadBase, -4);
  assert.equal(maldito.ataquePorMejora, undefined);
  assert.ok(OBJETOS.filter((item) => item.tipo === "accesorio")
    .every((item) => Object.keys(item).every((key) => !key.endsWith("PorMejora"))));
});

test("las mejoras no heredan anomalías del precio de compra", () => {
  const rara = obtenerObjetoPorId("espada_runa");
  assert.equal(calcularCosteMejoraObjeto({ ...rara, precio: 1 }, 0), 166);
  assert.equal(calcularCosteMejoraObjeto({ ...rara, precio: 999999 }, 0), 166);
  assert.ok(calcularCosteMejoraObjeto(rara, 1) > calcularCosteMejoraObjeto(rara, 0));
  assert.equal(calcularCosteMejoraObjeto(obtenerObjetoPorId("armadura_acero"), 0), 138);
  assert.equal(calcularCosteMejoraObjeto({ ...rara, rareza: "epico" }, 0), 231);
  assert.equal(calcularCosteMejoraObjeto({ tipo: "consumible", rareza: "comun" }, 0), 0);
});

test("los materiales tienen precios unificados y el metal sigue siendo estratégico", () => {
  assert.deepEqual(PRECIOS_RECURSOS, { madera: 50, piedra: 100, metal: 250 });
  const comun = obtenerObjetoPorId("espada_hierro");
  const rara = obtenerObjetoPorId("espada_runa");
  const armadura = obtenerObjetoPorId("armadura_acero");
  const costeComun = calcularCosteRecursosMejora(comun, 0);
  const costeRaro = calcularCosteRecursosMejora(rara, 0);
  const costeArmadura = calcularCosteRecursosMejora(armadura, 0);
  assert.equal(costeComun.metal * PRECIOS_RECURSOS.metal, 500);
  assert.ok(costeComun.metal * PRECIOS_RECURSOS.metal <= comun.precio);
  assert.ok(costeRaro.metal * PRECIOS_RECURSOS.metal < rara.precio);
  assert.ok(costeArmadura.piedra * 100 + costeArmadura.metal * 250 < armadura.precio);
});

test("el precio de materiales usa el mismo cálculo y el descuento está limitado al Mercado 3", () => {
  assert.equal(calcularPrecioRecurso("madera", 1), 50);
  assert.equal(calcularPrecioRecurso("madera", 2), 45);
  assert.equal(calcularPrecioRecurso("madera", 3), 40);
  assert.equal(calcularPrecioRecurso("piedra", 3), 80);
  assert.equal(calcularPrecioRecurso("metal", 1), 250);
  assert.equal(calcularPrecioRecurso("metal", 99), 200);
});

test("la comparación de dificultades incluye escenarios explícitos de victoria y derrota", () => {
  const probabilidadesEscenario = { facil: 0.9, normal: 0.75, dificil: 0.55 };
  const tasaEsperada = (mision, dificultad) => {
    const probVictoria = probabilidadesEscenario[dificultad];
    const factorPago = probVictoria + (1 - probVictoria) * 0.2;
    return mision.recompensaBase * 1.1 * factorPago *
      CONFIGURACION_DIFICULTAD[dificultad].multiplicadorRecompensa / mision.horas;
  };
  const corta = MISIONES_POR_DURACION[0];
  assert.ok(Math.abs(tasaEsperada(corta, "facil") - 86.02) < 0.01);
  assert.ok(Math.abs(tasaEsperada(corta, "normal") - 88) < 0.01);
  assert.ok(Math.abs(tasaEsperada(corta, "dificil") - 88) < 0.01);
  // Las probabilidades son supuestos de sensibilidad, no valores medidos del juego.
});

test("las recompensas nominales de misiones permiten comparar el oro bruto por hora", () => {
  const tasas = MISIONES_POR_DURACION.map((m) => m.recompensaBase * 1.1 / m.horas);
  const esperadas = [110, 99, 275 / 3, 770 / 9, 82.5];
  assert.equal(tasas.length, 5);
  tasas.forEach((tasa, i) => assert.ok(Math.abs(tasa - esperadas[i]) < 0.01));
  assert.ok(tasas[0] > tasas[4]);
});

test("la derrota conserva el 20 % del pago de misión y la dificultad multiplica el oro", () => {
  const misionCorta = MISIONES_POR_DURACION[0];
  const tasaEsperada = (mision, probVictoria, modo) =>
    mision.recompensaBase * 1.1 *
    (probVictoria + (1 - probVictoria) * 0.2) *
    CONFIGURACION_DIFICULTAD[modo].multiplicadorRecompensa / mision.horas;

  assert.ok(Math.abs(tasaEsperada(misionCorta, 0.5, "normal") - 66) < 0.001);
  assert.ok(Math.abs(tasaEsperada(misionCorta, 0.75, "normal") - 88) < 0.001);
  assert.ok(Math.abs(tasaEsperada(MISIONES_POR_DURACION[4], 0.9, "normal") - 75.9) < 0.01);
  assert.equal(CONFIGURACION_DIFICULTAD.facil.multiplicadorRecompensa, 0.85);
  assert.equal(CONFIGURACION_DIFICULTAD.dificil.multiplicadorRecompensa, 1.25);
});

test("la recompensa secundaria de botín de jefe tiene en cuenta probabilidad y reventa", () => {
  const jefe = JEFES_ELITE[0];
  assert.equal(jefe.probabilidadBotin, 0.7);
  const pesoTotal = jefe.tablaLoot.reduce((total, entrada) => total + entrada.peso, 0);
  const reventaMedia = jefe.tablaLoot.reduce((total, entrada) => {
    const objeto = obtenerObjetoPorId(entrada.objetoId);
    return total + Math.max(1, Math.floor(objeto.precio * 0.35)) * entrada.peso;
  }, 0) / pesoTotal;
  assert.ok(Math.abs(reventaMedia - 1704.5714285714287) < 0.01);
  assert.ok(Math.abs(reventaMedia * jefe.probabilidadBotin - 1193.2) < 0.01);
});

test("el comercio ajusta el ingreso por hora a ida y vuelta y la probabilidad de éxito", () => {
  const oroExitoso = calcularRecompensaComercio({
    distanciaKm: 100, nivelPersonaje: 15, nivelMercado: 3,
    afinidad: 100, capacidadCarruaje: 20, clase: "Comerciante",
  });
  const horasIdaVuelta = (100 * 2) / 8;
  assert.equal(oroExitoso, 1936);
  assert.equal(horasIdaVuelta, 25);
  assert.ok(Math.abs((oroExitoso * 0.5) / horasIdaVuelta - 38.72) < 0.001);
  assert.ok(Math.abs((oroExitoso * 0.75) / horasIdaVuelta - 58.08) < 0.001);
  assert.ok(Math.abs((oroExitoso * 0.9) / horasIdaVuelta - 69.696) < 0.001);
});

test("el comercio usa recompensas limitadas y trata entradas no finitas de forma segura", () => {
  assert.equal(calcularOroBaseComercio(100), 800);
  assert.equal(calcularRecompensaComercio({
    distanciaKm: 100, nivelPersonaje: 15, nivelMercado: 3, afinidad: 100,
    capacidadCarruaje: 20, clase: "Comerciante",
  }), 1936);
  assert.equal(calcularRecompensaComercio({
    distanciaKm: Infinity, nivelPersonaje: NaN, nivelMercado: 0,
    afinidad: 0, capacidadCarruaje: 0, clase: "Novato",
  }), 0);
});

test("el coste de comida escala con el nivel y la utilidad de sus efectos", () => {
  assert.deepEqual(COMIDAS_TABERNA.map((c) => c.coste), [20,24,24,45,55,50,90,100,110]);
  assert.ok(COMIDAS_TABERNA.filter((c) => c.nivelRequerido === 3).every((c) => c.coste >= 90));
});

test("el oro y los materiales de edificios escalan juntos por el mismo factor", () => {
  const inicial = calcularCosteEdificio("taberna", 0);
  const mejora1 = calcularCosteEdificio("taberna", 1);
  const mejora2 = calcularCosteEdificio("taberna", 2);
  assert.deepEqual(inicial, { oro: 630, madera: 4, piedra: 2, metal: 0 });
  assert.deepEqual(mejora1, { oro: 945, madera: 6, piedra: 3, metal: 0 });
  assert.deepEqual(mejora2, { oro: 1418, madera: 9, piedra: 5, metal: 0 });
  assert.equal(calcularCosteEdificio("herreria", 0).oro, 1170);
});
