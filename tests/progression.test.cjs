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
const { ajustarHabilidadPorNivel, nivelMaximoHabilidad, costeReinicioHabilidades } = require("../src/lib/progresion/niveles-habilidad.ts");
const { mapearBonificacionesEquipoRpg } = require("../src/lib/progresion/bonificaciones-equipo.ts");
const { aplicarExperienciaJob, experienciaJobParaNivel } = require("../src/lib/progresion/experiencia.ts");
const {
  RANGOS_AMENAZA,
  calcularExperienciaBaseGanada,
  calcularExperienciaJobGanada,
  calcularFactorExperienciaAmenaza,
  calcularMultiplicadoresEnemigo,
  calcularOroEnemigo,
  registrarVictoriaRangoNormal,
  obtenerRangoMaximoDesbloqueado,
} = require("../src/lib/expediciones/dificultad.ts");
const { obtenerHabilidadesEnVenta, evaluarRequisitosAprendizaje } = require("../src/lib/tiendaHabilidades.ts");
const { ENEMIGOS, JEFES_ELITE, obtenerRutaSpriteEnemigo, obtenerEnemigosPorDificultad } = require("../src/lib/enemigos.ts");
const {
  seleccionarEnemigoNormal,
  calcularPesoDifMinEnemigo,
  calcularPesoRarezaEnemigo,
  PROBABILIDAD_ENCUENTRO_MIMICO,
  generarComposicionDifMinEncuentro,
  seleccionarEnemigosNormales,
  PESOS_COMPOSICION_ENCUENTRO,
} = require("../src/lib/expediciones/normal.ts");
const { generarMisionesDisponibles, MISIONES_POR_DURACION } = require("../src/lib/generadorMisiones.ts");
const {
  calcularCosteRecursosMejora,
  calcularCosteMejoraObjeto,
  obtenerObjetoPorId,
} = require("../src/lib/objetos.ts");

test("la composición de encuentros respeta probabilidades de party y límites de dificultad", () => {
  assert.deepEqual(generarComposicionDifMinEncuentro(6, true, 0.1), [6]);
  assert.deepEqual(generarComposicionDifMinEncuentro(6, true, 0.5), [6, 6]);
  assert.deepEqual(generarComposicionDifMinEncuentro(6, true, 0.7), [6, 5]);
  assert.deepEqual(generarComposicionDifMinEncuentro(6, true, 0.8), [6, 5, 4]);
  assert.deepEqual(generarComposicionDifMinEncuentro(6, true, 0.95), [5, 5]);

  assert.deepEqual(generarComposicionDifMinEncuentro(1, true, 0.1), [1]);
  assert.deepEqual(generarComposicionDifMinEncuentro(1, true, 0.7), [1, 0]);
  assert.deepEqual(generarComposicionDifMinEncuentro(1, true, 0.95), [0, 0]);

  assert.deepEqual(generarComposicionDifMinEncuentro(0, true, 0.1), [0]);
  assert.deepEqual(generarComposicionDifMinEncuentro(0, true, 0.95), [0, 0]);
  assert.deepEqual(generarComposicionDifMinEncuentro(0, false, 0.95), [0, 0]);

  const pesosParty = Object.values(PESOS_COMPOSICION_ENCUENTRO.party).reduce((s, n) => s + n, 0);
  const pesosSolo = Object.values(PESOS_COMPOSICION_ENCUENTRO.solo).reduce((s, n) => s + n, 0);
  assert.equal(pesosParty, 100);
  assert.equal(pesosSolo, 100);
  for (let nivel = 0; nivel <= 17; nivel++) {
    for (const enParty of [false, true]) {
      for (let i = 0; i < 100; i++) {
        const grupo = generarComposicionDifMinEncuentro(nivel, enParty, i / 100);
        assert.ok(grupo.length >= 1 && grupo.length <= 3);
        assert.ok(grupo.every((difMin) => difMin >= 0 && difMin <= nivel));
      }
    }
  }
});

test("las expediciones normales generan grupos con IDs distintos y conservan el encuentro singular de mímico", () => {
  const grupo = seleccionarEnemigosNormales(6, true, () => 0.5);
  assert.equal(grupo.length, 2);
  assert.ok(grupo.every((enemigo) => enemigo.difMin === 6));
  assert.equal(new Set(grupo.map((enemigo) => enemigo.id)).size, grupo.length);

  const mimico = seleccionarEnemigosNormales(6, true, () => 0);
  assert.deepEqual(mimico.map((enemigo) => enemigo.id), ["mimic"]);
  assert.deepEqual(seleccionarEnemigosNormales(0, false, () => 0.2).map((enemigo) => enemigo.difMin), [0]);
});

