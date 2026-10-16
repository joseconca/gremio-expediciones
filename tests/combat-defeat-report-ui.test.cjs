const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const leer = (archivo) => fs.readFileSync(path.join(root, archivo), "utf8");

test("las habilidades se ejecutan desde la lista o al tocar el objetivo, sin botón de lanzamiento", () => {
  const modal = leer("src/components/combate/CombateModal.tsx");
  assert.doesNotMatch(modal, /LANZAR HABILIDAD/);
  assert.match(modal, /void ejecutarHabilidad\(h\.habilidadId\)/);
  assert.match(modal, /void ejecutarHabilidad\(habilidadEsperandoObjetivoId, enemigo\.id\)/);
  assert.match(modal, /void ejecutarHabilidad\(habilidadPendiente\.habilidadId, participante\.usuarioId\)/);
  assert.match(modal, /Toca un objetivo en la escena/);
});

test("la derrota presenta oro, XP Base y Job, recursos asegurados y botín realmente obtenido", () => {
  const modal = leer("src/components/combate/CombateModal.tsx");
  const accionesPve = leer("src/server/services/combate/pve.ts");
  const base = leer("src/app/base/page.tsx");
  assert.match(modal, /Informe de combate/);
  assert.match(modal, /Experiencia Base/);
  assert.match(modal, /Experiencia Job/);
  assert.match(modal, /Madera asegurada/);
  assert.match(modal, /Piedra asegurada/);
  assert.match(modal, /Metal asegurado/);
  assert.match(modal, /Botín de criaturas abatidas/);
  assert.match(accionesPve, /calcularRecompensasParcialesDerrota/);
  assert.match(accionesPve, /Botín obtenido:/);
  assert.match(accionesPve, /⭐ Job XP:/);
  assert.match(base, /recompensa=\{expedicionActiva\.recompensa\}/);
});
