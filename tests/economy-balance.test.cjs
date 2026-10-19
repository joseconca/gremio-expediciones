require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { OBJETOS, obtenerObjetoPorId, calcularCosteRecursosMejora, calcularCosteMejoraObjeto } = require("../src/lib/objetos.ts");
const { obtenerObjetosVisiblesEnArmeria, puedeComprarObjeto } = require("../src/lib/tiendaObjetos.ts");
const { COMIDAS_TABERNA } = require("../src/lib/comidasTaberna.ts");
const { MISIONES_POR_DURACION } = require("../src/lib/generadorMisiones.ts");
const { calcularOroBaseComercio, calcularRecompensaComercio } = require("../src/lib/expediciones/comercio.ts");
const { CONFIGURACION_DIFICULTAD, calcularOroEnemigo } = require("../src/lib/expediciones/dificultad.ts");
const { JEFES_ELITE, obtenerEnemigoPorId } = require("../src/lib/enemigos.ts");
const {
  PRECIOS_RECURSOS,
  calcularPrecioRecurso,
  calcularPrecioVentaRecurso,
  calcularPrecioVentaObjeto,
  calcularPrecioRecompraObjeto,
} = require("../src/lib/economia.ts");
const { calcularCosteEdificio } = require("../src/lib/configuracionJuego.ts");

