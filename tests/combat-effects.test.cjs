require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  leerEfectosCombate,
  procesarTicksPeriodicos,
  avanzarEfectosCombate,
  procesarEfectosTurno,
  calcularAtaqueModificado,
  calcularPrecisionModificada,
  calcularEvasionModificada,
  retirarEfectosHabilidad,
} = require("../src/lib/expediciones/estados-combate.ts");
const { resolverHabilidadJugador } = require("../src/lib/expediciones/combate.ts");
const { obtenerHabilidadPorId } = require("../src/lib/habilidades.ts");

test("curación progresiva aplica un pulso sin superar la vida máxima", () => {
  const efectos = [{
    habilidadId: "primeros_auxilios",
    tipo: "curacion_progresiva",
    valor: 8,
    duracionTurnos: 2,
    turnosRestantes: 2,
    objetivo: "jugador",
  }];
  assert.equal(procesarTicksPeriodicos(efectos, 95, 100, "Aventurero").hp, 100);
  assert.equal(procesarTicksPeriodicos(efectos, 50, 100, "Aventurero").hp, 58);
});

test("el daño progresivo se aplica en cada turno y el efecto caduca al agotar su duración", () => {
  const efecto = {
    habilidadId: "tajo_sangrante",
    tipo: "dano_progresivo",
    valor: 6,
    duracionTurnos: 2,
    turnosRestantes: 2,
    objetivo: "enemigo",
  };
  assert.equal(procesarTicksPeriodicos([efecto], 20, 20, "Goblin").hp, 14);
  const turnoUno = avanzarEfectosCombate([efecto], 10);
  assert.equal(turnoUno.efectos[0].turnosRestantes, 1);
  const turnoDos = procesarEfectosTurno(turnoUno.efectos, 14, 20, 10, "Goblin");
  assert.equal(turnoDos.hp, 8);
  assert.equal(turnoDos.efectos.length, 0);
});