test("el catálogo de clases tiene requisitos válidos y no contiene ciclos", () => {
  for (const clase of Object.values(CLASES)) {
    for (const requisito of clase.requisitos) {
      assert.ok(CLASES[requisito.claseId], `Requisito inexistente: ${clase.id} -> ${requisito.claseId}`);
      assert.ok(requisito.nivelJob > 0);
    }
    assert.doesNotThrow(() => obtenerAncestrosClase(clase.id));
  }
});
test("el grafo contiene las clases actuales y respeta los máximos por tier", () => {
  const clases = Object.values(CLASES);
  assert.equal(clases.length, 61);
  assert.deepEqual(
    [0, 1, 1.5, 2, 2.5, 3, 3.5].map((tier) => clases.filter((clase) => clase.tier === tier).length),
    [1, 4, 1, 14, 10, 23, 8],
  );
  for (const clase of clases) {
    const maximoEsperado = clase.tier === 0 ? 20
      : clase.tier === 1 ? 40
      : clase.tier === 1.5 ? 80
      : clase.tier === 2 ? 60
      : clase.tier === 2.5 ? 70
      : 80;
    assert.equal(clase.nivelJobMaximo, maximoEsperado, `Máximo Job incorrecto para ${clase.nombre}`);
  }
  assert.deepEqual(CLASES.pirata.requisitos.map((requisito) => requisito.claseId), ["duelista", "cazador"]);
  assert.equal(CLASES.pirata.tier, 2.5);
  assert.equal(CLASES.pirata.nivelJobMaximo, 70);
  for (const padreId of ["caballero", "duelista", "sacerdote", "monje", "cazador", "explorador", "elementalista", "brujo"]) {
    assert.equal(clases.filter((clase) => clase.tier === 3 && clase.requisitos.some((requisito) => requisito.claseId === padreId)).length, 2, `${padreId} debe tener exactamente dos clases de Tier 3`);
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
    { claseId: "caballero", nivelJob: 20, desbloqueada: true },
    { claseId: "sacerdote", nivelJob: 19, desbloqueada: true },
  ]);
  assert.equal(incompleto.puedeDesbloquear, false);
  assert.deepEqual(incompleto.requisitosPendientes.map((r) => r.claseId), ["sacerdote"]);
  assert.equal(evaluarDesbloqueoClase("cruzado", [
    { claseId: "caballero", nivelJob: 20, desbloqueada: true },
    { claseId: "sacerdote", nivelJob: 20, desbloqueada: true },
  ]).puedeDesbloquear, true);
});
test("las categorías dominadas siempre tienen una bonificación positiva", () => {
  for (const clase of Object.values(CLASES)) {
    if (clase.armasDominadas.length > 0) {
      assert.ok(clase.bonoAtaqueArmaDominada > 0, `${clase.id} declara armas dominadas sin bonus de ataque positivo`);
    }
    if (clase.armadurasDominadas.length > 0) {
      assert.ok(clase.bonoDefensaArmaduraDominada > 0, `${clase.id} declara armaduras dominadas sin bonus de defensa positivo`);
    }
  }
});

test("el dominio de armas da bono a las dominadas y penaliza un 25 % las no dominadas", () => {
  assert.deepEqual(calcularBonificacionesDominioEquipo("espadachin", "espada", "pesada"), {
    multiplicadorAtaqueArma: 1.15, multiplicadorDefensaArmadura: 1.1,
  });
  assert.deepEqual(calcularBonificacionesDominioEquipo("arquero", "arco", "ligera"), {
    multiplicadorAtaqueArma: 1.15, multiplicadorDefensaArmadura: 1.05,
  });
  assert.deepEqual(calcularBonificacionesDominioEquipo("arquero", "daga", "ligera"), {
    multiplicadorAtaqueArma: 1.15, multiplicadorDefensaArmadura: 1.05,
  });
  assert.deepEqual(calcularBonificacionesDominioEquipo("arquero", "espada", "pesada"), {
    multiplicadorAtaqueArma: 0.75, multiplicadorDefensaArmadura: 0.75,
  });
  assert.deepEqual(calcularBonificacionesDominioEquipo("espadachin", "arco", "ligera"), {
    multiplicadorAtaqueArma: 0.75, multiplicadorDefensaArmadura: 0.75,
  });
  assert.equal(calcularBonificacionesDominioEquipo("espadachin", "escudo").multiplicadorAtaqueArma, 1.15, "El Espadachín domina el escudo como equipo de mano");
  assert.equal(calcularBonificacionesDominioEquipo("arquero", "escudo").multiplicadorAtaqueArma, 0.75, "El Arquero no domina el escudo");
  assert.equal(calcularBonificacionesDominioEquipo("novato", undefined, "ligera").multiplicadorDefensaArmadura, 0.75, "Sin bonus de defensa, la armadura también sufre penalización");
  assert.equal(calcularBonificacionesDominioEquipo("brujo", undefined, "ligera").multiplicadorDefensaArmadura, 0.75, "El Brujo no tiene bonus defensivo de armadura");
  assert.deepEqual(CLASES.novato.armadurasDominadas, [], "El Novato no debe figurar como dominador de una categoría que no bonifica");
  assert.deepEqual(CLASES.brujo.armadurasDominadas, [], "El Brujo no debe figurar como dominador de armadura ligera si no la bonifica");
});

