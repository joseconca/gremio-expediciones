require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { resolverDestinosVisualesAccion } = require("../src/lib/expediciones/destinos-animacion-combate.ts");

function accion(overrides = {}) {
  return { actor: "jugador", tipo: "ataque", animacion: "ofensiva", dano: 12, critico: false, texto: "Ataque de prueba", ...overrides };
}

test("PvE conserva jugador -> enemigo y enemigo -> jugador", () => {
  const ataque = resolverDestinosVisualesAccion({ accion: accion(), contexto: { modo: "pve" } });
  assert.equal(ataque.actorVisual, "jugador");
  assert.equal(ataque.objetivoVisual, "enemigo");
  const represalia = resolverDestinosVisualesAccion({ accion: accion({ actor: "enemigo" }), contexto: { modo: "pve" } });
  assert.equal(represalia.actorVisual, "enemigo");
  assert.equal(represalia.objetivoVisual, "jugador");
});

test("la curación propia mantiene al actor como destino visual", () => {
  const r = resolverDestinosVisualesAccion({ accion: accion({ tipo: "habilidad", animacion: "curacion", dano: 0, curacion: 18 }), contexto: { modo: "pve" } });
  assert.equal(r.objetivoVisual, "jugador");
});

test("party respeta el ID explícito del atacante, objetivo y pulsos", () => {
  const r = resolverDestinosVisualesAccion({
    accion: accion({ actorUsuarioId: "miembro-1", objetivoUsuarioId: "miembro-2", pulsosEstado: [{ objetivo: "jugador", objetivoUsuarioId: "miembro-2", tipo: "dano", cantidad: 3 }] }),
    contexto: { modo: "party", usuarioId: "miembro-3" },
  });
  assert.equal(r.actorVisual, "miembro-1");
  assert.equal(r.objetivoVisual, "miembro-2");
  assert.deepEqual(r.pulsosEstadoVisibles, [{ actor: "miembro-2", tipo: "dano", cantidad: 3 }]);
});

test("el turno enemigo de party usa el participante objetivo real y fallback solo si falta", () => {
  const r = resolverDestinosVisualesAccion({ accion: accion({ actor: "enemigo", objetivoUsuarioId: "miembro-2", pulsosEstado: [{ objetivo: "jugador", tipo: "curacion", cantidad: 2 }] }), contexto: { modo: "party", usuarioId: "miembro-1" } });
  assert.equal(r.actorVisual, "enemigo");
  assert.equal(r.objetivoVisual, "miembro-2");
  assert.deepEqual(r.pulsosEstadoVisibles, [{ actor: "miembro-2", tipo: "curacion", cantidad: 2 }]);
  const fallback = resolverDestinosVisualesAccion({ accion: accion({ actor: "enemigo" }), contexto: { modo: "party", usuarioId: "miembro-1" } });
  assert.equal(fallback.objetivoVisual, "miembro-1");
});

test("PvP convierte origen, destino y pulsos desde la perspectiva del defensor", () => {
  const r = resolverDestinosVisualesAccion({ accion: accion({ actor: "jugador", pulsosEstado: [{ objetivo: "enemigo", tipo: "dano", cantidad: 4 }, { objetivo: "jugador", tipo: "curacion", cantidad: 5 }] }), contexto: { modo: "pvp", esAtacante: false } });
  assert.equal(r.actorVisual, "enemigo");
  assert.equal(r.objetivoVisual, "jugador");
  assert.deepEqual(r.pulsosEstadoVisibles, [{ actor: "jugador", tipo: "dano", cantidad: 4 }, { actor: "enemigo", tipo: "curacion", cantidad: 5 }]);
});

test("el robo de vida sigue siendo un ataque con curación secundaria al actor", () => {
  const r = resolverDestinosVisualesAccion({ accion: accion({ tipo: "habilidad", animacion: "ofensiva_potenciada", dano: 20, curacion: 6, presentacion: { modo: "proyectil", proyectil: "orbe_sombra", elemento: "sombras" } }), contexto: { modo: "party", usuarioId: "miembro-1" }, actorUsuarioId: "miembro-1" });
  assert.equal(r.actorVisual, "miembro-1");
  assert.equal(r.objetivoVisual, "enemigo");
});