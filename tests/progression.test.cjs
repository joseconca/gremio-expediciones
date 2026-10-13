require("./load-typescript.cjs");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const {
  CLASES, obtenerAncestrosClase, obtenerClasesHabilidadDisponibles,
  puedeUsarHabilidadDeClase, evaluarDesbloqueoClase, calcularBonificacionesDominioEquipo, obtenerClasesVisibles,
} = require("../src/lib/progresion/clases.ts");
const { calcularEstadisticasDerivadasRpg } = require("../src/lib/progresion/estadisticas.ts");
const { calcularEstadisticasPersonaje } = require("../src/lib/estadisticasPersonaje.ts");
const { calcularAtributosClase } = require("../src/lib/progresion/atributos-clase.ts");
const { mapearBonificacionesEquipoRpg } = require("../src/lib/progresion/bonificaciones-equipo.ts");
const { aplicarExperienciaJob, experienciaJobParaNivel } = require("../src/lib/progresion/experiencia.ts");
const {
  RANGOS_AMENAZA,
  calcularExperienciaBaseGanada,
  calcularExperienciaJobGanada,
  calcularFactorExperienciaAmenaza,
  calcularMultiplicadoresEnemigo,
  registrarVictoriaRangoNormal,
  obtenerRangoMaximoDesbloqueado,
} = require("../src/lib/expediciones/dificultad.ts");
const { obtenerHabilidadesEnVenta } = require("../src/lib/tiendaHabilidades.ts");
const { ENEMIGOS, JEFES_ELITE, obtenerRutaSpriteEnemigo, obtenerEnemigosPorDificultad } = require("../src/lib/enemigos.ts");
const { generarMisionesDisponibles } = require("../src/lib/generadorMisiones.ts");
const {
  calcularCosteRecursosMejora,
  calcularCosteMejoraObjeto,
  obtenerObjetoPorId,
} = require("../src/lib/objetos.ts");