test("el catálogo cubre todos los tipos actuales de arma y todas las categorías de armadura", () => {
  const { OBJETOS, obtenerObjetoPorId, obtenerSpriteObjeto } = require("../src/lib/objetos.ts");
  const subtiposArma = new Set(
    OBJETOS.filter((objeto) => objeto.tipo === "arma").map((objeto) => objeto.subtipo)
  );
  for (const subtipo of ["espada", "hacha", "lanza", "daga", "arco", "baston", "maza", "libro", "puños"]) {
    assert.ok(subtiposArma.has(subtipo), `Falta un arma de tipo ${subtipo}`);
  }

  const categoriasArmadura = new Set(
    OBJETOS.filter((objeto) => objeto.tipo === "armadura" && objeto.slot !== "mano_secundaria")
      .map((objeto) => objeto.categoriaArmadura)
  );
  for (const categoria of ["ligera", "media", "pesada"]) {
    assert.ok(categoriasArmadura.has(categoria), `Falta armadura de categoría ${categoria}`);
  }
  for (const id of ["hacha_piedra", "lanza_madera", "daga_hierro", "arco_madera", "baston_madera", "maza_madera", "libro_aprendiz", "guantes_lucha", "cota_malla"]) {
    const objeto = obtenerObjetoPorId(id);
    const sprite = obtenerSpriteObjeto(objeto);
    assert.ok(sprite, `${id} debe usar su miniatura propia`);
    assert.ok(
      fs.existsSync(path.join(__dirname, "..", "public", sprite.slice(1))),
      `Falta la miniatura de ${id}: ${sprite}`,
    );
  }
});

