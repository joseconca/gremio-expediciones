require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  obtenerObjetivoEsperadoAccion,
  validarObjetivoAccionCombate,
  validarTurnoAccionCombate,
} = require("../src/lib/expediciones/contrato-accion-combate.ts");

test("contrato de objetivo: ataques y habilidades ofensivas apuntan al oponente", () => {
  assert.equal(obtenerObjetivoEsperadoAccion("atacar"), "oponente");
  assert.equal(obtenerObjetivoEsperadoAccion("usar_habilidad", "dano"), "oponente");
  assert.deepEqual(validarObjetivoAccionCombate({
    accion: "usar_habilidad", objetivo: "oponente", efectoHabilidad: "dano",
  }), { valido: true, objetivo: "oponente", inferido: false });
});

test("contrato de objetivo: habilidades de soporte y objetos apuntan al propio personaje", () => {
  assert.equal(obtenerObjetivoEsperadoAccion("usar_habilidad", "curacion"), "propio");
  assert.equal(obtenerObjetivoEsperadoAccion("usar_habilidad", "bonus_defensa"), "propio");
  assert.equal(obtenerObjetivoEsperadoAccion("usar_objeto"), "propio");
  assert.equal(validarObjetivoAccionCombate({ accion: "usar_objeto", objetivo: "propio" }).valido, true);
});

test("contrato de objetivo: rechaza objetivos ausentes o incompatibles en rutas específicas", () => {
  assert.equal(validarObjetivoAccionCombate({ accion: "atacar", objetivo: undefined }).valido, false);
  assert.equal(validarObjetivoAccionCombate({ accion: "atacar", objetivo: "propio" }).valido, false);
  assert.equal(validarObjetivoAccionCombate({ accion: "usar_habilidad", objetivo: "oponente", efectoHabilidad: "curacion" }).valido, false);
  assert.equal(validarObjetivoAccionCombate({ accion: "usar_objeto", objetivo: "oponente" }).valido, false);
});

test("adaptador legado infiere el objetivo por el tipo de acción", () => {
  assert.deepEqual(validarObjetivoAccionCombate({
    accion: "atacar", objetivo: undefined, permitirInferencia: true,
  }), { valido: true, objetivo: "oponente", inferido: true });
  assert.deepEqual(validarObjetivoAccionCombate({
    accion: "usar_habilidad", objetivo: undefined, efectoHabilidad: "curacion", permitirInferencia: true,
  }), { valido: true, objetivo: "propio", inferido: true });
});

test("PvP: acepta turno del atacante y defensor y rechaza al participante sin turno", () => {
  const atacante = { tipo: "pvp", turno: "atacante", usuarioId: "a", atacanteUsuarioId: "a", defensorUsuarioId: "d", accion: "atacar" };
  assert.deepEqual(validarTurnoAccionCombate(atacante), { valido: true, actor: "atacante" });
  assert.deepEqual(validarTurnoAccionCombate({ ...atacante, turno: "defensor", usuarioId: "d" }), { valido: true, actor: "defensor" });
  assert.deepEqual(validarTurnoAccionCombate({ ...atacante, turno: "defensor" }), {
    valido: false, estado: 409, error: "No es tu turno de combate.",
  });
});

test("PvE: solo el turno del jugador permite habilidades y consumibles", () => {
  assert.deepEqual(validarTurnoAccionCombate({
    tipo: "pve", turno: "jugador", usuarioId: "u", accion: "usar_habilidad",
  }), { valido: true, actor: "jugador" });
  assert.equal(validarTurnoAccionCombate({
    tipo: "pve", turno: "enemigo", usuarioId: "u", accion: "usar_objeto",
  }).valido, false);
});