test("el catálogo de clases tiene requisitos válidos y no contiene ciclos", () => {
  for (const clase of Object.values(CLASES)) {
    for (const requisito of clase.requisitos) {
      assert.ok(CLASES[requisito.claseId], `Requisito inexistente: ${clase.id} -> ${requisito.claseId}`);
      assert.ok(requisito.nivelJob > 0);
    }
    assert.doesNotThrow(() => obtenerAncestrosClase(clase.id));
  }
});
test("Novato Job 10 permite desbloquear Tier 1", () => {
  assert.equal(evaluarDesbloqueoClase("espadachin", [{ claseId: "novato", nivelJob: 9, desbloqueada: true }]).puedeDesbloquear, false);
  assert.equal(evaluarDesbloqueoClase("espadachin", [{ claseId: "novato", nivelJob: 10, desbloqueada: true }]).puedeDesbloquear, true);
});
test("las clases heredan habilidades de todos sus padres, incluidas las híbridas", () => {
  assert.equal(puedeUsarHabilidadDeClase("caballero", "espadachin"), true);
  assert.equal(puedeUsarHabilidadDeClase("caballero", "novato"), true);
  assert.equal(puedeUsarHabilidadDeClase("caballero", "acolito"), false);
  const cruzado = obtenerClasesHabilidadDisponibles("cruzado");
  for (const id of ["cruzado", "caballero", "espadachin", "sacerdote", "acolito", "novato"]) assert.ok(cruzado.includes(id));
  assert.equal(puedeUsarHabilidadDeClase("cruzado", "mago"), false);
});
test("la clase híbrida exige cumplir todos sus requisitos", () => {
  const incompleto = evaluarDesbloqueoClase("cruzado", [
    { claseId: "caballero", nivelJob: 40, desbloqueada: true },
    { claseId: "sacerdote", nivelJob: 39, desbloqueada: true },
  ]);
  assert.equal(incompleto.puedeDesbloquear, false);
  assert.deepEqual(incompleto.requisitosPendientes.map((r) => r.claseId), ["sacerdote"]);
  assert.equal(evaluarDesbloqueoClase("cruzado", [
    { claseId: "caballero", nivelJob: 40, desbloqueada: true },
    { claseId: "sacerdote", nivelJob: 40, desbloqueada: true },
  ]).puedeDesbloquear, true);
});
test("el dominio de armas y armaduras aplica solo los bonus definidos", () => {
  assert.deepEqual(calcularBonificacionesDominioEquipo("espadachin", "espada", "pesada"), {
    multiplicadorAtaqueArma: 1.15, multiplicadorDefensaArmadura: 1.1,
  });
  assert.deepEqual(calcularBonificacionesDominioEquipo("arquero", "arco", "pesada"), {
    multiplicadorAtaqueArma: 1.15, multiplicadorDefensaArmadura: 1,
  });
});
test("Escuela: muestra siempre las habilidades de la profesión y hereda las ramas superiores", () => {
  const caballero = obtenerHabilidadesEnVenta("caballero").map((habilidad) => habilidad.id);
  assert.ok(caballero.includes("estocada_espadachin"));
  assert.ok(caballero.includes("guardia_caballero"));
  assert.ok(!caballero.includes("luz_acolito"));

  const cruzado = obtenerHabilidadesEnVenta("cruzado").map((habilidad) => habilidad.id);
  for (const habilidadId of [
    "estocada_espadachin",
    "guardia_caballero",
    "luz_acolito",
    "bendicion_sacerdote",
    "golpe_cruzado",
  ]) {
    assert.ok(cruzado.includes(habilidadId), `El Cruzado debe ver ${habilidadId}`);
  }

  const catalogo = require("../src/lib/habilidades.ts").HABILIDADES;
  assert.equal(catalogo.length, 49);
  assert.ok(catalogo.every((habilidad) => Boolean(habilidad.claseId)), "Todas las habilidades pertenecen a una profesión");
  assert.ok(!cruzado.some((habilidadId) => [
    "golpe_poderoso", "golpe_preciso", "defensa_ferrea", "curacion",
    "segundo_aire", "ataque_devastador", "piel_dura", "veterano",
    "precision", "corredor", "vitalidad", "sed_de_batalla",
  ].includes(habilidadId)), "Las habilidades globales antiguas no deben reaparecer");
  assert.ok(cruzado.includes("rejuvenecer"), "El Cruzado debe heredar las habilidades del Acólito");
  assert.ok(cruzado.includes("primeros_auxilios"), "Las clases avanzadas deben heredar habilidades de Novato");
  const { HABILIDADES } = require("../src/lib/habilidades.ts");
  const guardia = HABILIDADES.find((habilidad) => habilidad.id === "guardia_improvisada");
  assert.equal(guardia.nivelJobRequerido, 5);
  assert.equal(guardia.costePuntosHabilidad, 1);
  assert.equal(guardia.costeEnergia, 5);
  assert.equal(guardia.duracionTurnos, 4);
  assert.equal(guardia.cooldownTurnos, 4);

  const primerosAuxilios = HABILIDADES.find((habilidad) => habilidad.id === "primeros_auxilios");
  assert.equal(primerosAuxilios.nivelJobRequerido, 3);
  assert.equal(primerosAuxilios.costeEnergia, 4);
  assert.equal(primerosAuxilios.cooldownTurnos, 5);
  assert.equal(primerosAuxilios.curacionPorcentaje, 0.15);
  assert.equal(primerosAuxilios.duracionTurnos, 2);
  assert.equal(primerosAuxilios.estadosSecundarios[0].valor, 0.075);
  assert.equal(primerosAuxilios.estadosSecundarios[0].duracionTurnos, 2);

  const rejuvenecer = HABILIDADES.find((habilidad) => habilidad.id === "rejuvenecer");
  assert.equal(rejuvenecer.nivelJobRequerido, 10);
  assert.equal(rejuvenecer.costeMana, 7);
  assert.equal(rejuvenecer.cooldownTurnos, 4);
  assert.equal(rejuvenecer.duracionTurnos, 3);
  assert.equal(rejuvenecer.curacionProgresivaPorcentaje, 0.08);
});

