require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerResultadoInformeParty } = require("../src/components/base/party/resultado-informe.ts");
const { crearRecompensaInformeCombateParty } = require("../src/components/base/party/vista-combate.ts");

const recompensa = { liquidacionYaResuelta: true, recompensas: [{ usuarioId: "u1", oro: 17 }] };
const enemigo = { id: "e1", enemigoId: "slime_acido", nombre: "Slime Ácido", hp: 0, hpMaximo: 20, ataque: 2, defensa: 1, casilla: 4 };
const expedicion = {
  id: "exp-1", tipo: "normal", nombre: "Ruinas", dificultad: 3, modoDificultad: "normal",
  fechaSalida: "2026-11-03T10:00:00Z", fechaLlegada: "2026-11-03T11:00:00Z",
  combate: { fase: "victoria", log: ["Ataque", null, "Victoria"], enemigoNombre: "Slime Ácido", enemigos: [enemigo], recompensasResultado: recompensa },
};
const base = { usuarioId: "u1", party: { id: "party-1" }, expedicionActiva: null, ultimoResultadoExpedicion: null };

test("victoria: duración, enemigos y log filtrado sin alterar el snapshot", () => {
  const informe = obtenerResultadoInformeParty({ ...base, expedicionActiva: expedicion }, null);
  assert.equal(informe.fase, "victoria");
  assert.equal(informe.duracionSegundos, 7200);
  assert.deepEqual(informe.enemigosDerrotados, ["Slime Ácido"]);
  assert.deepEqual(informe.logCombate, ["Ataque", "Victoria"]);
  assert.equal(informe.recompensas, recompensa);
  assert.deepEqual(expedicion.combate.log, ["Ataque", null, "Victoria"]);
});

test("sondeo tardío: conserva recompensa y log confirmado de la misma expedición", () => {
  const anterior = { expedicionPartyId: "exp-1", fase: "victoria", recompensas: recompensa, logCombate: ["informe confirmado"] };
  const pendiente = { ...expedicion, combate: { ...expedicion.combate, log: [], recompensasResultado: null } };
  const actual = obtenerResultadoInformeParty({ ...base, expedicionActiva: pendiente }, anterior);
  assert.equal(actual.recompensas, recompensa);
  assert.deepEqual(actual.logCombate, ["informe confirmado"]);
  const otra = obtenerResultadoInformeParty({ ...base, expedicionActiva: { ...pendiente, id: "exp-2" } }, anterior);
  assert.equal(otra.recompensas, null);
  assert.deepEqual(otra.logCombate, []);
});

test("derrota tiene recompensa parcial; huida no la conserva", () => {
  const withPhase = (fase) => obtenerResultadoInformeParty({
    ...base, expedicionActiva: { ...expedicion, combate: { ...expedicion.combate, fase } },
  }, null);
  assert.equal(withPhase("derrota").recompensas, recompensa);
  assert.equal(withPhase("huida").recompensas, null);
});

test("victoria legacy: nombre de enemigo sin roster válido y log inválido", () => {
  const resultado = obtenerResultadoInformeParty({
    ...base, expedicionActiva: { ...expedicion, combate: { ...expedicion.combate, enemigos: null, log: "no-array" } },
  }, null);
  assert.deepEqual(resultado.enemigosDerrotados, ["Slime Ácido"]);
  assert.deepEqual(resultado.logCombate, []);
});

test("viaje en curso: no muestra informe de otra expedición", () => {
  const previo = { expedicionPartyId: "exp-1", fase: "victoria", recompensas: recompensa };
  const enCurso = { ...expedicion, combate: { ...expedicion.combate, fase: "activo" } };
  assert.equal(obtenerResultadoInformeParty({ ...base, expedicionActiva: enCurso }, previo), previo);
  assert.equal(obtenerResultadoInformeParty({ ...base, expedicionActiva: { ...enCurso, id: "exp-2" } }, previo), null);
});

