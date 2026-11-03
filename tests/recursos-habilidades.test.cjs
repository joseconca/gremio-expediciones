require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { HABILIDADES, obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");
const { CLASES, obtenerAncestrosClase } = require("../src/lib/progresion/clases.ts");
const { calcularAtributosClase } = require("../src/lib/progresion/atributos-clase.ts");
const { calcularEstadisticasDerivadasRpg } = require("../src/lib/progresion/estadisticas.ts");
const { ajustarHabilidadPorNivel, nivelMaximoHabilidad } = require("../src/lib/progresion/niveles-habilidad.ts");
const { simularRotacion } = require("../scripts/auditar-recursos-habilidades.cjs");

const maxima = (id) => {
  const h = obtenerHabilidadPorId(id);
  return ajustarHabilidadPorNivel(h, nivelMaximoHabilidad(h.claseId));
};

test("todas las activas pueden pagarse al aprenderlas, sin equipo ni pasivas obligatorias", () => {
  for (const h of HABILIDADES.filter((h) => h.tipo === "activa")) {
    const stats = calcularEstadisticasDerivadasRpg(calcularAtributosClase(h.claseId, 1, h.nivelJobRequerido ?? 1), 1);
    for (const coste of [h.costeEnergia ?? 0, h.costeMana ?? 0]) assert.ok(Number.isInteger(coste) && coste >= 0, h.id);
    assert.ok((h.costeEnergia ?? 0) <= stats.energiaMaxima, h.id);
    assert.ok((h.costeMana ?? 0) <= stats.manaMaximo, h.id);
    assert.ok((h.costeEnergia ?? 0) + (h.costeMana ?? 0) > 0 || (h.recuperarEnergia ?? 0) > 0, h.id);
    const mejorada = maxima(h.id);
    assert.equal(mejorada.costeEnergia, h.costeEnergia, h.id);
    assert.equal(mejorada.costeMana, h.costeMana, h.id);
  }
});

test("las técnicas híbridas ofensivas superan la regeneración de al menos uno de sus recursos", () => {
  for (const h of HABILIDADES.filter((h) => h.efecto === "dano" && h.costeEnergia > 0 && h.costeMana > 0)) {
    const stats = calcularEstadisticasDerivadasRpg(calcularAtributosClase(h.claseId, 20, CLASES[h.claseId].nivelJobMaximo), 20);
    assert.ok(h.costeEnergia - (h.recuperarEnergia ?? 0) > stats.regeneracionEnergiaPorTurno || h.costeMana > stats.regeneracionManaPorTurno, h.id);
  }
});

test("las áreas y el apoyo de grupo no tienen el precio de sus técnicas individuales", () => {
  for (const clase of ["runista", "abjurador", "alquimista"]) {
    assert.ok(obtenerHabilidadPorId(`${clase}_avanzada`).costeMana > obtenerHabilidadPorId(`${clase}_ataque`).costeMana);
  }
  assert.ok(obtenerHabilidadPorId("bardo_tactica").costeMana > obtenerHabilidadPorId("bardo_ataque").costeMana);
  assert.ok(obtenerHabilidadPorId("arconte_tactica").costeMana > obtenerHabilidadPorId("inquisidor_tactica").costeMana);
});

test("las dos recuperaciones gratuitas heredables conservan un intervalo mínimo de cuatro ciclos", () => {
  for (const id of ["respiracion_interior", "respiracion_del_vacio"]) {
    const h = maxima(id);
    assert.ok(h.cooldownTurnos >= 4, id);
    assert.ok(h.recuperarEnergia <= 50, id);
  }
  const h = maxima("purificacion");
  assert.ok(h.cooldownTurnos >= 2);
});

test("las pasivas condicionales tienen rango único y solo Mago conserva una reserva plana", () => {
  const h = obtenerHabilidadPorId("eco_maldito");
  assert.equal(nivelMaximoHabilidad(h.claseId,h),1);
  assert.equal(h.bonusRegeneracionMana,undefined);
  assert.ok(h.reglaPasiva);
  assert.deepEqual(HABILIDADES.filter(h=>h.bonusManaMaximo).map(h=>h.id),["reserva_arcana"]);
  assert.equal(maxima("reserva_arcana").bonusManaMaximo, 25);
});

test("el Archimago debe reducir la frecuencia de sus técnicas caras cuando agota su reserva", () => {
  const rama = ["archimago", ...obtenerAncestrosClase("archimago")];
  const progresos = rama.map((claseId) => ({ claseId, nivelJob: CLASES[claseId].nivelJobMaximo }));
  const stats = calcularEstadisticasDerivadasRpg(calcularAtributosClase("archimago", 50, 80, progresos), 50);
  const habilidades = ["lanza_arcana", "explosion_elemental", "cataclismo"].map(maxima);
  const primeros = simularRotacion(habilidades, stats, 30);
  const largos = simularRotacion(habilidades, stats, 60);
  assert.ok(largos.usos[2] - primeros.usos[2] < primeros.usos[2]);
  assert.ok(largos.costeMana > stats.manaMaximo);
  assert.ok(largos.mana >= 0);
});

test("Ninja y Hoja del velo conservan técnicas propias utilizables con su reserva pequeña de maná", () => {
  for (const clase of ["ninja", "hoja_velo", "cazador_espectral", "danzaespadas"]) {
    const propias = HABILIDADES.filter((h) => h.claseId === clase && h.tipo === "activa");
    assert.ok(propias.every((h) => h.costeMana <= 7), clase);
    assert.ok(propias.every((h) => h.costeEnergia >= 25), clase);
  }
});

test("las técnicas sencillas avanzadas no pagan más por una potencia heredada igual o mayor", () => {
  const esfera = maxima("esfera_invocada"), chispa = maxima("chispa_mago");
  assert.ok(esfera.multiplicadorDano < chispa.multiplicadorDano);
  assert.ok(esfera.costeMana > chispa.costeMana,"la invocación añade un acompañante a su impacto");
  assert.ok(esfera.disenoActiva.operaciones.some(o=>o.tipo==="invocar"&&o.manual));
  const maestro = maxima("puño_del_maestro"), monje = maxima("puno_ascendente");
  assert.ok(maestro.multiplicadorDano > monje.multiplicadorDano);
  assert.ok(maestro.costeEnergia < monje.costeEnergia);
  assert.equal(maestro.cooldownTurnos, monje.cooldownTurnos);
});

const personajeRecursos = () => ({
  id: "personaje-prueba",
  clase: "Novato",
  profesionActivaId: "novato",
  nivel: 1,
  fuerza: 0,
  agilidad: 0,
  vitalidad: 0,
  inteligencia: 0,
  destreza: 0,
  suerte: 0,
  velocidadMejoras: 0,
  capacidadCarruajeMejoras: 0,
  energiaActual: 45,
  manaActual: 8,
  progresosClase: [{ claseId: "novato", nivelJob: 1, desbloqueada: true }],
  habilidades: [],
  equipoEquipado: null,
});

test("habilidades v2 cobran y recuperan recursos en una actualización versionada por valores", async () => {
  const { gastarRecursosHabilidad } = require("../src/server/services/combate/accion-combate.ts");
  const consultas = [];
  const escrituras = [];
  const tx = {
    personaje: {
      findUnique: async (args) => {
        consultas.push(args);
        return personajeRecursos();
      },
      updateMany: async (args) => {
        escrituras.push(args);
        return { count: 1 };
      },
    },
  };

  await gastarRecursosHabilidad(
    tx,
    "personaje-prueba",
    { id: "habilidad-prueba", versionReglas: 2, costeEnergia: 9, costeMana: 3, recuperarEnergia: 4 },
    { energia: 0, mana: 2 }
  );
  assert.equal(consultas.length, 1);
  assert.equal(escrituras.length, 1);
  assert.deepEqual(escrituras[0].where, {
    id: "personaje-prueba", energiaActual: 45, manaActual: 8,
  });
  assert.equal(escrituras[0].data.energiaActual, 40);
  assert.equal(escrituras[0].data.manaActual, 7);
});

test("habilidades v2 rechazan recurso insuficiente y una escritura concurrente", async () => {
  const { gastarRecursosHabilidad } = require("../src/server/services/combate/accion-combate.ts");
  let escrituras = 0;
  const tx = {
    personaje: {
      findUnique: async () => personajeRecursos(),
      updateMany: async () => {
        escrituras++;
        return { count: 0 };
      },
    },
  };
  await assert.rejects(
    gastarRecursosHabilidad(tx, "personaje-prueba", {
      id: "habilidad-cara", versionReglas: 2, costeEnergia: 9999, costeMana: 0,
    }),
    /RECURSO_HABILIDAD_INSUFICIENTE/
  );
  assert.equal(escrituras, 0);
  await assert.rejects(
    gastarRecursosHabilidad(tx, "personaje-prueba", {
      id: "habilidad-barata", versionReglas: 2, costeEnergia: 3, costeMana: 1,
    }),
    /RECURSO_COMBATE_MODIFICADO/
  );
  assert.equal(escrituras, 1);
});

test("habilidades antiguas conservan el descuento condicional sin consultar estadísticas", async () => {
  const { gastarRecursosHabilidad } = require("../src/server/services/combate/accion-combate.ts");
  const escrituras = [];
  const tx = {
    personaje: {
      findUnique: async () => { throw new Error("No debe consultar estadísticas"); },
      updateMany: async (args) => {
        escrituras.push(args);
        return { count: 1 };
      },
    },
  };
  await gastarRecursosHabilidad(tx, "personaje-prueba", {
    id: "ataque-antiguo", costeEnergia: 6, costeMana: 0,
  });
  assert.deepEqual(escrituras, [{
    where: { id: "personaje-prueba", energiaActual: { gte: 6 } },
    data: { energiaActual: { decrement: 6 } },
  }]);
});