test("las armaduras declaran subtipo y reciben penalización en todas las ranuras salvo joyería", () => {
  const { OBJETOS, obtenerObjetoPorId, obtenerSubtipoArmadura, calcularEstadisticasObjeto } = require("../src/lib/objetos.ts");
  const armaduras = OBJETOS.filter((objeto) => objeto.tipo === "armadura");
  assert.ok(armaduras.length > 0);
  for (const armadura of armaduras) {
    assert.ok(armadura.subtipo, `${armadura.id} debe declarar subtipo`);
    if (armadura.slot === "mano_secundaria") {
      assert.equal(armadura.subtipo, "escudo", "El escudo tiene dominio propio, no categoría de armadura");
      assert.equal(armadura.categoriaArmadura, undefined);
    } else {
      assert.ok(["ligera", "media", "pesada"].includes(obtenerSubtipoArmadura(armadura)), `${armadura.id} debe declarar categoría ligera/media/pesada`);
      assert.equal(obtenerSubtipoArmadura(armadura), armadura.categoriaArmadura);
    }
  }
  for (const arma of OBJETOS.filter((objeto) => objeto.tipo === "arma")) {
    assert.ok(arma.subtipo, `${arma.id} debe declarar subtipo de arma`);
  }

  const pieza = (id) => {
    const objeto = obtenerObjetoPorId(id);
    return { id: `inv-${id}`, objetoId: id, objeto, cantidad: 1, nivelMejora: 0, sufijoId: null, bonificaciones: {} };
  };
  const equipo = {
    arma: pieza("espada_hierro"),
    manoSecundaria: pieza("escudo_madera"),
    casco: pieza("casco_cuero"),
    armadura: pieza("armadura_cuero"),
    pantalones: pieza("pantalones_cuero"),
    botas: pieza("botas_cuero"),
    guantes: pieza("guantes_cuero"),
    accesorio: pieza("amuleto_vitalidad"),
    anillo1: pieza("anillo_resistencia"),
    anillo2: pieza("anillo_maldito"),
  };
  const { calcularModificadoresEquipo } = require("../src/lib/estadisticasPersonaje.ts");
  const stats = calcularModificadoresEquipo(equipo, "espadachin");
  const defensaEscudo = calcularEstadisticasObjeto(obtenerObjetoPorId("escudo_madera"), 0).defensa * 1.15;
  const defensaOtrasArmaduras = ["casco_cuero", "armadura_cuero", "pantalones_cuero", "botas_cuero", "guantes_cuero"]
    .reduce((total, id) => total + calcularEstadisticasObjeto(obtenerObjetoPorId(id), 0).defensa * 0.75, 0);
  const defensaArmaduras = defensaEscudo + defensaOtrasArmaduras;
  const defensaJoyeria = calcularEstadisticasObjeto(obtenerObjetoPorId("anillo_resistencia"), 0).defensa
    + calcularEstadisticasObjeto(obtenerObjetoPorId("anillo_maldito"), 0).defensa;
  assert.equal(stats.defensa, defensaArmaduras + defensaJoyeria);
  assert.equal(stats.ataque, 6 * 1.15 + 6, "La espada dominada aplica su bonus y el anillo conserva su ataque íntegro");
  const armaSinTipo = {
    id: "inv-arma-sin-tipo",
    objetoId: "arma_sin_tipo",
    cantidad: 1,
    nivelMejora: 0,
    sufijoId: null,
    bonificaciones: {},
    objeto: { id: "arma_sin_tipo", nombre: "Arma sin tipo", tipo: "arma", slot: "arma", descripcion: "", rareza: "basico", vendibleEnArmeria: false, precio: 1, ataqueBase: 10 },
  };
  const { calcularModificadoresEquipo: calcularEquipo } = require("../src/lib/estadisticasPersonaje.ts");
  assert.equal(
    calcularEquipo({ arma: armaSinTipo, manoSecundaria: null, casco: null, armadura: null, pantalones: null, botas: null, guantes: null, accesorio: null, anillo1: null, anillo2: null }, "arquero").ataque,
    7.5,
    "Un arma sin subtipo no debe eludir la penalización por falta de maestría",
  );
  assert.equal(stats.hpMaximo, 0, "El collar (+20) y el anillo maldito (-20) conservan sus estadísticas sin penalización de armadura");
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

  const habilidades = require("../src/lib/habilidades.ts");
  const catalogo = habilidades.HABILIDADES;
  assert.equal(catalogo.length, 301);
  assert.ok(catalogo.every((habilidad) => Boolean(habilidad.claseId)), "Todas las habilidades pertenecen a una profesión");
  for (const clase of Object.values(CLASES)) {
    // Super Novato es generalista: su catálogo se compone de habilidades heredadas
    // de Novato y de las cuatro clases de Tier 1, no de definiciones duplicadas.
    const propias = clase.id === "superNovato"
      ? habilidades.obtenerHabilidadesDisponiblesParaClase(clase.id)
      : catalogo.filter((habilidad) => habilidad.claseId === clase.id);
    assert.ok(propias.filter((habilidad) => habilidad.tipo === "activa").length >= 3, `${clase.id} necesita al menos 3 habilidades activas`);
    assert.ok(propias.filter((habilidad) => habilidad.tipo === "pasiva").length >= 2, `${clase.id} necesita al menos 2 habilidades pasivas`);
    assert.ok(propias.every((habilidad) => (habilidad.nivelJobRequerido ?? 1) <= clase.nivelJobMaximo), `Todas las habilidades de ${clase.id} deben estar disponibles antes de su máximo Job`);
  }
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

test("las habilidades heredadas usan el nivel y los puntos de su clase propietaria", () => {
  const { HABILIDADES } = require("../src/lib/habilidades.ts");
  const aguante = HABILIDADES.find((habilidad) => habilidad.id === "aguante_aprendiz");
  assert.ok(aguante);

  const progresos = [
    { claseId: "novato", nivelJob: 10, puntosHabilidadDisponibles: 1, desbloqueada: true },
    { claseId: "arquero", nivelJob: 6, puntosHabilidadDisponibles: 0, desbloqueada: true },
  ];
  const resultado = evaluarRequisitosAprendizaje(aguante, progresos);
  assert.equal(resultado.nivelJobClase, 10);
  assert.equal(resultado.puntosHabilidadDisponiblesClase, 1);
  assert.equal(resultado.puedeAprender, true, "Novato Job 10 cumple Aguante de aprendiz aunque Arquero esté en Job 6");

  const novatoSinNivel = evaluarRequisitosAprendizaje(aguante, [
    { ...progresos[0], nivelJob: 7, puntosHabilidadDisponibles: 20 },
    progresos[1],
  ]);
  assert.equal(novatoSinNivel.puedeAprender, false, "Los puntos de Arquero no sustituyen el Job requerido de Novato");

  const novatoSinPuntos = evaluarRequisitosAprendizaje(aguante, [
    { ...progresos[0], puntosHabilidadDisponibles: 0 },
    { ...progresos[1], puntosHabilidadDisponibles: 20 },
  ]);
  assert.equal(novatoSinPuntos.puedeAprender, false, "El coste se descuenta de los puntos de la clase propietaria");
});

test("las estadísticas derivadas permiten conservar fracciones durante la suma final", () => {
  const atributos = { fuerza: 1, agilidad: 1, vitalidad: 1, inteligencia: 1, destreza: 1, suerte: 1 };
  const entero = calcularEstadisticasDerivadasRpg(atributos);
  const exacto = calcularEstadisticasDerivadasRpg(atributos, 1, {}, false);

  assert.equal(entero.ataqueFisico, 5);
  assert.equal(exacto.ataqueFisico, 5.5);
  assert.equal(entero.defensaFisica, 1);
  assert.equal(exacto.defensaFisica, 1.75);
  assert.equal(entero.precision, 77);
  assert.equal(exacto.precision, 77.5);
});

test("el desglose de estadísticas conserva decimales y redondea una sola vez al total", () => {
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
  assert.equal(desglose.base.ataque, 5.5);
  assert.equal(desglose.total.ataque, 5);
  assert.equal(
    desglose.base.ataque -
      desglose.baseSinAtributos.ataque -
      desglose.atributos.fuerza.ataque -
      desglose.atributos.destreza.ataque,
    0,
    "La base conserva la fracción de destreza sin introducir un redondeo previo",
  );
});

test("forja: el coste de oro depende del tipo, la rareza y el nivel, no del precio comercial", () => {
  const comun = obtenerObjetoPorId("espada_hierro");
  const espadaAcero = obtenerObjetoPorId("espada_acero");
  const raro = obtenerObjetoPorId("espada_runa");

  assert.equal(calcularCosteMejoraObjeto(comun, 0), 90);
  assert.equal(calcularCosteMejoraObjeto(espadaAcero, 0), 90);
  assert.equal(calcularCosteMejoraObjeto(raro, 0), 166);
  assert.equal(calcularCosteMejoraObjeto({ ...raro, rareza: "epico" }, 0), 231);
  assert.equal(calcularCosteMejoraObjeto({ ...raro, rareza: "legendario" }, 0), 324);
  assert.equal(calcularCosteMejoraObjeto({ ...raro, rareza: "legendario" }, 1), 771);
  assert.equal(calcularCosteMejoraObjeto({ ...raro, precio: 1 }, 0), 166);
  assert.equal(calcularCosteMejoraObjeto({ ...raro, precio: 1_000_000 }, 0), 166);
  assert.ok(calcularCosteMejoraObjeto(raro, 1) > calcularCosteMejoraObjeto(raro, 0));
  assert.equal(calcularCosteMejoraObjeto(obtenerObjetoPorId("armadura_acero"), 0), 75);
  assert.equal(calcularCosteMejoraObjeto(obtenerObjetoPorId("escudo_madera"), 0), 45, "El escudo conserva su coste de mejora de categoría ligera sin considerarse armadura ligera para maestrías");
  assert.equal(calcularCosteMejoraObjeto({ tipo: "consumible", rareza: "comun" }, 0), 0);
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
    { madera: 0, piedra: 1, metal: 2 },
  );
  assert.deepEqual(
    calcularCosteRecursosMejora(obtenerObjetoPorId("escudo_madera"), 0),
    { madera: 2, piedra: 0, metal: 0 },
    "El subtipo escudo usa su propia receta de madera",
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

test("la regeneración de turno recupera 2 de Energía y el 10 % de Maná máximo, limitada al máximo", () => {
  const { calcularRegeneracionRecursosTurno } = require("../src/server/services/combate/accion-combate.ts");
  assert.deepEqual(calcularRegeneracionRecursosTurno(3, 2, 20, 100), { energiaActual: 5, manaActual: 12 });
  assert.deepEqual(calcularRegeneracionRecursosTurno(19, 98, 20, 100), { energiaActual: 20, manaActual: 100 });
  assert.deepEqual(calcularRegeneracionRecursosTurno(0, 0, 20, 10), { energiaActual: 2, manaActual: 1 });
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

test("habilidades: límites por tier, progresión de efectos y coste de reseteo", () => {
  const { obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");
  assert.equal(nivelMaximoHabilidad("novato"), 3);
  assert.equal(nivelMaximoHabilidad("espadachin"), 5);
  assert.equal(nivelMaximoHabilidad("caballero"), 10);
  assert.equal(nivelMaximoHabilidad("cruzado"), 10);
  assert.equal(costeReinicioHabilidades(10), 1000);
  assert.equal(costeReinicioHabilidades(1), 100);
  const basica = obtenerHabilidadPorId("golpe_apresurado");
  const nivel1 = ajustarHabilidadPorNivel(basica, 1);
  const nivel3 = ajustarHabilidadPorNivel(basica, 3);
  assert.equal(nivel1.multiplicadorDano, basica.multiplicadorDano);
  assert.ok(nivel3.multiplicadorDano > nivel1.multiplicadorDano);
  assert.ok(nivel3.cooldownTurnos < nivel1.cooldownTurnos);
  assert.equal(ajustarHabilidadPorNivel(basica, 99).cooldownTurnos, nivel3.cooldownTurnos);
  const avanzada = obtenerHabilidadPorId("descarga_elemental");
  const avanzadaN1 = ajustarHabilidadPorNivel(avanzada, 1);
  const avanzadaN10 = ajustarHabilidadPorNivel(avanzada, 10);
  assert.ok(avanzadaN10.multiplicadorDano > avanzadaN1.multiplicadorDano);
  assert.equal(avanzadaN10.costeMana, avanzadaN1.costeMana);
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

test("Tier 1 mantiene Job 40: Job 20 es intermedio y la maestría llega al máximo", () => {
  const { experienciaParaNivel } = require("../src/lib/configuracionJuego.ts");
  assert.deepEqual([1, 2, 3, 4].map(experienciaParaNivel), [500, 1778, 3733, 6320]);
  assert.equal(experienciaJobParaNivel(1), 101);
  assert.equal(experienciaJobParaNivel(10), 134);
  assert.equal(CLASES.espadachin.nivelJobMaximo, 40);

  const intermedio = aplicarExperienciaJob({
    nivelJob: 19, experienciaJob: 0, puntosHabilidadDisponibles: 0, maestriaCompletada: false,
  }, experienciaJobParaNivel(19), CLASES.espadachin.nivelJobMaximo);
  assert.equal(intermedio.nivelJob, 20);
  assert.equal(intermedio.maestriaCompletada, false);
  assert.equal(intermedio.experienciaNecesariaSiguienteNivel, experienciaJobParaNivel(20));

  const maestro = aplicarExperienciaJob(intermedio, 100_000, CLASES.espadachin.nivelJobMaximo);
  assert.equal(maestro.nivelJob, 40);
  assert.equal(maestro.maestriaCompletada, true);
  assert.equal(maestro.nivelesSubidos, 20);
  assert.equal(maestro.puntosHabilidadDisponibles, 21);
  assert.equal(maestro.experienciaJob, 0);
  assert.equal(maestro.experienciaNecesariaSiguienteNivel, null);
});

test("expediciones: cada duración ofrece todas las amenazas desbloqueadas desde 0", () => {
  const ahora = new Date("2026-10-12T12:00:00.000Z");
  const validarCobertura = (misiones, amenazaMaxima) => {
    const normales = misiones.filter((mision) => mision.tipo === "normal");
    const cantidadEsperada = MISIONES_POR_DURACION.length * (amenazaMaxima + 1);
    assert.equal(normales.length, cantidadEsperada);
    assert.equal(new Set(normales.map((mision) => mision.id)).size, normales.length, "Los identificadores deben ser únicos");

    const amenazasEsperadas = Array.from({ length: amenazaMaxima + 1 }, (_, amenaza) => amenaza);
    for (const configuracion of MISIONES_POR_DURACION) {
      const porDuracion = normales.filter(
        (mision) => mision.duracionObjetivoHoras === configuracion.horas
      );
      assert.equal(porDuracion.length, amenazaMaxima + 1, `Cantidad incorrecta para duración ${configuracion.horas}h`);
      assert.deepEqual(
        porDuracion.map((mision) => mision.dificultad).sort((a, b) => a - b),
        amenazasEsperadas,
        `La duración ${configuracion.horas}h debe incluir todas las amenazas de 0 a ${amenazaMaxima}`
      );
    }
    return normales;
  };

  const inicial = generarMisionesDisponibles({
    baseLat: 28,
    baseLng: -15,
    nivelPersonaje: 1,
    rangosAmenazaCompletados: [],
    ultimaMisionElite: null,
    ahora,
  });
  validarCobertura(inicial, 3);
  assert.equal(inicial.filter((mision) => mision.tipo === "elite").length, 1, "El boss diario también está disponible en el primer rango");

  // Subir de nivel Base no desbloquea por sí solo el rango siguiente.
  const rangoDosBloqueado = generarMisionesDisponibles({
    baseLat: 28,
    baseLng: -15,
    nivelPersonaje: 4,
    rangosAmenazaCompletados: [],
    ultimaMisionElite: null,
    ahora,
  });
  validarCobertura(rangoDosBloqueado, 3);

  // Con Base 4 y una victoria Normal en el rango I, se abre el rango II.
  const rangoDos = generarMisionesDisponibles({
    baseLat: 28,
    baseLng: -15,
    nivelPersonaje: 4,
    rangosAmenazaCompletados: ["I"],
    ultimaMisionElite: null,
    ahora,
  });
  validarCobertura(rangoDos, 6);
});
test("dificultad: los rangos exigen nivel Base y victoria Normal del rango anterior", () => {
  assert.equal(obtenerRangoMaximoDesbloqueado(4, []).id, "I");
  assert.equal(obtenerRangoMaximoDesbloqueado(4, ["I"]).id, "II");
  assert.equal(obtenerRangoMaximoDesbloqueado(7, ["I", "II"]).id, "III");
  assert.equal(obtenerRangoMaximoDesbloqueado(13, ["I", "II", "III", "IV"]).id, "V");
  assert.deepEqual(registrarVictoriaRangoNormal(["I"], 4), ["I", "II"]);
  assert.deepEqual(registrarVictoriaRangoNormal([], 0), [], "Amenaza 0 no debe acreditar una victoria de rango");
  assert.deepEqual(registrarVictoriaRangoNormal(["I"], 0), ["I"], "Amenaza 0 no debe desbloquear rangos nuevos");
  assert.deepEqual(RANGOS_AMENAZA.map((rango) => rango.id), ["I", "II", "III", "IV", "V"]);
});

test("enemigos: cualquier amenaza conserva candidatos desde difMin 0 hasta el máximo disponible", () => {
  const catalogo = ENEMIGOS.filter((enemigo) => enemigo.id !== "mimic");
  const nivelMaximoCatalogo = Math.max(
    ...catalogo.map((enemigo) => Math.max(0, enemigo.difMin))
  );
  for (const amenaza of [1, 5, 8, 17, 30]) {
    const normales = obtenerEnemigosPorDificultad(amenaza);
    assert.ok(normales.length > 0, `Debe haber candidatos en amenaza ${amenaza}`);
    assert.ok(normales.some((enemigo) => enemigo.difMin === 0), "difMin 0 debe seguir disponible");
    assert.ok(normales.every((enemigo) =>
      enemigo.difMin >= 0 && enemigo.difMin <= Math.min(amenaza, nivelMaximoCatalogo)
    ));
    assert.ok(!normales.some((enemigo) => enemigo.id === "mimic"), "El Mímico se sortea aparte");
  }
  assert.ok(obtenerEnemigosPorDificultad(17).length > 0);
});

test("selección: cada nivel difMin tiene tres veces el peso del anterior", () => {
  assert.equal(calcularPesoDifMinEnemigo(8) / calcularPesoDifMinEnemigo(7), 3);
  assert.equal(calcularPesoDifMinEnemigo(7) / calcularPesoDifMinEnemigo(6), 3);
  assert.equal(calcularPesoDifMinEnemigo(1) / calcularPesoDifMinEnemigo(0), 3);
  assert.ok(calcularPesoDifMinEnemigo(0) > 0);
});

test("selección: la rareza común pesa más que poco común, raro, épico y legendario", () => {
  const pesos = ["comun", "poco_comun", "raro", "epico", "legendario"].map(calcularPesoRarezaEnemigo);
  assert.deepEqual(pesos, [70, 50, 35, 20, 1]);
  assert.ok(pesos.every((peso, indice) => indice === 0 || pesos[indice - 1] > peso));
});

test("selección: el Mímico tiene un 1% independiente del nivel de amenaza", () => {
  assert.equal(PROBABILIDAD_ENCUENTRO_MIMICO, 0.01);
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.009;
    assert.equal(seleccionarEnemigoNormal(1).id, "mimic");
    assert.equal(seleccionarEnemigoNormal(30).id, "mimic");
  } finally {
    Math.random = originalRandom;
  }
});

test("selección: amenaza 8 favorece difMin 8 sin eliminar difMin 0", () => {
  const originalRandom = Math.random;
  const elegirConSecuencia = (secuencia) => {
    let indice = 0;
    Math.random = () => secuencia[indice++] ?? 0.5;
    return seleccionarEnemigoNormal(8);
  };
  try {
    const enemigoBajo = elegirConSecuencia([0.5, 0.0000001, 0.1, 0.1]);
    const enemigoAlto = elegirConSecuencia([0.5, 0.99, 0.1, 0.1]);
    assert.equal(enemigoBajo.difMin, 0);
    assert.equal(enemigoAlto.difMin, 8);
  } finally {
    Math.random = originalRandom;
  }
});

test("selección: dentro de difMin 3, común aparece con más peso que poco común", () => {
  const originalRandom = Math.random;
  const elegirConRareza = (tiradaRareza) => {
    const secuencia = [0.5, 0.9, tiradaRareza, 0.5];
    let indice = 0;
    Math.random = () => secuencia[indice++] ?? 0.5;
    return seleccionarEnemigoNormal(3);
  };
  try {
    assert.equal(elegirConRareza(0.2).rareza, "comun");
    assert.equal(elegirConRareza(0.9).rareza, "poco_comun");
  } finally {
    Math.random = originalRandom;
  }
});

test("oro enemigo escala con amenaza de misión y mantiene un límite económico", () => {
  assert.equal(calcularOroEnemigo(500, 0), 500);
  assert.equal(calcularOroEnemigo(500, 5), 550);
  assert.equal(calcularOroEnemigo(500, 10), 600);
  assert.equal(calcularOroEnemigo(500, 30), 750);
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

test("dificultad: amenaza escala un 30% por nivel desde cero y después aplica el modo", () => {
  const base = calcularMultiplicadoresEnemigo(0, "normal");
  const facil = calcularMultiplicadoresEnemigo(0, "facil");
  const dificil = calcularMultiplicadoresEnemigo(0, "dificil");
  assert.deepEqual(base, { vida: 1, ataque: 1, defensa: 1 });
  assert.deepEqual(facil, { vida: 0.8, ataque: 0.85, defensa: 0.9 });
  assert.deepEqual(dificil, { vida: 1.25, ataque: 1.15, defensa: 1.1 });

  assert.deepEqual(calcularMultiplicadoresEnemigo(6, "normal"), { vida: 2.8, ataque: 2.8, defensa: 2.8 });
  assert.deepEqual(calcularMultiplicadoresEnemigo(9, "normal"), { vida: 3.7, ataque: 3.7, defensa: 3.7 });
  const dificilAmenaza6 = calcularMultiplicadoresEnemigo(6, "dificil");
  assert.equal(dificilAmenaza6.vida, 3.5);
  assert.ok(Math.abs(dificilAmenaza6.ataque - 3.22) < 1e-12);
  assert.ok(Math.abs(dificilAmenaza6.defensa - 3.08) < 1e-12);
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


test("la lista de profesiones incluye la clase activa y las ramas desbloqueadas o alcanzables", () => {
  const novato1 = obtenerClasesVisibles("novato", [
    { claseId: "novato", nivelJob: 1, desbloqueada: true },
  ]);
  assert.deepEqual(novato1.map((clase) => clase.id), ["novato"]);

  const novato10 = obtenerClasesVisibles("novato", [
    { claseId: "novato", nivelJob: 10, desbloqueada: true },
  ]);
  assert.deepEqual(novato10.map((clase) => clase.id).sort(), ["acolito", "arquero", "espadachin", "mago", "novato"]);

  const mago20 = obtenerClasesVisibles("mago", [
    { claseId: "novato", nivelJob: 10, desbloqueada: true },
    { claseId: "mago", nivelJob: 20, desbloqueada: true },
  ]).map((clase) => clase.id);
  for (const id of ["acolito", "arquero", "espadachin", "mago", "elementalista", "brujo"]) assert.ok(mago20.includes(id));
  assert.ok(!mago20.includes("cruzado"), "Una clase híbrida no debe mostrarse hasta cumplir los dos requisitos");
});

test("los atributos crecen por nivel Base y reciben bonificaciones Job según el arquetipo", () => {
  const novato = calcularAtributosClase("novato", 20, 1);
  const espadachin = calcularAtributosClase("espadachin", 20, 1);
  const mago = calcularAtributosClase("mago", 20, 1);
  const espadachinJobMax = calcularAtributosClase("espadachin", 20, CLASES.espadachin.nivelJobMaximo);
  const magoBase40 = calcularAtributosClase("mago", 40, 1);
  assert.ok(espadachin.fuerza > espadachin.inteligencia);
  assert.ok(mago.inteligencia > mago.fuerza);
  assert.notDeepEqual(novato, espadachin);
  assert.ok(espadachinJobMax.fuerza > espadachin.fuerza);
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

  const casco = obtenerObjetoPorId("casco_cuero");
  const rutaCasco = obtenerSpriteObjeto(casco);
  assert.equal(rutaCasco, "/sprites/items/armors/casco/casco_cuero.png");
  assert.ok(
    fs.existsSync(path.join(__dirname, "..", "public", rutaCasco.slice(1))),
    `Falta el sprite organizado de casco_cuero: ${rutaCasco}`,
  );
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
  assert.equal(magoEquipado.manaMaximo, baseMago.manaMaximo + 100);

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


test("la ficha de habilidad compara valores actuales con la siguiente mejora", () => {
  const { obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");
  const { compararMejoraHabilidad } = require("../src/lib/descripcionesHabilidades.ts");
  const definicion = obtenerHabilidadPorId("guardia_improvisada");
  const actual = ajustarHabilidadPorNivel(definicion, 2);
  const siguiente = ajustarHabilidadPorNivel(definicion, 3);
  const cambios = compararMejoraHabilidad(actual, siguiente);

  assert.ok(cambios.some((cambio) => cambio.etiqueta === "Defensa aumentada"));
  assert.ok(cambios.some((cambio) => cambio.etiqueta === "Duración" && cambio.valorActual.includes("4 turnos") && cambio.valorSiguiente.includes("5 turnos")));
  assert.ok(cambios.some((cambio) => cambio.etiqueta === "Reutilización" && cambio.valorActual.includes("4 turnos") && cambio.valorSiguiente.includes("3 turnos")));
});