test("el desglose de estadísticas separa base fija, atributos y redondeos", () => {
  const desglose = calcularEstadisticasPersonaje({
    clase: "Novato",
    profesionActivaId: "novato",
    nivel: 1,
    nivelJob: 1,
    fuerza: 1,
    agilidad: 1,
    vitalidad: 1,
    inteligencia: 1,
    destreza: 1,
    suerte: 1,
    velocidadMejoras: 0,
    capacidadCarruajeMejoras: 0,
  });

  assert.equal(desglose.baseSinAtributos.hpMaximo, 55);
  assert.equal(desglose.atributos.vitalidad.hpMaximo, 10);
  assert.equal(desglose.base.hpMaximo, 65);

  assert.equal(desglose.baseSinAtributos.ataque, 3);
  assert.equal(desglose.atributos.fuerza.ataque, 2);
  assert.equal(desglose.atributos.destreza.ataque, 0.5);
  assert.equal(desglose.base.ataque, 5);
  assert.equal(
    desglose.base.ataque -
      desglose.baseSinAtributos.ataque -
      desglose.atributos.fuerza.ataque -
      desglose.atributos.destreza.ataque,
    -0.5,
    "El desglose conserva el ajuste del redondeo aplicado por la fórmula original",
  );
});

test("forja: una mejora de rareza superior consume más oro manteniendo el coste creciente por nivel", () => {
  assert.equal(calcularCosteMejoraObjeto(1000, 0, "comun"), 5000);
  assert.equal(calcularCosteMejoraObjeto(1000, 0, "poco_comun"), 6000);
  assert.equal(calcularCosteMejoraObjeto(1000, 0, "raro"), 7500);
  assert.equal(calcularCosteMejoraObjeto(1000, 0, "epico"), 9500);
  assert.equal(calcularCosteMejoraObjeto(1000, 0, "legendario"), 12000);
  assert.equal(calcularCosteMejoraObjeto(1000, 1, "raro"), 15000);
});

test("forja: los materiales escalan por tipo, rareza y nivel de mejora", () => {
  assert.deepEqual(
    calcularCosteRecursosMejora(obtenerObjetoPorId("espada_madera"), 0),
    { madera: 1, piedra: 0, metal: 0 },
  );
  assert.deepEqual(
    calcularCosteRecursosMejora(obtenerObjetoPorId("espada_hierro"), 0),
    { madera: 0, piedra: 0, metal: 2 },
  );
  assert.deepEqual(
    calcularCosteRecursosMejora(obtenerObjetoPorId("hacha_orca"), 0),
    { madera: 3, piedra: 0, metal: 3 },
  );
  assert.deepEqual(
    calcularCosteRecursosMejora(obtenerObjetoPorId("armadura_hierro"), 0),
    { madera: 0, piedra: 2, metal: 4 },
  );

  const arcoRaro = {
    id: "arco-prueba",
    tipo: "arma",
    subtipo: "arco",
    rareza: "raro",
  };
  assert.deepEqual(
    calcularCosteRecursosMejora(arcoRaro, 0),
    { madera: 9, piedra: 0, metal: 3 },
  );
  assert.deepEqual(
    calcularCosteRecursosMejora(arcoRaro, 3),
    { madera: 18, piedra: 0, metal: 6 },
  );

  const armaduraPesadaRara = {
    id: "armadura-pesada-prueba",
    tipo: "armadura",
    categoriaArmadura: "pesada",
    rareza: "raro",
  };
  assert.deepEqual(
    calcularCosteRecursosMejora(armaduraPesadaRara, 0),
    { madera: 0, piedra: 3, metal: 6 },
  );
});

