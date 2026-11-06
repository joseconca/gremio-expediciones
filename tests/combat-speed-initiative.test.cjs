require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  crearSecuenciaTurnosVelocidad,
  avanzarSecuenciaTurnosVelocidad,
} = require("../src/lib/expediciones/combate/iniciativa-combate.ts");
const { resolverAtaqueEnemigo } = require("../src/lib/expediciones/combate/ataques-basicos.ts");

test("cada actor vuelve a actuar tras una espera inversa a su velocidad", () => {
  const actores = [
    { actorId: "lento", equipo: "jugador", velocidad: 10 },
    { actorId: "rapido", equipo: "enemigo", velocidad: 100 },
  ];
  let cola = crearSecuenciaTurnosVelocidad(actores, "diferencia-grande");
  assert.equal(cola[0].actorId, "rapido");
  assert.equal(cola.length, 2);
  const turnos = [];
  for (let ronda = 1; ronda <= 12; ronda++) {
    cola = avanzarSecuenciaTurnosVelocidad({ turnosPendientes: cola, actoresVivos: actores, ronda, semilla: "combate" }).turnosPendientes;
    turnos.push(cola[0].actorId);
    assert.equal(cola.length, 2);
  }
  assert.equal(turnos[0], "lento");
  assert.ok(turnos.slice(1, 11).every(id => id === "rapido"));
  assert.equal(turnos[11], "lento");
});

test("un cambio de velocidad reajusta la espera pendiente del actor", () => {
  const actores = [
    { actorId: "a", equipo: "jugador", velocidad: 20 },
    { actorId: "b", equipo: "enemigo", velocidad: 60 },
  ];
  const avance = avanzarSecuenciaTurnosVelocidad({
    turnosPendientes: [
      { ...actores[0], instante: 0.1 },
      { ...actores[1], velocidad: 10, instante: 0.2 },
    ],
    actoresVivos: actores,
    ronda: 4,
    semilla: "cambio",
  });
  assert.equal(avance.turnoActual.actorId, "b");
  assert.ok(Math.abs(avance.turnoActual.instante - (0.1 + 0.1 / 6)) < 1e-9);
});

test("los empates son reproducibles con la misma semilla y pueden cambiar con otra", () => {
  const actores = [
    { actorId: "uno", equipo: "jugador", velocidad: 10 },
    { actorId: "dos", equipo: "enemigo", velocidad: 10 },
    { actorId: "tres", equipo: "jugador", velocidad: 10 },
  ];
  const primera = crearSecuenciaTurnosVelocidad(actores, "misma-semilla");
  const repetida = crearSecuenciaTurnosVelocidad(actores, "misma-semilla");
  const otraSemilla = crearSecuenciaTurnosVelocidad(actores, "otra-semilla");

  assert.deepEqual(repetida, primera);
  assert.notDeepEqual(otraSemilla, primera);
  assert.deepEqual(primera.map((paso) => paso.actorId).sort(), ["dos", "tres", "uno"]);
});

test("al avanzar se saltan las acciones pendientes de actores caídos", () => {
  const secuencia = crearSecuenciaTurnosVelocidad([
    { actorId: "A", equipo: "jugador", velocidad: 10 },
    { actorId: "B", equipo: "jugador", velocidad: 15 },
    { actorId: "C", equipo: "enemigo", velocidad: 30 },
  ], "caidos");
  assert.equal(secuencia[0].actorId, "C");

  const siguiente = avanzarSecuenciaTurnosVelocidad({
    turnosPendientes: secuencia,
    actoresVivos: [
      { actorId: "A", equipo: "jugador", velocidad: 10 },
      { actorId: "B", equipo: "jugador", velocidad: 15 },
    ],
    ronda: 1,
    semilla: "caidos",
  });

  assert.equal(siguiente.turnoActual.actorId, "B");
  assert.deepEqual(siguiente.turnosPendientes.map((paso) => paso.actorId), ["B", "A"]);
  assert.equal(siguiente.ronda, 2);
});

test("migra una cola antigua y conserva el siguiente actor elegible", () => {
  const siguiente = avanzarSecuenciaTurnosVelocidad({
    turnosPendientes: [{ actorId: "C", equipo: "enemigo" }],
    actoresVivos: [{ actorId: "jugador", equipo: "jugador", velocidad: 20 }],
    ronda: 7,
    semilla: "reinicio",
  });
  assert.equal(siguiente.ronda, 8);
  assert.equal(siguiente.turnoActual.actorId, "jugador");
  assert.deepEqual(siguiente.turnosPendientes.map((paso) => paso.actorId), ["jugador"]);
});

