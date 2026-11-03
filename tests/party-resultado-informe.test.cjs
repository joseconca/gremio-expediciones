require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { obtenerResultadoInformeParty } = require("../src/components/base/party/resultado-informe.ts");

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