test("atributos principales generan estadísticas derivadas y valores acotados", () => {
  const bajo = calcularEstadisticasDerivadasRpg({ fuerza: 1, agilidad: 1, vitalidad: 1, inteligencia: 1, destreza: 1, suerte: 1 });
  const alto = calcularEstadisticasDerivadasRpg({ fuerza: 20, agilidad: 30, vitalidad: 25, inteligencia: 18, destreza: 24, suerte: 10 }, 5);
  assert.ok(alto.hpMaximo > bajo.hpMaximo);
  assert.ok(alto.ataqueFisico > bajo.ataqueFisico);
  assert.ok(alto.ataqueMagico > bajo.ataqueMagico);
  assert.ok(alto.evasion > bajo.evasion);
  assert.ok(alto.manaMaximo > bajo.manaMaximo);
  assert.ok(alto.energiaMaxima > bajo.energiaMaxima);
  assert.ok(Number.isFinite(alto.regeneracionManaPorTurno));
  const invalido = calcularEstadisticasDerivadasRpg({ fuerza: NaN, agilidad: -5, vitalidad: 0, inteligencia: Infinity, destreza: 1, suerte: 1 }, -1);
  assert.ok(Number.isFinite(invalido.hpMaximo) && invalido.hpMaximo >= 1);
});


test("las bonificaciones de equipo se aplican a máximos y regeneración de recursos RPG", () => {
  const atributos = {
    fuerza: 1,
    agilidad: 1,
    vitalidad: 1,
    inteligencia: 1,
    destreza: 1,
    suerte: 1,
  };
  const base = calcularEstadisticasDerivadasRpg(atributos, 1);
  const bonificaciones = mapearBonificacionesEquipoRpg({
    energiaMaxima: 7,
    manaMaximo: 8,
    regeneracionEnergiaPorTurno: 2,
    regeneracionManaPorTurno: 1,
  });
  const equipado = calcularEstadisticasDerivadasRpg(atributos, 1, bonificaciones);

  assert.equal(equipado.energiaMaxima, base.energiaMaxima + 7);
  assert.equal(equipado.manaMaximo, base.manaMaximo + 8);
  assert.equal(equipado.regeneracionEnergiaPorTurno, base.regeneracionEnergiaPorTurno + 2);
  assert.equal(equipado.regeneracionManaPorTurno, base.regeneracionManaPorTurno + 1);
});

test("Job: cada nivel concede un punto de habilidad y conserva el exceso de experiencia", () => {
  const resultado = aplicarExperienciaJob({
    nivelJob: 1,
    experienciaJob: 0,
    puntosHabilidadDisponibles: 0,
    maestriaCompletada: false,
  }, 2000, 40);

  assert.equal(resultado.nivelJob, 16);
  assert.equal(resultado.nivelesSubidos, 15);
  assert.equal(resultado.puntosHabilidadDisponibles, 15);
  assert.equal(resultado.experienciaJob, 86);
  assert.equal(resultado.maestriaCompletada, false);
});

test("Job 40 de Tier 1 llega alrededor de Base 6–7 con el ritmo Base/Job", () => {
  const { experienciaParaNivel } = require("../src/lib/configuracionJuego.ts");
  const totalJob40 = Array.from({ length: 39 }, (_, index) => experienciaJobParaNivel(index + 1))
    .reduce((total, xp) => total + xp, 0);

  assert.equal(experienciaParaNivel(1), 500);
  assert.equal(experienciaParaNivel(2), 1778);
  assert.equal(experienciaParaNivel(3), 3733);
  assert.equal(experienciaParaNivel(4), 6320);
  assert.equal(experienciaJobParaNivel(1), 101);
  assert.equal(experienciaJobParaNivel(10), 134);
  assert.ok(totalJob40 >= 9_500 && totalJob40 <= 10_000, `XP acumulada Job 1→40 inesperada: ${totalJob40}`);

  let nivelBase = 1;
  let xpBase = 0;
  let victorias = 0;
  let profesion = "novato";
  let progresoJob = {
    nivelJob: 1,
    experienciaJob: 0,
    puntosHabilidadDisponibles: 0,
    maestriaCompletada: false,
  };

  while (!(profesion === "tier1" && progresoJob.nivelJob >= 40)) {
    const amenaza = nivelBase;
    const xpBaseGanada = calcularExperienciaBaseGanada(amenaza, nivelBase, "normal");
    const xpJobGanada = calcularExperienciaJobGanada(
      progresoJob.nivelJob,
      amenaza,
      nivelBase,
      "normal"
    );

    xpBase += xpBaseGanada;
    while (xpBase >= experienciaParaNivel(nivelBase)) {
      xpBase -= experienciaParaNivel(nivelBase);
      nivelBase += 1;
    }

    progresoJob = aplicarExperienciaJob(
      progresoJob,
      xpJobGanada,
      profesion === "novato" ? 10 : 40
    );
    victorias += 1;

    if (profesion === "novato" && progresoJob.nivelJob >= 10) {
      profesion = "tier1";
      progresoJob = {
        nivelJob: 1,
        experienciaJob: 0,
        puntosHabilidadDisponibles: 0,
        maestriaCompletada: false,
      };
    }

    assert.ok(victorias < 200, "La primera maestría Tier 1 debe alcanzarse en un ritmo razonable");
  }

  assert.equal(victorias, 126);
  assert.equal(nivelBase, 5, "La primera maestría llega cerca de Base 6");
  assert.ok(
    xpBase / experienciaParaNivel(nivelBase) >= 0.9,
    "Debe quedar cerca de subir a Base 6"
  );
});