test("PvE y party consumen la cola persistida y procesan un enemigo por acción", () => {
  const leer = (archivo) => fs.readFileSync(path.resolve(__dirname, archivo), "utf8");
  const pve = leer("../src/server/services/combate/pve.ts");
  const party = leer("../src/server/services/party/turno-enemigo.ts");
  const iniciarPve = leer("../src/server/services/expediciones/llegar-expedicion.ts");
  const iniciarParty = leer("../src/server/services/party/combate-party-service.ts");
  const esquema = leer("../prisma/schema.prisma");
  const migracion = leer("../prisma/migrations/20261018170000_iniciativa_por_velocidad/migration.sql");

  assert.match(pve, /turnoEnemigoActual\.actorId/);
  assert.match(pve, /turnosPendientes: avanceTurnos\.turnosPendientes/);
  assert.match(party, /turnoEnemigoActual\.actorId/);
  assert.match(party, /turnosPendientes: turnosPendientes/);
  assert.match(iniciarPve, /turnosPendientes: turnosPendientes/);
  assert.match(iniciarParty, /turnosPendientes: turnosPendientes/);
  assert.match(esquema, /model CombateActivo[\s\S]*?turnosPendientes\s+Json/);
  assert.match(esquema, /model CombateParty[\s\S]*?turnosPendientes\s+Json/);
  assert.match(migracion, /ALTER TABLE "CombateActivo"[\s\S]*?"turnosPendientes"/);
  assert.match(migracion, /ALTER TABLE "CombateParty"[\s\S]*?"turnosPendientes"/);
});

test("PvE registra cada ataque enemigo una sola vez y resuelve la victoria antes de avanzar la cola", () => {
  const pve = fs.readFileSync(path.resolve(__dirname, "../src/server/services/combate/pve.ts"), "utf8");
  assert.doesNotMatch(pve, /log\\.push\\(accionDelEnemigo\\.texto\\)/);

  const indiceVictoria = pve.indexOf("if (enemigoHp <= 0)");
  const indiceAvanceCola = pve.indexOf("const avanceTurnos = avanzarSecuenciaTurnosVelocidad");
  assert.ok(indiceVictoria >= 0, "debe comprobar la derrota de todos los enemigos");
  assert.ok(indiceAvanceCola > indiceVictoria, "la victoria se resuelve antes de consumir otra acción");
  const bloqueVictoria = pve.slice(indiceVictoria, indiceAvanceCola);
  assert.match(bloqueVictoria, /fase: "victoria"/);
  assert.match(bloqueVictoria, /terminado: true/);
});

test("un ataque enemigo fallido se registra como fallo de ataque, no como esquiva del enemigo", () => {
  const randomOriginal = Math.random;
  const valores = [0.5, 0.99];
  Math.random = () => valores.shift() ?? 0.99;

  try {
    const accion = resolverAtaqueEnemigo({
      enemigoAtaque: 20,
      enemigoPrecision: 1,
      jugadorEvasion: 0.6,
      jugadorDefensa: 0,
      enemigoNombre: "Bandido Arbalestero",
    });

    assert.equal(accion.tipo, "fallo");
    assert.match(accion.texto, /Bandido Arbalestero falla su ataque/);
    assert.doesNotMatch(accion.texto, /Bandido Arbalestero esquiva el ataque/);
  } finally {
    Math.random = randomOriginal;
  }
});

test("Furia al límite sigue las dos pendientes y alcanza su bonificación máxima", () => {
  const { multiplicadorFuria } = require("../src/lib/expediciones/combate/rasgos-clase.ts");
  assert.deepEqual([100, 75, 50, 25, 0].map(hp => multiplicadorFuria(hp, 100)), [1, 1.25, 1.5, 2.25, 3]);
});

test("Fisura arcana elige la mayor penetración y Flecha de seguimiento conserva el sobrante", () => {
  const { penetrarResistenciaMagica, contarFlechasExtra } = require("../src/lib/expediciones/combate/rasgos-clase.ts");
  assert.equal(penetrarResistenciaMagica(60, 10), 50);
  assert.equal(penetrarResistenciaMagica(200, 10), 180);
  assert.equal(penetrarResistenciaMagica(200, 100), 0);

  const original = Math.random;
  try {
    Math.random = () => 0.19;
    assert.equal(contarFlechasExtra(60), 2);
    Math.random = () => 0.2;
    assert.equal(contarFlechasExtra(60), 1);
    assert.equal(contarFlechasExtra(100), 2);
  } finally {
    Math.random = original;
  }
});

test("Ascensión dorada suma cargas al alternar y pierde una al repetir rama", () => {
  const { actualizarRachaSuperNovato, ajustarVidaAscension, multiplicadorAscension } = require("../src/lib/expediciones/combate/rasgos-clase.ts");
  const efectos = [];
  for (const claseId of ["mago", "arquero", "mago"]) {
    actualizarRachaSuperNovato("superNovato", efectos, { claseId });
  }
  assert.equal(multiplicadorAscension(efectos), 1.4);
  assert.deepEqual(ajustarVidaAscension(efectos, 50, 100), { hp: 70, maximo: 140 });
  actualizarRachaSuperNovato("superNovato", efectos, { claseId: "mago" });
  assert.equal(multiplicadorAscension(efectos), 1.2);
  assert.deepEqual(ajustarVidaAscension(efectos, 70, 140), { hp: 60, maximo: 120 });
});

