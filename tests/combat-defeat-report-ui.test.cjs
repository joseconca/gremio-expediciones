const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const leer = (archivo) => fs.readFileSync(path.join(root, archivo), "utf8");

test("las habilidades se ejecutan desde la lista o al tocar el objetivo, sin botón de lanzamiento", () => {
  const modal = leer("src/components/combate/CombateModal.tsx");
  const panelHabilidades = leer("src/components/combate/PanelHabilidadesCombate.tsx");
  assert.match(modal, /<PanelHabilidadesCombate/);
  assert.doesNotMatch(modal + panelHabilidades, /LANZAR HABILIDAD/);
  assert.match(modal, /void ejecutarHabilidad\(h\.habilidadId, objetivoAutomatico\)/);
  assert.match(modal, /void ejecutarHabilidad\(habilidadEsperandoObjetivoId, enemigo\.id\)/);
  assert.match(modal, /void ejecutarHabilidad\(habilidadPendiente\.habilidadId, participante\.usuarioId\)/);
  assert.match(panelHabilidades, /Toca un objetivo en la escena/);
  assert.match(panelHabilidades, /onSeleccionar\(h\)/);
});

test("la derrota presenta oro, XP Base y Job, recursos asegurados y botín realmente obtenido", () => {
  const modal = leer("src/components/combate/CombateModal.tsx");
  const resultado = leer("src/components/combate/ResultadoCombate.tsx");
  const accionesPve = leer("src/server/services/combate/pve.ts");
  const accionesParty = leer("src/server/services/party/combate-party-actions.ts");
  const liquidacionParty = leer("src/server/services/party/liquidacion-recompensas.ts");
  const panelParty = leer("src/components/base/PanelParty.tsx");
  const informeParty = leer("src/components/base/party/resultado-informe.ts");
  const base = leer("src/app/base/page.tsx");
  assert.match(modal, /<ResultadoCombate/);
  assert.match(resultado, /Informe de combate/);
  assert.match(resultado, /Experiencia Base/);
  assert.match(resultado, /Experiencia Job/);
  assert.match(resultado, /Madera asegurada/);
  assert.match(resultado, /Piedra asegurada/);
  assert.match(resultado, /Metal asegurado/);
  assert.match(resultado, /Botín de criaturas abatidas/);
  assert.match(accionesPve, /calcularRecompensasParcialesDerrota/);
  assert.match(accionesPve, /Botín obtenido:/);
  assert.match(accionesPve, /⭐ Job XP:/);
  assert.match(base, /recompensa=\{expedicionActiva\.recompensa\}/);
  assert.match(accionesParty, /liquidarRecompensasParty/);
  assert.match(liquidacionParty, /calcularRecompensasParcialesDerrota/);
  assert.match(liquidacionParty, /faseResultado === "derrota"/);
  assert.match(liquidacionParty, /for \(const entradaEnemigo of definicionesRecompensables\)/);
  assert.match(liquidacionParty, /recompensasResultado: resultadoRecompensas/);
  assert.match(panelParty, /obtenerResultadoInformeParty\(estadoNuevo, actual\)/);
  assert.match(informeParty, /recompensas: combate\.fase === "victoria" \|\| combate\.fase === "derrota"/);
  assert.match(panelParty, /recompensaInforme=\{recompensaInformeParty/);
});