test("expediciones: el catálogo respeta rangos desbloqueados y garantiza misión de frontera", () => {
  const ahora = new Date("2026-10-12T12:00:00.000Z");
  const inicial = generarMisionesDisponibles({
    baseLat: 28,
    baseLng: -15,
    nivelPersonaje: 1,
    rangosAmenazaCompletados: [],
    ultimaMisionElite: null,
    ahora,
  });
  const normalesIniciales = inicial.filter((mision) => mision.tipo === "normal");
  assert.ok(normalesIniciales.some((mision) => mision.dificultad === 1));
  assert.ok(normalesIniciales.some((mision) => mision.dificultad === 3));
  assert.ok(normalesIniciales.every((mision) => mision.dificultad <= 3));
  assert.ok(!inicial.some((mision) => mision.tipo === "elite"));

  const rangoDos = generarMisionesDisponibles({
    baseLat: 28,
    baseLng: -15,
    nivelPersonaje: 4,
    rangosAmenazaCompletados: ["I"],
    ultimaMisionElite: null,
    ahora,
  }).filter((mision) => mision.tipo === "normal");
  assert.ok(rangoDos.some((mision) => mision.dificultad === 6));
  assert.ok(rangoDos.every((mision) => mision.dificultad <= 6));
});

test("dificultad: los rangos exigen nivel Base y victoria Normal del rango anterior", () => {
  assert.equal(obtenerRangoMaximoDesbloqueado(4, []).id, "I");
  assert.equal(obtenerRangoMaximoDesbloqueado(4, ["I"]).id, "II");
  assert.equal(obtenerRangoMaximoDesbloqueado(7, ["I", "II"]).id, "III");
  assert.equal(obtenerRangoMaximoDesbloqueado(13, ["I", "II", "III", "IV"]).id, "V");
  assert.deepEqual(registrarVictoriaRangoNormal(["I"], 4), ["I", "II"]);
  assert.deepEqual(RANGOS_AMENAZA.map((rango) => rango.id), ["I", "II", "III", "IV", "V"]);
});

test("enemigos: el Rango V mantiene candidatos por encima del mayor difMin del catálogo", () => {
  const catalogo = ENEMIGOS.filter((enemigo) => enemigo.id !== "mimic");
  const nivelMaximoCatalogo = Math.max(
    ...catalogo.map((enemigo) => Math.max(1, enemigo.difMin))
  );
  const minimoCatalogo = Math.max(0, nivelMaximoCatalogo - 3);
  const normales = obtenerEnemigosPorDificultad(30);
  assert.ok(normales.length > 0);
  assert.ok(normales.every((enemigo) =>
    enemigo.difMin >= minimoCatalogo && enemigo.difMin <= nivelMaximoCatalogo
  ));
  assert.ok(obtenerEnemigosPorDificultad(17).length > 0);
});