test("Amparo absorbe daño por puntos y Respuesta de acero se rearma sólo con el turno propio", () => {
  const { aplicarAmparo, activarContraataque, limitarGolpeLetal } = require("../src/lib/expediciones/combate/rasgos-clase.ts");
  const { aplicarBarreraAccion, comenzarTurnoCombatiente } = require("../src/lib/expediciones/combate/estados-combate.ts");
  const acolito = [];
  const aliado = [];
  aplicarAmparo("acolito", 100, 40, 100, { curacion: 15, texto: "" }, acolito, aliado);
  const golpe = { dano: 7, texto: "", critico: false };
  aplicarBarreraAccion(golpe, aliado);
  assert.equal(golpe.dano, 0);
  assert.equal(aliado[0].valor, 3);

  const efectos = [];
  const esquiva = { esquivado: true };
  assert.equal(activarContraataque("espadachin", esquiva, efectos), true);
  assert.equal(activarContraataque("espadachin", esquiva, efectos), false);
  const turnoPropio = comenzarTurnoCombatiente(efectos, 10, 10, 5, "Espadachín");
  assert.equal(activarContraataque("espadachin", esquiva, turnoPropio.efectos), true);
  const novato = [];
  const letal = { dano: 10, texto: "" };
  limitarGolpeLetal("novato", 10, novato, letal);
  assert.equal(letal.dano, 9);
  const segundo = { dano: 10, texto: "" };
  limitarGolpeLetal("novato", 1, novato, segundo);
  assert.equal(segundo.dano, 10);
});

test("Al abordaje exige alternar dos golpes efectivos en turnos propios consecutivos", () => {
  const { cerrarAccionHibrida, oroAbordaje } = require("../src/lib/expediciones/combate/rasgos-hibridos.ts");
  assert.deepEqual([0, 9, 10, 19, 20, 100].map(oroAbordaje), [5, 5, 10, 10, 15, 55]);
  const { comenzarTurnoCombatiente } = require("../src/lib/expediciones/combate/estados-combate.ts");
  const avanzar = efectos => comenzarTurnoCombatiente(efectos, 100, 100, 10, "Pirata").efectos;
  let efectos = [];
  const golpe = { dano: 15, texto: "" };
  assert.equal(cerrarAccionHibrida("pirata", null, true, golpe, efectos), 0);
  efectos = avanzar(efectos);
  assert.equal(cerrarAccionHibrida("pirata", { efecto: "dano" }, false, golpe, efectos), 8);
  efectos = avanzar(efectos);
  assert.equal(cerrarAccionHibrida("pirata", null, true, { dano: 0, texto: "" }, efectos), 0);
  efectos = avanzar(efectos);
  assert.equal(cerrarAccionHibrida("pirata", { efecto: "dano" }, false, golpe, efectos), 0);
});

test("Paso velado, A mi señal y Temple de campaña consumen sus cargas en relojes distintos", () => {
  const {
    cerrarAccionHibrida, multiplicadorOrden, prepararAtaqueHibrido, registrarEsquivaHibrida, resolverApoyoHibrido,
  } = require("../src/lib/expediciones/combate/rasgos-hibridos.ts");
  const { multiplicadorDefensaRasgo } = require("../src/lib/expediciones/combate/rasgos-clase.ts");
  const { comenzarTurnoCombatiente } = require("../src/lib/expediciones/combate/estados-combate.ts");
  const refuerzo = { efecto: "bonus_defensa" };
  const ataque = { efecto: "dano", multiplicadorDano: 1 };
  const herrero = [];
  const ninja = [];
  registrarEsquivaHibrida("ninja", { esquivado: true }, ninja);
  resolverApoyoHibrido("herrero", refuerzo, herrero, ninja);
  resolverApoyoHibrido("heraldo_guerra", refuerzo, [], ninja);
  assert.equal(multiplicadorDefensaRasgo("herrero", 100, 100, herrero), 1.25);
  const comienzo = comenzarTurnoCombatiente(herrero, 100, 100, 10, "Herrero");
  assert.equal(multiplicadorDefensaRasgo("herrero", 100, 100, comienzo.efectos), 1);
  const contexto = { claseId: "ninja", efectosActor: ninja, objetivoAliado: false };
  assert.deepEqual(prepararAtaqueHibrido(ataque, contexto), { ...ataque, multiplicadorDano: 1.2, rupturaDefensaTemporal: 0.25 });
  cerrarAccionHibrida("ninja", null, true, { dano: 10, texto: "" }, ninja);
  assert.equal(multiplicadorOrden(ninja), 1);
  assert.equal(prepararAtaqueHibrido(ataque, contexto).rupturaDefensaTemporal, 0.25);
  cerrarAccionHibrida("ninja", ataque, false, { dano: 10, texto: "" }, ninja);
  assert.equal(prepararAtaqueHibrido(ataque, contexto), ataque);
});

