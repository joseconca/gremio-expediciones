require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  obtenerObjetivoEsperadoAccion,
  validarObjetivoAccionCombate,
  validarTurnoAccionCombate,
} = require("../src/lib/expediciones/contrato-accion-combate.ts");

test("el contexto táctico compartido conserva formación, recursos y pasivas legales", () => {
  const { crearContextoTecnicaTactica } = require("../src/server/services/combate/contexto-tactico.ts");
  const personaje = {
    clase: "Novato",
    profesionActivaId: "novato",
    nivel: 1,
    nivelJob: 1,
    velocidadMejoras: 0,
    capacidadCarruajeMejoras: 0,
    energiaActual: 999,
    manaActual: 999,
    equipoEquipado: null,
    habilidades: [
      { habilidadId: "aguante_aprendiz", nivel: 2, slot: "pasiva_1" },
      { habilidadId: "reserva_arcana", nivel: 1, slot: "pasiva_2" },
      { habilidadId: "aguante_aprendiz", nivel: 1, slot: null },
    ],
  };
  const actor = {
    id: "jugador", hp: 42, hpMaximo: 100,
    ataque: 15, ataqueMagico: 5, defensa: 8, defensaMagica: 3,
    posicion: "mele", efectos: [],
  };
  const objetivo = {
    ...actor, id: "enemigo", hp: 27, posicion: "retaguardia", efectos: [],
  };
  const resultado = crearContextoTecnicaTactica(
    personaje, 4, actor, objetivo, false,
    { numeroObjetivos: 2, principal: false, pesoCuracion: 0.25 }
  );
  assert.equal(resultado.actorId, "jugador");
  assert.equal(resultado.objetivoId, "enemigo");
  assert.equal(resultado.ciclo, 4);
  assert.equal(resultado.filaActor, 0);
  assert.equal(resultado.filaObjetivo, 2);
  assert.equal(resultado.ataque, 15);
  assert.equal(resultado.objetivoHp, 27);
  assert.strictEqual(resultado.efectosActor, actor.efectos);
  assert.strictEqual(resultado.efectosObjetivo, objetivo.efectos);
  assert.ok(resultado.energia <= resultado.energiaMaxima);
  assert.ok(resultado.mana <= resultado.manaMaximo);
  assert.deepEqual(resultado.pasivas.map((pasiva) => pasiva.id), ["aguante_aprendiz"]);
  assert.equal(resultado.numeroObjetivos, 2);
  assert.equal(resultado.principal, false);
  assert.equal(resultado.pesoCuracion, 0.25);
  assert.equal(personaje.habilidades.length, 3, "No alterar habilidades equipadas");
});

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


test("PvE: huir está disponible durante cualquier turno, pero no en PvP", () => {
  assert.equal(obtenerObjetivoEsperadoAccion("escapar"), "propio");
  assert.equal(validarObjetivoAccionCombate({ accion: "escapar", objetivo: "propio" }).valido, true);
  assert.equal(validarTurnoAccionCombate({ tipo: "pve", turno: "jugador", usuarioId: "u", accion: "escapar" }).valido, true);
  assert.deepEqual(validarTurnoAccionCombate({
    tipo: "pve", turno: "enemigo", usuarioId: "u", accion: "escapar",
  }), { valido: true, actor: "enemigo" });
  assert.equal(validarTurnoAccionCombate({
    tipo: "pve", turno: "enemigo", usuarioId: "u", accion: "usar_habilidad",
  }).valido, false);
  assert.deepEqual(validarTurnoAccionCombate({
    tipo: "pvp", turno: "atacante", usuarioId: "a", atacanteUsuarioId: "a", defensorUsuarioId: "d", accion: "escapar",
  }), { valido: false, estado: 400, error: "No puedes huir de un combate PvP." });
});
