require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { consultarEstadoParty, enviarAccionParty, prepararPayloadAccionCombateParty, enviarAccionCombateParty, enviarTurnoEnemigoParty, intervaloConsultaParty } =
  require("../src/components/base/party/cliente.ts");

test("payload de ataque: conserva objetivo enemigo solo cuando llega JSON válido", () => {
  const id = JSON.stringify({ enemigoObjetivoId: "enemigo-2", objetivoId: "aliado-1" });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "atacar", id), {
    expedicionPartyId: "exp-1", accion: "atacar", enemigoObjetivoId: "enemigo-2",
  });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "atacar", "enemigo-2"), {
    expedicionPartyId: "exp-1", accion: "atacar",
  });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "atacar", JSON.stringify({ enemigoObjetivoId: 23 })), {
    expedicionPartyId: "exp-1", accion: "atacar",
  });
});

test("payload de habilidades: admite objetivo aliado, enemigo y habilidad legacy", () => {
  const habilidad = JSON.stringify({ habilidadId: "cura", objetivoId: "aliado-2", enemigoObjetivoId: "enemigo-1", ignorar: 42 });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "usar_habilidad", habilidad), {
    expedicionPartyId: "exp-1", accion: "usar_habilidad",
    habilidadId: "cura", objetivoId: "aliado-2", enemigoObjetivoId: "enemigo-1",
  });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "usar_habilidad", "cura"), {
    expedicionPartyId: "exp-1", accion: "usar_habilidad", habilidadId: "cura",
  });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "usar_habilidad", "{}"), {
    expedicionPartyId: "exp-1", accion: "usar_habilidad",
  });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "usar_habilidad", "null"), {
    expedicionPartyId: "exp-1", accion: "usar_habilidad", habilidadId: "null",
  });
});

test("payload de objetos, posición y huida conserva los nombres de campo del servidor", () => {
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "usar_objeto", "inv-1"), {
    expedicionPartyId: "exp-1", accion: "usar_objeto", objetoInventarioId: "inv-1",
  });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "cambiar_posicion", "retaguardia"), {
    expedicionPartyId: "exp-1", accion: "cambiar_posicion", posicion: "retaguardia",
  });
  assert.deepEqual(prepararPayloadAccionCombateParty("exp-1", "escapar"), {
    expedicionPartyId: "exp-1", accion: "escapar",
  });
});

async function conFetchSimulado(simular, tarea) {
  const original = global.fetch;
  const peticiones = [];
  global.fetch = async (url, opciones) => {
    peticiones.push({ url, opciones });
    return simular(url, opciones);
  };
  try { await tarea(peticiones); }
  finally { global.fetch = original; }
}

test("consulta party: cache no-store, datos intactos y error del backend", async () => {
  await conFetchSimulado(async () => ({ ok: true, json: async () => ({ usuarioId: "u1", party: null }) }), async (peticiones) => {
    assert.deepEqual(await consultarEstadoParty(), { usuarioId: "u1", party: null });
    assert.deepEqual(peticiones, [{ url: "/api/party", opciones: { cache: "no-store" } }]);
  });
  await conFetchSimulado(async () => ({ ok: false, json: async () => ({ error: "No permitido" }) }), async () => {
    await assert.rejects(consultarEstadoParty(), /No permitido/);
  });
});

test("acciones de tablón: POST con identificador configurable y errores intactos", async () => {
  await conFetchSimulado(async () => ({ ok: true, json: async () => ({}) }), async (peticiones) => {
    await enviarAccionParty("/api/party/transfer/llegar", "traslado-1");
    await enviarAccionParty("/api/expediciones/party/regreso", "exp-1", "expedicionPartyId");
    await enviarAccionParty("/api/party/abandonar");
    assert.deepEqual(peticiones.map((p) => [p.url, JSON.parse(p.opciones.body)]), [
      ["/api/party/transfer/llegar", { trasladoId: "traslado-1" }],
      ["/api/expediciones/party/regreso", { expedicionPartyId: "exp-1" }],
      ["/api/party/abandonar", {}],
    ]);
    assert.ok(peticiones.every((p) => p.opciones.method === "POST" && p.opciones.headers["Content-Type"] === "application/json"));
  });
  await conFetchSimulado(async () => ({ ok: false, json: async () => ({ error: "Otra pestaña" }) }), async () => {
    await assert.rejects(enviarAccionParty("/api/party/disolver"), /Otra pestaña/);
  });
});

