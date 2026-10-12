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
const { calcularAtributosClase } = require("../src/lib/progresion/atributos-clase.ts");
const { mapearBonificacionesEquipoRpg } = require("../src/lib/progresion/bonificaciones-equipo.ts");
const { aplicarExperienciaJob } = require("../src/lib/progresion/experiencia.ts");
const { obtenerHabilidadesEnVenta } = require("../src/lib/tiendaHabilidades.ts");

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

  const genericas = cruzado.filter((habilidadId) => [
    "golpe_poderoso",
    "golpe_preciso",
    "defensa_ferrea",
    "curacion",
    "segundo_aire",
    "ataque_devastador",
    "piel_dura",
    "veterano",
    "precision",
    "corredor",
    "vitalidad",
    "sed_de_batalla",
  ].includes(habilidadId));
  assert.ok(genericas.length <= 4, "Las ofertas genéricas siguen rotando a diario");
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

  assert.equal(resultado.nivelJob, 3);
  assert.equal(resultado.nivelesSubidos, 2);
  assert.equal(resultado.puntosHabilidadDisponibles, 2);
  assert.equal(resultado.experienciaJob, 36);
  assert.equal(resultado.maestriaCompletada, false);
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