test("Mal augurio adelanta una herida propia una sola vez y gasta un pulso", () => {
  const { resolverImpactoHibrido } = require("../src/lib/expediciones/combate/rasgos-hibridos.ts");
  const herida = { id: "herida-1", creadorId: "chaman", familia: "herida", valor: 8, restantes: 2 };
  const previo = [{ datosTacticos: { estados: [herida] } }];
  const actual = structuredClone(previo);
  const propios = [];
  const golpe = { dano: 10, texto: "" };
  resolverImpactoHibrido("chaman", "chaman", "hacha", null, propios, previo, actual, 100, 20, 5, golpe);
  assert.equal(golpe.dano, 22);
  assert.equal(actual[0].datosTacticos.estados[0].restantes, 1);
  assert.equal(previo[0].datosTacticos.estados[0].restantes, 2);
  const repetido = { dano: 10, texto: "" };
  resolverImpactoHibrido("chaman", "chaman", "hacha", null, propios, previo, actual, 100, 20, 5, repetido);
  assert.equal(repetido.dano, 10);
});

test("Reactivo detona al repetirse, usa los PV máximos y salpica a todos los adyacentes", () => {
  const { MARCA_REACTIVO, resolverImpactosHibridosRoster, instantaneaHostilHibrida } =
    require("../src/lib/expediciones/combate/rasgos-hibridos.ts");
  const principal = { id: "e1", casilla: 4, columna: 1, hp: 70, hpMaximo: 200, defensa: 5, efectos: [] };
  const lejos = { id: "e2", casilla: 0, columna: 0, hp: 40, efectos: [] };
  const derecha = { id: "e3", casilla: 5, columna: 2, hp: 40, efectos: [] };
  const arriba = { id: "e4", casilla: 1, columna: 1, hp: 40, efectos: [] };
  const enemigos = [principal, lejos, derecha, arriba];
  const impactar = () => {
    const danos = new Map([["e1", 10]]);
    const estados = new Map([["e1", { defensa: 5, efectos: structuredClone(principal.efectos) }]]);
    const accion = { enemigoObjetivoId: "e1", dano: 10, texto: "", critico: false };
    resolverImpactosHibridosRoster("alquimista", "u1", "baston", { claseId: "alquimista", efecto: "dano" },
      [], 20, enemigos, instantaneaHostilHibrida("alquimista", enemigos), danos, estados, accion);
    principal.efectos = estados.get("e1").efectos;
    return { danos, accion };
  };
  assert.deepEqual([...impactar().danos], [["e1", 10]]);
  assert.equal(principal.efectos[0].habilidadId, MARCA_REACTIVO);
  const segundo = impactar();
  assert.deepEqual([...segundo.danos], [["e1", 40], ["e3", 9], ["e4", 9]]);
  assert.equal(segundo.accion.dano, 58);
  assert.equal(principal.efectos.length, 0);
});

test("el Chamán puede adelantar el sangrado de una técnica heredada", () => {
  const { resolverImpactoHibrido } = require("../src/lib/expediciones/combate/rasgos-hibridos.ts");
  const previos = [{ tipo: "dano_progresivo", habilidadId: "berserker_ataque", creadorId: "u1", valor: 7, turnosRestantes: 1 }];
  const actuales = structuredClone(previos);
  const ataque = { dano: 8, texto: "" };
  resolverImpactoHibrido("chaman", "u1", "hacha", null, [], previos, actuales, 50, 20, 4, ataque);
  assert.equal(ataque.dano, 18);
  assert.equal(actuales.length, 0);
});

test("Semilla silvestre sólo acepta técnicas de Druida y mueve la marca a un único enemigo", () => {
  const { resolverImpactosHibridosRoster } = require("../src/lib/expediciones/combate/rasgos-hibridos.ts");
  const semilla = { tipo: "interno", habilidadId: "_semillaSilvestre", familia: "u1", valor: 1 };
  const enemigos = [
    { id: "e1", hp: 30, efectos: [semilla] },
    { id: "e2", hp: 30, efectos: [] },
    { id: "e3", hp: 30, efectos: [] },
  ];
  const danos = new Map([["e2", 10], ["e3", 10]]);
  const estados = new Map([["e2", { efectos: [] }], ["e3", { efectos: [] }]]);
  const accion = { enemigoObjetivoId: "e2", dano: 20, texto: "" };
  const resolver = claseId => resolverImpactosHibridosRoster("druida", "u1", "baston", { claseId, efecto: "dano" },
    [], 20, enemigos, new Map(), danos, estados, accion);
  resolver("mago");
  assert.equal(estados.has("e1"), false);
  assert.equal(estados.get("e2").efectos.length, 0);
  resolver("druida");
  assert.equal(estados.get("e1").efectos.length, 0);
  assert.equal(estados.get("e2").efectos[0].habilidadId, "_semillaSilvestre");
  assert.equal(estados.get("e3").efectos.length, 0);
});

test("Inscripción de filo separa el 10 % físico del 50 % mágico por turno", () => {
  const { resolverImpactoHibrido } = require("../src/lib/expediciones/combate/rasgos-hibridos.ts");
  const efectos = [];
  const previos = [{ tipo: "dano_progresivo", creadorId: "u1" }];
  const golpe = () => {
    const accion = { dano: 20, texto: "" };
    resolverImpactoHibrido("espadachin_runico", "u1", "espada", null, efectos, previos, [], 500, 100, 0, accion);
    return accion.dano;
  };
  assert.equal(golpe(), 80);
  assert.equal(golpe(), 30);
});