test("el catálogo completo contiene precios positivos y progresión coherente entre equipo", () => {
  assert.ok(OBJETOS.every((item) => Number.isFinite(item.precio) && item.precio > 0));
  assert.deepEqual(
    Object.fromEntries(OBJETOS.map((item) => [item.id, item.precio])),
    {
      pocion: 20, pocion_grande: 55,
      pocion_vida_menor: 150, pocion_vida_mediana: 380, pocion_mana_basica: 320,
      pocion_energia: 300, ceniza_fenix: 1800, pocion_vida_mayor: 750,
      elixir_guerrero: 780, elixir_mago: 780, elixir_heroe: 1300, elixir_velocidad: 850,
      espada_madera: 100, espada_piedra: 350, espada_hierro: 800, espada_acero: 1800,
      espada_runa: 6500, hacha_orca: 4200,
      hacha_piedra: 300, lanza_madera: 650, daga_hierro: 300, arco_madera: 450,
      baston_madera: 350, maza_madera: 650, libro_aprendiz: 400, guantes_lucha: 250,
      tela_andrajosa: 100, armadura_cuero: 650, cota_malla: 1400, armadura_hierro: 2200, armadura_acero: 5200,
      anillo_viajero: 1100, amuleto_vitalidad: 2800, anillo_maldito: 3200,
      escudo_madera: 150, casco_cuero: 300, pantalones_cuero: 320,
      botas_cuero: 280, guantes_cuero: 220, collar_cobre: 350, anillo_resistencia: 500,
      espada_vigia: 3600, espada_draconica: 12500, lanza_escama: 1850, daga_sombria: 1750,
      arco_cazador: 3200, baston_runico: 3900, maza_enana: 2850, hacha_berserker: 6800,
      grimorio_eclipse: 7200, punos_lobo: 2450, escudo_guardian: 1750, yelmo_veterano: 1250,
      coraza_runica: 7900, perneras_orcas: 1450, botas_viento: 2100, guantes_guardia: 1650,
      collar_fenix: 2600, anillo_duelista: 2800, anillo_arcanista: 3900,
      amuleto_ancestral: 5100, pocion_suprema: 140,
    },
  );
  assert.deepEqual(["espada_madera","espada_piedra","espada_hierro","espada_acero","espada_runa"].map((id) => obtenerObjetoPorId(id).precio), [100,350,800,1800,6500]);
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

test("la Armería solo vende equipo básico y reserva objetos especiales para botín o fabricación", () => {
  assert.ok(OBJETOS.every((item) => typeof item.vendibleEnArmeria === "boolean"));

  const vendiblesEsperados = [
    "espada_madera", "espada_piedra", "espada_hierro", "espada_acero",
    "hacha_piedra", "lanza_madera", "daga_hierro", "arco_madera", "baston_madera",
    "maza_madera", "libro_aprendiz", "guantes_lucha",
    "tela_andrajosa", "armadura_cuero", "cota_malla", "armadura_hierro", "armadura_acero",
    "escudo_madera", "casco_cuero", "pantalones_cuero", "botas_cuero", "guantes_cuero",
  ];
  assert.deepEqual(obtenerObjetosVisiblesEnArmeria(1).map((item) => item.id), vendiblesEsperados);
  assert.deepEqual(OBJETOS.filter((item) => item.vendibleEnArmeria).map((item) => item.id), vendiblesEsperados);
  assert.deepEqual(
    ["espada_runa", "hacha_orca", "anillo_viajero", "amuleto_vitalidad", "anillo_maldito", "collar_cobre", "anillo_resistencia"]
      .map((id) => obtenerObjetoPorId(id).vendibleEnArmeria),
    Array(7).fill(false),
  );
  assert.equal(puedeComprarObjeto(obtenerObjetoPorId("espada_madera"), 1, 1), true);
  assert.equal(puedeComprarObjeto(obtenerObjetoPorId("espada_piedra"), 1, 5), true);
  assert.equal(puedeComprarObjeto(obtenerObjetoPorId("espada_runa"), 3, 30), false);
  assert.deepEqual(obtenerObjetosVisiblesEnArmeria(0), []);
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

test("venta y recompra calculan porcentajes exactos sin errores de coma flotante", () => {
  assert.equal(calcularPrecioVentaObjeto(6500, 1), 2275);
  assert.equal(calcularPrecioVentaObjeto(5200, 1), 1820);
  assert.equal(calcularPrecioVentaObjeto(2800, 1), 980);
  assert.equal(calcularPrecioVentaObjeto(6500, 2), 4550);
  assert.equal(calcularPrecioRecompraObjeto(6500, 1, 2275), 4550);
  assert.equal(calcularPrecioRecompraObjeto(5200, 1, 1820), 3640);
  assert.equal(calcularPrecioRecompraObjeto(2800, 1, 980), 1960);
});

test("el precio de materiales usa el mismo cálculo y el descuento está limitado al Mercado 3", () => {
  assert.equal(calcularPrecioRecurso("madera", 1), 50);
  assert.equal(calcularPrecioRecurso("madera", 2), 45);
  assert.equal(calcularPrecioRecurso("madera", 3), 40);
  assert.equal(calcularPrecioRecurso("piedra", 3), 80);
  assert.equal(calcularPrecioRecurso("metal", 1), 250);
  assert.equal(calcularPrecioRecurso("metal", 99), 200);
});

test("la venta de recursos paga el 25 % del precio base, independientemente del descuento del Mercado", () => {
  assert.equal(calcularPrecioVentaRecurso("madera", 1), 12);
  assert.equal(calcularPrecioVentaRecurso("madera", 2), 25);
  assert.equal(calcularPrecioVentaRecurso("piedra", 1), 25);
  assert.equal(calcularPrecioVentaRecurso("metal", 1), 62);
  assert.equal(calcularPrecioVentaRecurso("metal", 4), 250);
  assert.equal(calcularPrecioVentaRecurso("metal", 0), 0);
  assert.notEqual(calcularPrecioRecurso("madera", 1), calcularPrecioRecurso("madera", 3));
  assert.equal(calcularPrecioVentaRecurso("madera", 1), 12);
});

test("la comparación de dificultades incluye escenarios explícitos de victoria y derrota", () => {
  const probabilidadesEscenario = { facil: 0.9, normal: 0.75, dificil: 0.55 };
  const recompensaMedia = (mision) =>
    mision.recompensaBase + (Math.floor(mision.recompensaBase * 0.2) - 1) / 2;
  const tasaEsperada = (mision, dificultad) => {
    const probVictoria = probabilidadesEscenario[dificultad];
    const factorPago = probVictoria + (1 - probVictoria) * 0.2;
    return recompensaMedia(mision) * factorPago *
      CONFIGURACION_DIFICULTAD[dificultad].multiplicadorRecompensa / mision.horas;
  };
  const corta = MISIONES_POR_DURACION[0];
  assert.ok(Math.abs(tasaEsperada(corta, "facil") - 85.238) < 0.01);
  assert.ok(Math.abs(tasaEsperada(corta, "normal") - 87.2) < 0.01);
  assert.ok(Math.abs(tasaEsperada(corta, "dificil") - 87.2) < 0.01);
  // Las probabilidades son supuestos de sensibilidad, no valores medidos del juego.
});

test("las recompensas nominales de misiones permiten comparar el oro bruto por hora", () => {
  // El generador usa floor(base + rng * base * 0,2): el bonus tiene media
  // (floor(base * 0,2) - 1) / 2 si rng se distribuye uniformemente.
  const recompensaMedia = (m) =>
    m.recompensaBase + (Math.floor(m.recompensaBase * 0.2) - 1) / 2;
  const tasas = MISIONES_POR_DURACION.map((m) => recompensaMedia(m) / m.horas);
  const esperadas = [109, 98.5, 91.5, 85.5, 1979.5 / 24];
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

test("una misión breve cuenta el oro del enemigo, el pago por derrota y el valor esperado del botín", () => {
  const mision = MISIONES_POR_DURACION[0];
  const enemigo = obtenerEnemigoPorId("rata_gigante");
  assert.ok(enemigo);
  const oroEnemigo = calcularOroEnemigo(enemigo.botin, 1);
  assert.equal(oroEnemigo, 18);
  assert.equal(enemigo.probabilidadBotin, 0.08);
  const pesoTotal = enemigo.tablaLoot.reduce((total, entrada) => total + entrada.peso, 0);
  const reventaMedia = enemigo.tablaLoot.reduce((total, entrada) => {
    const objeto = obtenerObjetoPorId(entrada.objetoId);
    return total + calcularPrecioVentaObjeto(objeto.precio, 1) * entrada.peso;
  }, 0) / pesoTotal;

  const oroEsperadoPorHora = (probVictoria, dificultad) => {
    const oroMedioMision = mision.recompensaBase +
      (Math.floor(mision.recompensaBase * 0.2) - 1) / 2;
    const pagoEsperado = (
      probVictoria * (oroMedioMision + oroEnemigo) +
      (1 - probVictoria) * oroMedioMision * 0.2
    ) * CONFIGURACION_DIFICULTAD[dificultad].multiplicadorRecompensa;
    const reventaBotinEsperada = probVictoria * enemigo.probabilidadBotin * reventaMedia;
    return (pagoEsperado + reventaBotinEsperada) / mision.horas;
  };

  assert.ok(Math.abs(oroEsperadoPorHora(0.9, "facil") - 121.714) < 0.02);
  assert.ok(Math.abs(oroEsperadoPorHora(0.75, "normal") - 121.6475) < 0.02);
  assert.ok(Math.abs(oroEsperadoPorHora(0.55, "dificil") - 117.4115) < 0.02);
});

test("la recompensa secundaria de botín de jefe tiene en cuenta probabilidad y reventa", () => {
  const jefe = JEFES_ELITE[0];
  assert.equal(jefe.probabilidadBotin, 0.7);
  const pesoTotal = jefe.tablaLoot.reduce((total, entrada) => total + entrada.peso, 0);
  const reventaMedia = jefe.tablaLoot.reduce((total, entrada) => {
    const objeto = obtenerObjetoPorId(entrada.objetoId);
    return total + calcularPrecioVentaObjeto(objeto.precio, 1) * entrada.peso;
  }, 0) / pesoTotal;
  assert.equal(reventaMedia, 1941.9);
  assert.equal(reventaMedia * jefe.probabilidadBotin, 1359.33);
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
  const costesConstruccion = {
    taberna: 630, armeria: 360, herreria: 1170, mercado: 630,
    embajada: 360, escuelaCombate: 1080, muralla: 1800, almacen: 1350,
  };
  for (const [id, coste] of Object.entries(costesConstruccion)) {
    assert.equal(calcularCosteEdificio(id, 0).oro, coste, `coste inicial de ${id}`);
  }
});

test("el catálogo añade botín exclusivo en todas las familias de equipo y una poción superior", () => {
  const idsBotinNuevo = [
    "espada_vigia", "espada_draconica", "lanza_escama", "daga_sombria",
    "arco_cazador", "baston_runico", "maza_enana", "hacha_berserker",
    "grimorio_eclipse", "punos_lobo", "escudo_guardian", "yelmo_veterano",
    "coraza_runica", "perneras_orcas", "botas_viento", "guantes_guardia",
    "collar_fenix", "anillo_duelista", "anillo_arcanista", "amuleto_ancestral",
    "pocion_suprema",
  ];
  for (const id of idsBotinNuevo) {
    const objeto = obtenerObjetoPorId(id);
    assert.ok(objeto, `Falta el nuevo objeto de botín: ${id}`);
    assert.equal(objeto.vendibleEnArmeria, false, `${id} no debe poder comprarse en la Armería`);
    assert.ok(objeto.precio > 0);
  }
  assert.ok(obtenerObjetoPorId("espada_vigia").ataqueBase > obtenerObjetoPorId("espada_acero").ataqueBase);
  assert.ok(obtenerObjetoPorId("arco_cazador").ataqueBase > obtenerObjetoPorId("arco_madera").ataqueBase);
  assert.ok(obtenerObjetoPorId("coraza_runica").defensaBase > obtenerObjetoPorId("armadura_acero").defensaBase);
  assert.ok(obtenerObjetoPorId("pocion_suprema").curacion > obtenerObjetoPorId("pocion_grande").curacion);
  for (const id of idsBotinNuevo) {
    const objeto = obtenerObjetoPorId(id);
    if (objeto.tipo === "arma" || objeto.tipo === "armadura") {
      assert.ok(
        Object.keys(objeto).some((clave) => clave.endsWith("PorMejora")),
        `${id} debe definir incremento por mejora`,
      );
    }
  }
});