test("sprites de enemigos: cada enemigo del catálogo tiene sprite organizado por rango", () => {
  for (const enemigo of [...ENEMIGOS, ...JEFES_ELITE]) {
    const ruta = obtenerRutaSpriteEnemigo(enemigo.id);
    assert.match(ruta, /^\/sprites\/enemies\/(I|II|III|IV|V)\/[^/]+\.png$/);
    assert.ok(
      fs.existsSync(path.join(__dirname, "..", "public", ruta.slice(1))),
      `Falta el sprite ${ruta} para ${enemigo.id}`,
    );
  }
  assert.equal(obtenerRutaSpriteEnemigo(null), "/sprites/enemies/I/slime_acido.png");
});

test("dificultad: XP Base depende del enemigo y no del nivel actual del jugador", () => {
  assert.equal(calcularExperienciaBaseGanada(1, 1, "normal"), 45);
  assert.equal(calcularExperienciaBaseGanada(1, 10, "normal"), 45);
  assert.equal(calcularExperienciaBaseGanada(10, 1, "normal"), 505);
  assert.ok(calcularExperienciaBaseGanada(10, 10, "dificil") > calcularExperienciaBaseGanada(10, 10, "normal"));
  assert.equal(calcularFactorExperienciaAmenaza(6, 10), 0.15, "El modificador sigue disponible para Job");
});

test("Job: la recompensa depende de amenaza, no del nivel Job ni de un porcentaje de su umbral", () => {
  const amenazaInicial = calcularExperienciaJobGanada(1, 1, 1, "normal");
  const mismoEnemigoJobAlto = calcularExperienciaJobGanada(10, 1, 1, "normal");
  const amenazaAlta = calcularExperienciaJobGanada(1, 13, 13, "normal");
  const amenazaBaja = calcularExperienciaJobGanada(1, 1, 10, "normal");
  const dificil = calcularExperienciaJobGanada(1, 1, 1, "dificil");

  assert.equal(amenazaInicial, 23);
  assert.equal(mismoEnemigoJobAlto, amenazaInicial);
  assert.ok(amenazaAlta > amenazaInicial);
  assert.ok(amenazaBaja < amenazaInicial);
  assert.ok(dificil > amenazaInicial);
});

test("dificultad: los modificadores de modo solo cambian las estadísticas declaradas", () => {
  const facil = calcularMultiplicadoresEnemigo(7, 7, "facil");
  const normal = calcularMultiplicadoresEnemigo(7, 7, "normal");
  const dificil = calcularMultiplicadoresEnemigo(7, 7, "dificil");
  assert.deepEqual(facil, { vida: 0.8, ataque: 0.85, defensa: 0.9 });
  assert.deepEqual(normal, { vida: 1, ataque: 1, defensa: 1 });
  assert.deepEqual(dificil, { vida: 1.25, ataque: 1.15, defensa: 1.1 });
  assert.equal(calcularMultiplicadoresEnemigo(9, 7, "normal").vida, 1.06);
});

test("Job: al alcanzar el máximo completa maestría y no acumula experiencia extra", () => {
  const resultado = aplicarExperienciaJob({
    nivelJob: 1,
    experienciaJob: 0,
    puntosHabilidadDisponibles: 2,
    maestriaCompletada: false,
  }, 999999, 2);

  assert.equal(resultado.nivelJob, 2);
  assert.equal(resultado.experienciaJob, 0);
  assert.equal(resultado.puntosHabilidadDisponibles, 3);
  assert.equal(resultado.maestriaCompletada, true);
  assert.equal(resultado.experienciaNecesariaSiguienteNivel, null);
});