test("las 23 profesiones de Tier 3 tienen un rasgo visible", () => {
  const { CLASES } = require("../src/lib/progresion/clases.ts");
  const { RASGOS_CLASE } = require("../src/lib/catalogos/rasgos-clase.ts");
  const tier3 = Object.values(CLASES).filter(clase => clase.tier === 3);
  assert.equal(tier3.length, 23);
  for (const clase of tier3) assert.ok(RASGOS_CLASE[clase.id]?.nombre, clase.id);
});

test("Pacto de sangre paga el déficit exacto y conserva al menos un PV", () => {
  const { prepararCostesTier3, bonusEnergiaArena } = require("../src/lib/expediciones/combate/rasgos-tier3.ts");
  const conjuro = { id: "contrato", efecto: "dano", costeMana: 20, multiplicadorDano: 1 };
  assert.deepEqual(prepararCostesTier3("demonologo", conjuro, [], 14, 13),
    { ...conjuro, costeMana: 14, costeVidaRasgo: 12, multiplicadorDano: 1.2 });
  assert.equal(prepararCostesTier3("demonologo", conjuro, [], 14, 12), conjuro);
  assert.equal(prepararCostesTier3("demonologo", conjuro, [], 9, 100), conjuro);
  assert.equal(bonusEnergiaArena("campeon_arena", 34, 100), 10);
  assert.equal(bonusEnergiaArena("campeon_arena", 35, 100), 0);
});

test("Pulso firme usa Mira y Doble alcance distingue los disparos reales del golpe de Centinela", () => {
  const { cerrarAccionTier3, criticoTier3, esDisparoTier3, potenciaVigia } =
    require("../src/lib/expediciones/combate/rasgos-tier3.ts");
  const mira = [{ datosTacticos: { estados: [{ familia: "preparacion", clave: "mira" }] } }];
  assert.equal(criticoTier3("francotirador", mira, "e1", true), 0.2);
  cerrarAccionTier3("francotirador", null, true, "arco", { dano: 10 }, mira, "e1");
  assert.equal(criticoTier3("francotirador", mira, "e1", true), 0);
  const efectos = [];
  cerrarAccionTier3("vigia", { id: "centinela_ataque", efecto: "dano" }, false, "arco", { dano: 10 }, efectos);
  assert.equal(esDisparoTier3({ id: "vigia_ataque" }, "hacha"), true);
  assert.equal(potenciaVigia("vigia", efectos, true), 1.25);
  assert.equal(potenciaVigia("vigia", efectos, false), 1);
});

test("Runa resonante se rearma con el turno de su creador aunque golpee otro aliado", () => {
  const { pulsarRuna } = require("../src/lib/expediciones/combate/rasgos-tier3.ts");
  const { comenzarTurnoCombatiente } = require("../src/lib/expediciones/combate/estados-combate.ts");
  const sello = [{ datosTacticos: { estados: [{ familia: "sello", clave: "circuito", creadorId: "runista" }] } }];
  let runista = [];
  const golpe = () => {
    const accion = { dano: 25, texto: "" };
    pulsarRuna({ tipoDano: "magico" }, accion, sello, id => id === "runista" ? runista : undefined);
    return accion.dano;
  };
  assert.equal(golpe(), 30);
  assert.equal(golpe(), 25);
  runista = comenzarTurnoCombatiente(runista, 50, 100, 0, "Runista").efectos;
  assert.equal(golpe(), 30);
});

test("Ruptura controlada devuelve el maná al autor de la barrera y Consagración no resucita", () => {
  const { anotarProteccionTier3, curaConsagracion } = require("../src/lib/expediciones/combate/protecciones-rasgos.ts");
  const { aplicarBarreraAccion } = require("../src/lib/expediciones/combate/estados-combate.ts");
  const barrera = { tipo: "barrera", habilidadId: "escudo", creadorId: "a1", valor: 1, turnosRestantes: 2 };
  const efectos = [barrera];
  anotarProteccionTier3("abjurador", "a1", { id: "escudo", costeMana: 20 }, efectos);
  const golpe = { dano: 35, texto: "", critico: false };
  aplicarBarreraAccion(golpe, efectos);
  assert.equal(golpe.dano, 0);
  assert.deepEqual(golpe.proteccion.ruptura, { creadorId: "a1", mana: 6, dano: 10 });
  assert.equal(curaConsagracion({ consagracion: true }, 0, 100), 0);
  assert.equal(curaConsagracion({ consagracion: true }, 40, 100), 5);
});