test("histórico: preserva resultado local y desaparece fuera de la compañía", () => {
  const historico = { expedicionPartyId: "exp-1", fase: "victoria", recompensas: null, logCombate: ["servidor"], nombre: "Ruinas" };
  const previo = { expedicionPartyId: "exp-1", fase: "victoria", recompensas: recompensa, logCombate: ["local"] };
  const estado = { ...base, ultimoResultadoExpedicion: historico };
  const informe = obtenerResultadoInformeParty(estado, previo);
  assert.equal(informe.recompensas, recompensa);
  assert.deepEqual(informe.logCombate, ["local"]);
  assert.equal(informe.nombre, "Ruinas");
  assert.equal(obtenerResultadoInformeParty({ ...estado, party: null }, previo), null);
  const otro = obtenerResultadoInformeParty({ ...estado, ultimoResultadoExpedicion: { ...historico, expedicionPartyId: "exp-2" } }, previo);
  assert.equal(otro.recompensas, null);
  assert.deepEqual(otro.logCombate, ["servidor"]);
});

test("el resumen de combate solo contiene la recompensa y el botín de su aventurero", () => {
  const liquidacion = {
    liquidacionYaResuelta: true,
    recompensas: [
      { usuarioId: "u1", oro: 35, madera: 3, piedra: 2, metal: 1, experiencia: 20, experienciaJob: 7, objetos: [] },
      { usuarioId: "u2", oro: 70, madera: 9, piedra: 8, metal: 7, experiencia: 30, experienciaJob: 8, objetos: [] },
    ],
    dropsEnemigo: [
      { usuarioId: "u1", nombre: "Espada", sufijoId: "fuego", cantidad: 1 },
      { usuarioId: "u2", nombre: "Daga", sufijoId: null, cantidad: 2 },
      { usuarioId: "u1", nombre: "Poción", sufijoId: null, cantidad: 3 },
    ],
  };
  const entrada = { ...base, expedicionActiva: { ...expedicion, combate: { ...expedicion.combate, recompensasResultado: liquidacion } } };
  const resultado = crearRecompensaInformeCombateParty(entrada, null);
  assert.deepEqual(resultado, {
    oro: 35, madera: 3, piedra: 2, metal: 1, experiencia: 20, experienciaJob: 7,
    botin: ["Espada fuego ×1", "Poción ×3"],
  });
  assert.equal(crearRecompensaInformeCombateParty({ ...entrada, usuarioId: "u3" }, null), null);
});

test("el informe local solo sirve como respaldo si corresponde a la expedición activa", () => {
  const anterior = {
    expedicionPartyId: "exp-1", fase: "victoria", recompensas: {
      liquidacionYaResuelta: true,
      recompensas: [{ usuarioId: "u1", oro: 13, madera: 1, piedra: 0, metal: 0, experiencia: 5, objetos: [] }],
      dropsEnemigo: [],
    },
  };
  const enCurso = { ...base, expedicionActiva: { ...expedicion, combate: { ...expedicion.combate, recompensasResultado: null } } };
  assert.deepEqual(crearRecompensaInformeCombateParty(enCurso, anterior), {
    oro: 13, madera: 1, piedra: 0, metal: 0, experiencia: 5, experienciaJob: 0, botin: [],
  });
  assert.equal(crearRecompensaInformeCombateParty({ ...enCurso, expedicionActiva: { ...enCurso.expedicionActiva, id: "exp-2" } }, anterior), null);
  assert.equal(crearRecompensaInformeCombateParty({ ...base, expedicionActiva: null }, anterior), null);
  assert.equal(crearRecompensaInformeCombateParty(null, anterior), null);
});

test("las recompensas del servidor tienen prioridad sobre las provisionales locales", () => {
  const local = {
    expedicionPartyId: "exp-1", fase: "victoria",
    recompensas: { liquidacionYaResuelta: false, recompensas: [{ usuarioId: "u1", oro: 999, experiencia: 99, objetos: [] }] },
  };
  const definitiva = {
    liquidacionYaResuelta: true,
    recompensas: [{ usuarioId: "u1", oro: 15, madera: 0, piedra: 2, metal: 0, experiencia: 12, objetos: [] }],
  };
  const entrada = { ...base, expedicionActiva: { ...expedicion, combate: { ...expedicion.combate, recompensasResultado: definitiva } } };
  const resultado = crearRecompensaInformeCombateParty(entrada, local);
  assert.equal(resultado.oro, 15);
  assert.equal(resultado.experienciaJob, 0);
  assert.deepEqual(resultado.botin, []);
});