test("combate party: petición, resultado y rechazo mantienen el contrato HTTP", async () => {
  const accion = { actor: "u1", dano: 7 };
  await conFetchSimulado(async () => ({ ok: true, json: async () => ({ fase: "activo", accion }) }), async (peticiones) => {
    const respuesta = await enviarAccionCombateParty("exp-1", "atacar", '{"enemigoObjetivoId":"e2"}');
    assert.equal(respuesta.accion, accion);
    assert.equal(peticiones[0].url, "/api/expediciones/party/combate/accion");
    assert.equal(peticiones[0].opciones.method, "POST");
    assert.deepEqual(JSON.parse(peticiones[0].opciones.body), {
      expedicionPartyId: "exp-1", accion: "atacar", enemigoObjetivoId: "e2",
    });
  });
  await conFetchSimulado(async () => ({ ok: false, json: async () => ({ error: "Turno cambiado" }) }), async () => {
    await assert.rejects(enviarAccionCombateParty("exp-1", "atacar"), /Turno cambiado/);
  });
});

test("sondeo de party prioriza combate, expedición, traslados y visitas próximas", () => {
  const ahora = Date.parse("2026-11-03T12:00:00Z");
  const base = { party: null, expedicionActiva: null, trasladosPropios: [], visitasEntrantes: [] };
  assert.equal(intervaloConsultaParty(null, ahora), 30000);
  assert.equal(intervaloConsultaParty(base, ahora), 30000);
  assert.equal(intervaloConsultaParty({ ...base, party: { id: "p1" } }, ahora), 15000);
  const visita = (segundos, confirmada = false) => ({
    fechaLlegada: new Date(ahora + segundos * 1000).toISOString(),
    haLlegadoEnServidor: confirmada,
  });
  assert.equal(intervaloConsultaParty({ ...base, visitasEntrantes: [visita(16)] }, ahora), 5000);
  assert.equal(intervaloConsultaParty({ ...base, visitasEntrantes: [visita(15)] }, ahora), 2000);
  assert.equal(intervaloConsultaParty({ ...base, visitasEntrantes: [visita(-1)] }, ahora), 2000);
  assert.equal(intervaloConsultaParty({ ...base, visitasEntrantes: [visita(4, true)] }, ahora), 5000);
  assert.equal(intervaloConsultaParty({ ...base, trasladosPropios: [{ id: "t1" }], visitasEntrantes: [visita(2)] }, ahora), 5000);
  assert.equal(intervaloConsultaParty({ ...base, expedicionActiva: { fase: "en_viaje" }, visitasEntrantes: [visita(2)] }, ahora), 5000);
  assert.equal(intervaloConsultaParty({ ...base, expedicionActiva: { fase: "combatiendo" }, trasladosPropios: [{ id: "t1" }] }, ahora), 3000);
});

test("turno enemigo party: POST único con la expedición y error del servidor", async () => {
  const datosTurno = { fase: "activo", accion: { actor: "enemigo-1", dano: 4 } };
  await conFetchSimulado(async () => ({ ok: true, json: async () => datosTurno }), async (peticiones) => {
    assert.equal(await enviarTurnoEnemigoParty("exp-1"), datosTurno);
    assert.deepEqual(peticiones, [{
      url: "/api/expediciones/party/combate/turno-enemigo",
      opciones: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expedicionPartyId: "exp-1" }),
      },
    }]);
  });
  await conFetchSimulado(async () => ({ ok: false, json: async () => ({ error: "Versión desactualizada" }) }), async () => {
    await assert.rejects(enviarTurnoEnemigoParty("exp-1"), /Versión desactualizada/);
  });
  await conFetchSimulado(async () => ({ ok: false, json: async () => { throw new Error("sin JSON"); } }), async () => {
    await assert.rejects(enviarTurnoEnemigoParty("exp-1"), /No se pudo resolver el turno del enemigo/);
  });
});