test("migración: los personajes actuales pasan a Novato Job 1 sin perder nivel Base", () => {
  const migration = fs.readFileSync(
    path.join(__dirname, "../prisma/migrations/20261012180000_reset_personajes_a_novato/migration.sql"),
    "utf8"
  );

  const actualizarPersonaje = migration.match(
    /UPDATE "Personaje"[\s\S]*?;/
  )?.[0];
  assert.ok(actualizarPersonaje, "La migración actualiza Personaje");
  assert.match(actualizarPersonaje, /"clase" = 'Novato'/);
  assert.match(actualizarPersonaje, /"profesionActivaId" = 'novato'/);
  assert.doesNotMatch(
    actualizarPersonaje,
    /"nivel"\s*=|"experiencia"\s*=/,
    "El nivel y la experiencia Base no se modifican"
  );

  assert.match(migration, /DELETE FROM "ProgresoClase"[\s\S]*?"claseId" <> 'novato'/);
  assert.match(migration, /"nivelJob" = 1/);
  assert.match(migration, /"experienciaJob" = 0/);
  assert.match(migration, /"puntosHabilidadDisponibles" = 0/);
  assert.match(migration, /"desbloqueada" = TRUE/);
  assert.match(migration, /"maestriaCompletada" = FALSE/);
  assert.match(migration, /ON CONFLICT \("personajeId", "claseId"\) DO NOTHING/);
});


test("la lista de profesiones solo muestra las ramas desbloqueadas o alcanzables", () => {
  const novato1 = obtenerClasesVisibles("novato", [
    { claseId: "novato", nivelJob: 1, desbloqueada: true },
  ]);
  assert.deepEqual(novato1, []);

  const novato10 = obtenerClasesVisibles("novato", [
    { claseId: "novato", nivelJob: 10, desbloqueada: true },
  ]);
  assert.deepEqual(novato10.map((clase) => clase.id).sort(), ["acolito", "arquero", "espadachin", "mago"]);

  const mago40 = obtenerClasesVisibles("mago", [
    { claseId: "novato", nivelJob: 10, desbloqueada: true },
    { claseId: "mago", nivelJob: 40, desbloqueada: true },
  ]).map((clase) => clase.id);
  for (const id of ["acolito", "arquero", "espadachin", "elementalista", "brujo"]) assert.ok(mago40.includes(id));
  assert.ok(!mago40.includes("mago"), "La clase activa no debe ofrecerse como cambio");
  assert.ok(!mago40.includes("cruzado"), "Una clase de tier superior no debe mostrarse antes de cumplir todos sus requisitos");
});

test("los atributos crecen por nivel Base y reciben bonificaciones Job según el arquetipo", () => {
  const novato = calcularAtributosClase("novato", 20, 1);
  const espadachin = calcularAtributosClase("espadachin", 20, 1);
  const mago = calcularAtributosClase("mago", 20, 1);
  const espadachinJob40 = calcularAtributosClase("espadachin", 20, 40);
  const magoBase40 = calcularAtributosClase("mago", 40, 1);
  assert.ok(espadachin.fuerza > espadachin.inteligencia);
  assert.ok(mago.inteligencia > mago.fuerza);
  assert.notDeepEqual(novato, espadachin);
  assert.ok(espadachinJob40.fuerza > espadachin.fuerza);
  assert.ok(magoBase40.inteligencia > mago.inteligencia);
});


const { calcularProbabilidadImpacto, resolverAtaqueJugador } = require("../src/lib/expediciones/combate.ts");

test("combate: precisión y evasión afectan a la probabilidad de impacto", () => {
  const base = calcularProbabilidadImpacto(75, 0);
  const precisionBaja = calcularProbabilidadImpacto(20, 0);
  const precisionAlta = calcularProbabilidadImpacto(100, 0);
  const evasionAlta = calcularProbabilidadImpacto(100, 0.6);
  assert.equal(base, 0.95);
  assert.ok(precisionAlta > base);
  assert.ok(precisionBaja < base);
  assert.ok(evasionAlta < precisionAlta);
});

test("combate: la precisión baja puede provocar un fallo sin pifia natural", () => {
  const originalRandom = Math.random;
  try {
    const valores = [0.5, 0.9];
    Math.random = () => valores.shift() ?? 0.99;
    const resultado = resolverAtaqueJugador({
      jugadorAtaque: 20,
      jugadorNivel: 10,
      jugadorProbCritico: 0,
      jugadorDanoCritico: 1.5,
      jugadorPrecision: 20,
      enemigoEvasion: 0,
      enemigoDefensa: 0,
      enemigoNombre: "Objetivo de prueba",
    });
    assert.equal(resultado.tipo, "fallo");
    assert.equal(resultado.dano, 0);
  } finally {
    Math.random = originalRandom;
  }
});