test("los ajustes de Tier 3 se aplican a la ventana y objetivo correctos", () => {
  const { cerrarAccionTier3, criticoTier3, multiplicadorCriticoTier3, potenciaVigia, prepararTecnicaTier3, registrarEsquivaTier3 } =
    require("../src/lib/expediciones/combate/rasgos-tier3.ts");
  const efectos = [];
  registrarEsquivaTier3("asesino", { esquivado: true }, efectos, "agresor");
  assert.equal(criticoTier3("asesino", efectos, "agresor", false), 0.25);
  assert.equal(multiplicadorCriticoTier3("asesino", efectos, "agresor"), 1.75);
  assert.equal(multiplicadorCriticoTier3("asesino", efectos, "otro"), 1);
  cerrarAccionTier3("asesino", null, true, "daga", { dano: 10 }, efectos, "agresor");
  assert.equal(multiplicadorCriticoTier3("asesino", efectos, "agresor"), 1);
  const ataque = { efecto: "dano", multiplicadorDano: 1, objetivo: { patron: "fila" } };
  const contexto = { efectosActor: [], efectosObjetivo: [], filaObjetivo: 2, objetivoId: "e1" };
  assert.equal(prepararTecnicaTier3(ataque, { ...contexto, claseId: "francotirador" }).multiplicadorDano, 1.5);
  assert.equal(prepararTecnicaTier3(ataque, { ...contexto, claseId: "archimago" }).multiplicadorDano, 1.75);
  assert.equal(prepararTecnicaTier3(ataque, { ...contexto, claseId: "archimago", principal: false }), ataque);
  assert.equal(prepararTecnicaTier3(ataque, { ...contexto, claseId: "verdugo",
    efectosObjetivo: [{ tipo: "debuff_defensa" }] }).rupturaDefensaTemporal, 0.5);
  const cadena = [];
  for (const [indice, disparo] of [false, true, false, true, false].entries()) {
    assert.equal(potenciaVigia("vigia", cadena, disparo), indice === 0 ? 1 : 1.25);
    cerrarAccionTier3("vigia", null, true, disparo ? "arco" : "hacha", { dano: 10 }, cadena);
  }
});

test("Ruptura controlada devuelve el 30 % de la capacidad de una guardia aunque el golpe la supere", () => {
  const { anotarProteccionTier3 } = require("../src/lib/expediciones/combate/protecciones-rasgos.ts");
  const { aplicarBarreraAccion } = require("../src/lib/expediciones/combate/estados-combate.ts");
  const estado = { familia: "guardia", fuenteId: "escudo", creadorId: "a1", valor: 40, restantes: 2 };
  const efectos = [{ datosTacticos: { estados: [estado] } }];
  anotarProteccionTier3("abjurador", "a1", { id: "escudo", costeMana: 20 }, efectos);
  aplicarBarreraAccion({ dano: 10, texto: "", critico: false }, efectos);
  const golpe = { dano: 50, texto: "", critico: false };
  aplicarBarreraAccion(golpe, efectos);
  assert.equal(golpe.dano, 20);
  assert.deepEqual(golpe.proteccion.ruptura, { creadorId: "a1", mana: 0, dano: 12 });
});

test("Forma perfecta aumenta las estadísticas de combate y Cosecha de almas duplica el drenaje", () => {
  const { calcularEstadisticasPersonaje } = require("../src/lib/progresion/estadisticas/estadisticas-personaje.ts");
  const { aplicarImpactoTier3, cobrarAlma } = require("../src/lib/expediciones/combate/rasgos-tier3.ts");
  const stats = calcularEstadisticasPersonaje({ clase: "Novato", profesionActivaId: "gran_maestro", nivel: 30,
    nivelJob: 25, velocidadMejoras: 0, capacidadCarruajeMejoras: 0 });
  for (const clave of ["hpMaximo", "ataque", "defensa", "velocidad", "ataqueMagico", "defensaMagica", "energiaMaxima", "manaMaximo"]) {
    assert.equal(stats.total[clave], Math.floor(stats.base[clave] * 115 / 100), clave);
  }
  const efectos = [];
  cobrarAlma("nigromante", "u1", efectos, [{ tipo: "dano_progresivo", creadorId: "u1" }]);
  const drenar = () => aplicarImpactoTier3("nigromante", "u1", { roboVida: 0.2 }, { dano: 50, curacion: 10 },
    efectos, [], [], 0, true, 100);
  assert.equal(drenar(), 10);
  assert.equal(drenar(), 0);
});

test("las ocho clases de Tier 3.5 tienen un rasgo visible", () => {
  const { CLASES } = require("../src/lib/progresion/clases.ts");
  const { RASGOS_CLASE } = require("../src/lib/catalogos/rasgos-clase.ts");
  const clases = Object.values(CLASES).filter(clase => clase.tier === 3.5);
  assert.equal(clases.length, 8);
  for (const clase of clases) assert.ok(RASGOS_CLASE[clase.id]?.nombre, clase.id);
});

test("Ciclo de luz alterna curación y hechizo ofensivo con una sola preparación", () => {
  const { cerrarCicloLuz, factorCuracionArconte, prepararTecnicaTier35 } = require("../src/lib/expediciones/combate/rasgos-tier35.ts");
  const efectos = [];
  const contexto = { claseId: "arconte", efectosActor: efectos };
  const cura = { efecto: "curacion" };
  const conjuro = { efecto: "dano", tipoDano: "magico", multiplicadorDano: 1.2 };
  cerrarCicloLuz("arconte", cura, { pulsosEstado: [{ tipo: "curacion", cantidad: 10 }] }, efectos);
  assert.equal(prepararTecnicaTier35(conjuro, contexto).multiplicadorDano, 1.5);
  assert.equal(factorCuracionArconte(contexto), 1);
  cerrarCicloLuz("arconte", conjuro, { dano: 10 }, efectos);
  assert.equal(prepararTecnicaTier35(conjuro, contexto), conjuro);
  assert.equal(factorCuracionArconte(contexto), 1.25);
  cerrarCicloLuz("arconte", cura, { curacion: 5 }, efectos);
  assert.equal(factorCuracionArconte(contexto), 1);
});