test("los estados modifican ataque, precisión y evasión con límites", () => {
  const efectos = [
    { habilidadId: "concentracion_arcana", tipo: "bonus_ataque_magico", valor: 0.15, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" },
    { habilidadId: "provocacion", tipo: "debuff_ataque", valor: 0.12, duracionTurnos: 2, turnosRestantes: 2, objetivo: "enemigo" },
    { habilidadId: "trampa_cegadora", tipo: "debuff_precision", valor: 10, duracionTurnos: 2, turnosRestantes: 2, objetivo: "enemigo" },
    { habilidadId: "finta_fulminante", tipo: "bonus_evasion", valor: 0.12, duracionTurnos: 2, turnosRestantes: 2, objetivo: "jugador" },
  ];
  const efectosJugador = [efectos[0], efectos[3]];
  const efectosEnemigo = [efectos[1], efectos[2]];
  assert.equal(calcularAtaqueModificado(100, efectosJugador, true), 115);
  assert.equal(calcularAtaqueModificado(100, efectosEnemigo, false), 88);
  assert.equal(calcularPrecisionModificada(75, efectosEnemigo), 65);
  assert.equal(calcularEvasionModificada(0.55, efectosJugador), 0.6);
  assert.equal(leerEfectosCombate([...efectos, { tipo: "inventado" }]).length, 4);
});

test("al expirar los bonus defensivos se restaura la defensa y los debuffs se revierten", () => {
  const efectos = [
    { habilidadId: "guardia_improvisada", tipo: "bonus_defensa", valor: 8, duracionTurnos: 4, turnosRestantes: 1, objetivo: "jugador" },
    { habilidadId: "rompeguardia", tipo: "debuff_defensa", valor: 5, duracionTurnos: 2, turnosRestantes: 1, objetivo: "enemigo" },
  ];
  const resultado = avanzarEfectosCombate(efectos, 18);
  assert.equal(resultado.defensa, 15);
  assert.equal(resultado.efectos.length, 0);
});

test("reutilizar una habilidad retira sus efectos previos y revierte cambios defensivos", () => {
  const efectos = [
    { habilidadId: "guardia_improvisada", tipo: "bonus_defensa", valor: 8, duracionTurnos: 4, turnosRestantes: 2, objetivo: "jugador" },
    { habilidadId: "guardia_improvisada", tipo: "curacion_progresiva", valor: 5, duracionTurnos: 2, turnosRestantes: 1, objetivo: "jugador" },
    { habilidadId: "rejuvenecer", tipo: "curacion_progresiva", valor: 7, duracionTurnos: 3, turnosRestantes: 2, objetivo: "jugador" },
  ];
  const resultado = retirarEfectosHabilidad(efectos, "guardia_improvisada", 18);
  assert.equal(resultado.defensa, 10);
  assert.equal(resultado.efectos.length, 1);
  assert.equal(resultado.efectos[0].habilidadId, "rejuvenecer");
});

test("el daño progresivo se mitiga con la defensa física o mágica del objetivo", () => {
  const habilidad = {
    id: "bola_fuego",
    claseId: "mago",
    nombre: "Bola de fuego",
    tipo: "activa",
    efecto: "dano",
    tipoDano: "magico",
    animacion: "ofensiva_potenciada",
    multiplicadorDano: 1,
    danoProgresivoPorcentaje: 0.25,
    duracionTurnos: 2,
  };
  const originalRandom = Math.random;
  try {
    // D20=11, impacta, variación de daño 1.0, sin crítico.
    const valores = [0.5, 0, 0.5, 0.99];
    Math.random = () => valores.shift() ?? 0.99;
    const resultado = resolverHabilidadJugador(habilidad, {
      jugadorAtaque: 100,
      jugadorAtaqueMagico: 100,
      jugadorDefensa: 10,
      jugadorDefensaMagica: 20,
      jugadorNivel: 1,
      jugadorHp: 50,
      jugadorHpMaximo: 100,
      jugadorProbCritico: 0,
      jugadorDanoCritico: 1.5,
      enemigoDefensa: 20,
      enemigoDefensaMagica: 40,
      enemigoNombre: "Goblin",
      jugadorPrecision: 100,
      enemigoEvasion: 0,
    });
    assert.equal(resultado.efectos.find((efecto) => efecto.tipo === "dano_progresivo").valor, 5);
  } finally {
    Math.random = originalRandom;
  }
});

test("Primeros Auxilios aplica la curación inmediata y los dos pulsos progresivos", () => {
  const habilidad = obtenerHabilidadPorId("primeros_auxilios");
  assert.ok(habilidad, "La habilidad debe existir en el catálogo");
  const resultado = resolverHabilidadJugador(habilidad, {
    jugadorAtaque: 10,
    jugadorAtaqueMagico: 10,
    jugadorProbCritico: 0,
    jugadorDanoCritico: 1.5,
    jugadorPrecision: 100,
    enemigoEvasion: 0,
    jugadorDefensa: 5,
    jugadorDefensaMagica: 5,
    jugadorNivel: 1,
    jugadorHp: 40,
    jugadorHpMaximo: 100,
    enemigoDefensa: 5,
    enemigoDefensaMagica: 5,
    enemigoNombre: "Slime",
  });

  assert.equal(resultado.accion.curacion, 15);
  assert.equal(resultado.jugadorHp, 55);
  assert.equal(resultado.efectos.length, 1);
  assert.equal(resultado.efectos[0].tipo, "curacion_progresiva");
  assert.equal(resultado.efectos[0].turnosRestantes, 2);

  const primerTurno = procesarEfectosTurno(
    resultado.efectos, resultado.jugadorHp, 100, resultado.jugadorDefensa, "Aventurero",
  );
  assert.equal(primerTurno.curacionAplicada, 7);
  assert.equal(primerTurno.hp, 62);
  assert.equal(primerTurno.efectos[0].turnosRestantes, 1);
  assert.match(primerTurno.mensajes.join(" "), /recupera 7 HP por curación progresiva/);

  const segundoTurno = procesarEfectosTurno(
    primerTurno.efectos, primerTurno.hp, 100, primerTurno.defensa, "Aventurero",
  );
  assert.equal(segundoTurno.curacionAplicada, 7);
  assert.equal(segundoTurno.hp, 69);
  assert.equal(segundoTurno.efectos.length, 0);
  assert.match(segundoTurno.mensajes.join(" "), /recupera 7 HP por curación progresiva/);
});