test("XP Base: los umbrales siguen la curva polinómica y la XP crece por nivel de enemigo", () => {
  const { experienciaParaNivel } = require("../src/lib/configuracionJuego.ts");
  let nivel = 1;
  let experiencia = 0;
  let victoriasAcumuladas = 0;
  const victoriasPorNivel = [];

  for (let nivelObjetivo = 1; nivelObjetivo <= 12; nivelObjetivo += 1) {
    const inicio = victoriasAcumuladas;
    while (nivel === nivelObjetivo) {
      experiencia += calcularExperienciaBaseGanada(nivel, nivel, "normal");
      victoriasAcumuladas += 1;
      while (experiencia >= experienciaParaNivel(nivel)) {
        experiencia -= experienciaParaNivel(nivel);
        nivel += 1;
      }
    }
    victoriasPorNivel.push(victoriasAcumuladas - inicio);
  }

  assert.deepEqual(victoriasPorNivel.slice(0, 6), [12, 19, 26, 33, 39, 45]);
  for (let indice = 1; indice < victoriasPorNivel.length; indice += 1) {
    assert.ok(
      victoriasPorNivel[indice] > victoriasPorNivel[indice - 1],
      `El nivel ${indice + 1} debe exigir más victorias que el anterior`
    );
  }
  assert.equal(victoriasAcumuladas, 559, "El ritmo Base 1 a 13 debe ser exigente, pero razonable");
});

test("objetos: los sprites de armadura se organizan por ranura", () => {
  const { obtenerObjetoPorId, obtenerSpriteObjeto } = require("../src/lib/objetos.ts");
  for (const id of ["armadura_cuero", "tela_andrajosa"]) {
    const objeto = obtenerObjetoPorId(id);
    assert.ok(objeto, `No existe el objeto ${id}`);
    const ruta = obtenerSpriteObjeto(objeto);
    assert.equal(ruta, `/sprites/items/armors/armadura/${id}.png`);
    assert.ok(
      fs.existsSync(path.join(__dirname, "..", "public", ruta.slice(1))),
      `Falta el sprite organizado de ${id}: ${ruta}`
    );
  }

  const cascoSinSprite = obtenerObjetoPorId("casco_cuero");
  assert.equal(obtenerSpriteObjeto(cascoSinSprite), null, "El casco sin arte aún debe usar el icono alternativo");
});

test("las pasivas equipadas de recurso se reflejan en máximos y regeneración", () => {
  const { calcularEstadisticasPersonaje } = require("../src/lib/estadisticasPersonaje.ts");
  const basePersonaje = {
    clase: "Novato",
    nivel: 1,
    nivelJob: 1,
    fuerza: 1,
    agilidad: 1,
    vitalidad: 1,
    inteligencia: 1,
    destreza: 1,
    suerte: 1,
    velocidadMejoras: 0,
    capacidadCarruajeMejoras: 0,
  };
  const personajeMago = {
    ...basePersonaje,
    profesionActivaId: "mago",
    progresosClase: [{ claseId: "mago", nivelJob: 1, desbloqueada: true }],
  };
  const baseMago = calcularEstadisticasPersonaje(personajeMago, []).total;
  const magoEquipado = calcularEstadisticasPersonaje(
    personajeMago,
    ["reserva_arcana"],
  ).total;
  assert.equal(magoEquipado.manaMaximo, baseMago.manaMaximo + 10);

  const personajeAcolito = {
    ...basePersonaje,
    profesionActivaId: "acolito",
    progresosClase: [{ claseId: "acolito", nivelJob: 1, desbloqueada: true }],
  };
  const baseAcolito = calcularEstadisticasPersonaje(personajeAcolito, []).total;
  const acolitoEquipado = calcularEstadisticasPersonaje(
    personajeAcolito,
    ["plegaria_constante"],
  ).total;
  assert.equal(
    acolitoEquipado.regeneracionManaPorTurno,
    baseAcolito.regeneracionManaPorTurno + 1,
  );
});