test("Bandera de abordaje sólo recompensa acertar al agresor en el siguiente turno propio", () => {
  const { aplicarImpactoTier35, expirarAbordaje, registrarEsquivaTier35 } = require("../src/lib/expediciones/combate/rasgos-tier35.ts");
  const { comenzarTurnoCombatiente } = require("../src/lib/expediciones/combate/estados-combate.ts");
  const efectos = [];
  registrarEsquivaTier35("corsario", { esquivado: true }, efectos, "e1");
  const propios = comenzarTurnoCombatiente(efectos, 50, 100, 0, "Corsario").efectos;
  const golpear = (objetivoId, dano) => aplicarImpactoTier35({
    clase: "corsario", actorId: "u1", objetivoId, arma: "daga", habilidad: null,
    golpe: { dano, texto: "" }, propios, anteriores: [], destino: [], hpRival: 50, defensa: 10,
  }).energia;
  assert.equal(golpear("e2", 12), 0);
  assert.equal(golpear("e1", 0), 0);
  assert.equal(golpear("e1", 12), 10);
  assert.equal(golpear("e1", 12), 0);
  registrarEsquivaTier35("corsario", { esquivado: true }, propios, "e1");
  expirarAbordaje("corsario", propios);
  const siguiente = comenzarTurnoCombatiente(propios, 50, 100, 0, "Corsario").efectos;
  expirarAbordaje("corsario", siguiente);
  assert.equal(siguiente.some(efecto => efecto.habilidadId === "_banderaAbordaje"), false);
});

test("Corte entre planos cambia la defensa consultada y conserva el ataque físico", () => {
  const { corteEntrePlanos, registrarBasicoHoja } = require("../src/lib/expediciones/combate/rasgos-tier35.ts");
  const { resolverAtaqueJugador } = require("../src/lib/expediciones/combate/ataques-basicos.ts");
  const efectos = [];
  assert.equal(corteEntrePlanos("hoja_velo", efectos, 100, 0), true);
  const original = Math.random;
  try {
    Math.random = () => 0.5;
    const ataque = resolverAtaqueJugador({ jugadorAtaque: 100, jugadorAtaqueMagico: 1000, jugadorNivel: 1,
      jugadorProbCritico: 0, jugadorDanoCritico: 1.5, enemigoDefensa: 100, enemigoDefensaMagica: 0,
      enemigoNombre: "Objetivo", usarMejorAtaqueMagico: true, danoMagicoDesdeAtaqueFisico: true });
    assert.equal(ataque.dano, 101);
    assert.equal(ataque.tipoDanoBasico, "magico");
  } finally { Math.random = original; }
  registrarBasicoHoja("hoja_velo", true, efectos);
  assert.equal(corteEntrePlanos("hoja_velo", efectos, 100, 0), false);
});

test("Conducción necesita una marca previa y alcanza al otro enemigo vivo más cercano", () => {
  const { resolverImpactosTier35Roster } = require("../src/lib/expediciones/combate/rasgos-tier35.ts");
  const enemigos = [
    { id: "e1", nombre: "Principal", casilla: 4, columna: 1, hp: 50, efectos: [] },
    { id: "e2", nombre: "Lejos", casilla: 0, columna: 0, hp: 50, efectos: [] },
    { id: "e3", nombre: "Cerca", casilla: 5, columna: 2, hp: 50, efectos: [] },
  ];
  const probar = previos => {
    const danos = new Map([["e1", 30]]);
    const estados = new Map([["e1", { defensa: 10, efectos: [{ datosTacticos: { estados: [{ clave: "elemento", elemento: "rayo" }] } }] }]]);
    const accion = { enemigoObjetivoId: "e1", dano: 30, texto: "" };
    resolverImpactosTier35Roster({ clase: "avatar_tormenta", actorId: "u1", arma: "puños",
      habilidad: { claseId: "avatar_tormenta", efecto: "dano" }, propios: [], enemigos, previos, danos, estados, accion });
    return [...danos];
  };
  assert.deepEqual(probar(new Map()), [["e1", 30]]);
  assert.deepEqual(probar(new Map([["e1", [{ datosTacticos: { estados: [{ clave: "elemento", elemento: "fuego" }] } }]]])), [["e1", 30], ["e3", 9]]);
});

