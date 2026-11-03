require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calcularAtributosClase, calcularEntrenamientoRama } = require("../src/lib/progresion/estadisticas/atributos-clase.ts");
const { calcularEstadisticasDerivadasRpg } = require("../src/lib/progresion/estadisticas/estadisticas.ts");
const { calcularRegeneracionRecursosTurno } = require("../src/lib/expediciones/combate/recursos-combate.ts");
const { calcularRestauracionConsumible, esConsumibleRestaurador } = require("../src/lib/expediciones/combate/consumibles-combate.ts");
const { aplicarEfectoComida, calcularBonificacionesComida, COMIDAS_TABERNA } = require("../src/lib/base/taberna.ts");
const { describirEstadoCombate, describirBonificacionesComida } = require("../src/lib/expediciones/presentacion/descripciones-efectos.ts");
const { obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");
const { ajustarHabilidadPorNivel } = require("../src/lib/progresion/habilidades/niveles-habilidad.ts");
const { detalleNumericoHabilidad } = require("../src/lib/progresion/habilidades/descripciones-habilidades.ts");

test("el detalle de una pasiva mejorada muestra su valor efectivo sin repetir la descripción base", () => {
  const aguante = ajustarHabilidadPorNivel(obtenerHabilidadPorId("aguante_aprendiz"), 3);
  assert.equal(aguante.bonusHpMaximo, 10);
  assert.deepEqual(detalleNumericoHabilidad(aguante), ["Vida máxima: +10."]);
});

test("evolucionar conserva el entrenamiento, incluso con el antecesor al máximo", () => {
  const progresos = [{ claseId: "novato", nivelJob: 20 }, { claseId: "espadachin", nivelJob: 40 }];
  const antes = calcularAtributosClase("espadachin", 30, 40, progresos);
  const despues = calcularAtributosClase("caballero", 30, 1, progresos);
  assert.deepEqual(despues, antes);
  assert.ok(calcularAtributosClase("caballero", 30, 20, progresos).fuerza > antes.fuerza);
  const ajena = [...progresos, { claseId: "mago", nivelJob: 40 }, { claseId: "archimago", nivelJob: 80 }];
  assert.deepEqual(calcularAtributosClase("caballero", 30, 1, ajena), despues);
});

test("las híbridas eligen el recorrido mayor y no duplican antecesores compartidos", () => {
  const progresos = [
    { claseId: "novato", nivelJob: 20 }, { claseId: "espadachin", nivelJob: 40 },
    { claseId: "acolito", nivelJob: 30 }, { claseId: "caballero", nivelJob: 45 },
    { claseId: "sacerdote", nivelJob: 60 },
  ];
  const caballero = 19 + 39 + 44;
  const sacerdote = 19 + 29 + 59;
  assert.equal(calcularEntrenamientoRama("cruzado", 10, progresos), Math.max(caballero, sacerdote) + 9);
  assert.equal(calcularEntrenamientoRama("cruzado", 1, progresos), sacerdote);
});

test("la energía base es 100 independientemente de fuerza y vitalidad", () => {
  for (const n of [1, 20, 100]) {
    const stats = calcularEstadisticasDerivadasRpg({ fuerza: n, vitalidad: n, agilidad: n, inteligencia: n, destreza: n, suerte: n });
    assert.equal(stats.energiaMaxima, 100);
    assert.equal(stats.regeneracionManaPorTurno, 2 + n * 0.1);
  }
});

test("reserva de maná y regeneración son independientes, con resto fraccionario persistente", () => {
  const r = calcularRegeneracionRecursosTurno(10, 10, 100, 300, 2.5, 21);
  assert.deepEqual(r, { energiaActual: 31, manaActual: 12, manaRegeneracionPendiente: 0.5 });
  assert.deepEqual(calcularRegeneracionRecursosTurno(31, 12, 100, 600, 2.5, 21, r.manaRegeneracionPendiente),
    { energiaActual: 52, manaActual: 15, manaRegeneracionPendiente: 0 });
  assert.deepEqual(calcularRegeneracionRecursosTurno(119, 99, 120, 100, 2.5, 24, 0.5),
    { energiaActual: 120, manaActual: 100, manaRegeneracionPendiente: 0 });
});

test("el maná acumula regeneraciones de un cuarto de punto hasta completar una unidad", () => {
  let mana = 0;
  let pendiente = 0;
  for (const restoEsperado of [0.25, 0.5, 0.75, 0]) {
    const resultado = calcularRegeneracionRecursosTurno(
      0, mana, 100, 100, 0.25, 0, pendiente,
    );
    mana = resultado.manaActual;
    pendiente = resultado.manaRegeneracionPendiente;
    assert.equal(pendiente, restoEsperado);
  }
  assert.equal(mana, 1);
});

test("la regeneración no supera máximos ni acepta valores no finitos", () => {
  assert.deepEqual(
    calcularRegeneracionRecursosTurno(90, 99, 100, 100, 1.5, 5, 0.25),
    { energiaActual: 95, manaActual: 100, manaRegeneracionPendiente: 0 },
  );
  assert.deepEqual(
    calcularRegeneracionRecursosTurno(NaN, Infinity, -20, 0, NaN, NaN, NaN),
    { energiaActual: 0, manaActual: 0, manaRegeneracionPendiente: 0 },
  );
});

test("los costes físicos requieren administrar la nueva reserva de energía", () => {
  assert.equal(obtenerHabilidadPorId("rompeguardia").costeEnergia, 40);
  let energia = 100;
  for (let i = 0; i < 3; i++) {
    if (i) energia = calcularRegeneracionRecursosTurno(energia, 0, 100, 10).energiaActual;
    energia -= 40;
  }
  assert.equal(energia, 20);
  assert.ok(calcularRegeneracionRecursosTurno(energia, 0, 100, 10).energiaActual >= 40);
});

test("pociones restauran fijo más porcentaje y nunca exceden el máximo", () => {
  const recursos = { hp: 20, hpMaximo: 200, energia: 10, energiaMaxima: 100, mana: 10, manaMaximo: 200 };
  assert.deepEqual(calcularRestauracionConsumible({ curacion: 15, curacionPorcentaje: 0.15 }, recursos),
    { curacion: 45, energia: 0, mana: 0 });
  assert.deepEqual(calcularRestauracionConsumible({ restauracionMana: 20, restauracionManaPorcentaje: 0.4 }, recursos),
    { curacion: 0, energia: 0, mana: 100 });
  assert.deepEqual(calcularRestauracionConsumible({ restauracionEnergiaPorcentaje: 0.6 }, { ...recursos, energia: 80 }),
    { curacion: 0, energia: 20, mana: 0 });
});

test("las pociones ignoran cantidades inválidas y se limitan a los puntos faltantes", () => {
  const recursos = {
    hp: 97, hpMaximo: 100,
    energia: 100, energiaMaxima: 100,
    mana: 3, manaMaximo: 50,
  };
  assert.deepEqual(
    calcularRestauracionConsumible(
      { curacion: 15, curacionPorcentaje: 0.15, restauracionEnergia: 30,
        restauracionMana: Number.POSITIVE_INFINITY, restauracionManaPorcentaje: 0.25 },
      recursos,
    ),
    { curacion: 3, energia: 0, mana: 12 },
  );
  assert.deepEqual(
    calcularRestauracionConsumible(
      { curacion: -20, curacionPorcentaje: Number.NaN, restauracionMana: -10 },
      { ...recursos, hp: 100 },
    ),
    { curacion: 0, energia: 0, mana: 0 },
  );
  assert.deepEqual(
    calcularRestauracionConsumible(
      { curacion: 0.7, restauracionMana: 0.9 },
      recursos,
    ),
    { curacion: 0, energia: 0, mana: 0 },
  );
});

test("solo son restauradores los consumibles con efectos positivos y finitos", () => {
  assert.equal(esConsumibleRestaurador({ tipo: "consumible", curacion: 0 }), false);
  assert.equal(esConsumibleRestaurador({ tipo: "consumible", curacion: -5 }), false);
  assert.equal(esConsumibleRestaurador({ tipo: "consumible", curacion: Number.NaN }), false);
  assert.equal(esConsumibleRestaurador({ tipo: "consumible", restauracionMana: Infinity }), false);
  assert.equal(esConsumibleRestaurador({ tipo: "arma", curacion: 30 }), false);
  assert.equal(esConsumibleRestaurador({ tipo: "consumible", curacionPorcentaje: 0.15 }), true);
  assert.equal(esConsumibleRestaurador({ tipo: "consumible", restauracionEnergiaPorcentaje: 0.6 }), true);
});

test("las comidas mejoran estadísticas pequeñas y ninguna fuerza la iniciativa", () => {
  const base = { ataque: 40, ataqueMagico: 10, defensa: 9, velocidad: 10, probCritico: 0.1 };
  assert.equal(aplicarEfectoComida(base, "caldo-guardian").defensa, 13);
  assert.deepEqual(calcularBonificacionesComida(base, "carne-cazadora"), { ataque: 7 });
  assert.equal(COMIDAS_TABERNA.some((c) => c.efectos.some((e) => e.tipo === "iniciativa")), false);
  assert.equal(COMIDAS_TABERNA.some((c) => /garantiza|primer turno|iniciativa/i.test(c.descripcion)), false);
});

test("el detalle de los efectos usa cantidades resueltas y la duración restante", () => {
  const estado = { habilidadId: "tajo_sangrante", tipo: "dano_progresivo", valor: 16, turnosRestantes: 3 };
  assert.equal(describirEstadoCombate(estado), "16 de daño por turno. 3 turnos restantes.");
  assert.equal(describirEstadoCombate({ ...estado, tipo: "curacion_progresiva", valor: 18, turnosRestantes: 1 }), "18 de cura por turno. 1 turno restante.");
  assert.equal(describirBonificacionesComida({ ataque: 7 }), "+7 de ataque físico. Durante la expedición.");
});

test("mejorar estados conserva la duración, sin aumentar cargas ni penalizaciones propias", () => {
  const mejorada = ajustarHabilidadPorNivel(obtenerHabilidadPorId("primeros_auxilios"), 3);
  assert.equal(mejorada.estadosSecundarios[0].duracionTurnos, 2);
  assert.equal(ajustarHabilidadPorNivel(obtenerHabilidadPorId("abjurador_tactica"), 10).estadosSecundarios[0].valor, 1);
  const furia = ajustarHabilidadPorNivel(obtenerHabilidadPorId("berserker_tactica"), 10);
  assert.equal(furia.disenoActiva.operaciones.find((e) => e.tipo === "estado" && e.familia === "exposicion").valor, 0.1);
});
