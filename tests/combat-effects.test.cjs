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
} = require("../src/lib/expediciones/estados-combate.ts");

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
  assert.equal(calcularAtaqueModificado(100, efectosJugador, true), 114);
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