test("Sentencia se prepara al curarse y Disparo de ultratumba sólo drena magia funeraria propia", () => {
  const { aplicarImpactoTier35, registrarCuraJusticiero } = require("../src/lib/expediciones/combate/rasgos-tier35.ts");
  const propios = [];
  const destino = [];
  registrarCuraJusticiero("justiciero", { efecto: "curacion" }, propios, 5);
  const golpear = (clase, arma, anteriores = []) => aplicarImpactoTier35({
    clase, actorId: "u1", objetivoId: "e1", arma, habilidad: null, golpe: { dano: 30, texto: "" },
    propios, anteriores, destino, hpRival: 25, defensa: 10,
  });
  golpear("justiciero", "maza");
  assert.equal(destino[0].valor, 0.2);
  assert.equal(propios.length, 0);
  const funeral = [{ tipo: "dano_progresivo", familia: "sombras", creadorId: "u1" }];
  assert.equal(golpear("cazador_espectral", "arco", funeral).cura, 5);
  assert.equal(golpear("cazador_espectral", "arco", funeral).cura, 0);
});

test("el Corsario duplica el oro del Pirata por tramo y cobra una sola vez si coinciden los disparadores", () => {
  const { cerrarAccionHibrida, oroAbordaje } = require("../src/lib/expediciones/combate/rasgos-hibridos.ts");
  const { comenzarTurnoCombatiente } = require("../src/lib/expediciones/combate/estados-combate.ts");
  for (const job of [0, 9, 20, 60, 100]) assert.equal(oroAbordaje(job, "corsario"), 2 * oroAbordaje(job));
  let efectos = [];
  cerrarAccionHibrida("corsario", null, true, { dano: 12, texto: "" }, efectos, 100);
  efectos = comenzarTurnoCombatiente(efectos, 100, 100, 0, "Corsario").efectos;
  const golpe = { dano: 12, texto: "" };
  assert.equal(cerrarAccionHibrida("corsario", { efecto: "dano" }, false, golpe, efectos, 100, true), 0);
  assert.equal((golpe.texto.match(/110 de oro/g) ?? []).length, 1);
  efectos = comenzarTurnoCombatiente(efectos, 100, 100, 0, "Corsario").efectos;
  assert.equal(cerrarAccionHibrida("corsario", null, true, { dano: 12, texto: "" }, efectos, 100), 10);
});

test("el nivel de Job mejora rasgos de varios tiers hasta los valores de maestría", () => {
  const { escalarRasgoPorJob, multiplicadorAtaqueRasgo } = require("../src/lib/expediciones/combate/rasgos-clase.ts");
  const { bonusEnergiaArena } = require("../src/lib/expediciones/combate/rasgos-tier3.ts");
  const { factorCuracionArconte } = require("../src/lib/expediciones/combate/rasgos-tier35.ts");
  assert.equal(multiplicadorAtaqueRasgo("explorador", 100, 100, [], 1), 1.25);
  assert.equal(multiplicadorAtaqueRasgo("explorador", 100, 100, [], 100), 1.4);
  assert.equal(bonusEnergiaArena("campeon_arena", 20, 100, 100), 20);
  assert.equal(escalarRasgoPorJob(60, 25, 40), 25 + 15 * 59 / 99);
  assert.equal(factorCuracionArconte({ claseId: "arconte", nivelJob: 100, efectosActor: [
    { tipo: "interno", habilidadId: "_cicloLuz", familia: "cura" },
  ] }), 1.4);
});

test("los básicos prolongan todas las danzas propias y Gran compás sólo dura el turno del receptor", () => {
  const { prepararCompas, cerrarDanzas } = require("../src/lib/expediciones/combate/rasgos-tier35.ts");
  const { velocidadConDanza } = require("../src/lib/expediciones/combate/danzas-combate.ts");
  const { aplicarBarreraAccion, calcularAtaqueModificado, calcularEvasionModificada, comenzarTurnoCombatiente } =
    require("../src/lib/expediciones/combate/estados-combate.ts");
  let efectos = [];
  for (const id of ["danzaespadas_tactica", "danzaespadas_ataque", "danzaespadas_tecnica_adicional"]) {
    prepararCompas("danzaespadas", { id }, "u1", [{ efectos, hpMaximo: 100 }], 100);
  }
  const lanzar = (id, basico) => cerrarDanzas("danzaespadas", id ? { id } : null, basico,
    { texto: "", dano: 0 }, "u1", () => efectos, ["u2"]);
  lanzar("danzaespadas_avanzada", false);
  lanzar(null, true);
  assert.deepEqual(efectos.map(e => e.turnosRestantes), [4, 4, 4, 2]);
  assert.equal(calcularAtaqueModificado(100, efectos), 140);
  assert.equal(calcularAtaqueModificado(100, efectos, true), 140);
  assert.equal(velocidadConDanza(100, efectos), 130);
  assert.equal(calcularEvasionModificada(0, efectos), 0.2);
  const golpe = { dano: 80, texto: "", critico: false };
  aplicarBarreraAccion(golpe, efectos);
  assert.equal(golpe.dano, 8); // 80 - 32 de reducción - 40 de escudo.
  efectos = comenzarTurnoCombatiente(efectos, 90, 100, 0, "Aliado").efectos;
  assert.equal(calcularAtaqueModificado(100, efectos), 140);
  efectos = comenzarTurnoCombatiente(efectos, 90, 100, 0, "Aliado").efectos;
  assert.equal(calcularAtaqueModificado(100, efectos), 120);
  assert.equal(efectos.find(e => e.familia === "resguardo").escudoDanza, 0);
});
