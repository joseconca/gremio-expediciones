const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

test("el tablón presenta comercio amarillento, asedio rojizo y expedición normal blanquecina", () => {
  const misiones = read("src/components/base/PanelMisiones.tsx");
  assert.match(misiones, /bg-\[linear-gradient\(155deg,#eadbb8_0%,#dec99e_54%,#cdb486_100%\)\]/);
  assert.match(misiones, /bg-\[linear-gradient\(155deg,#f1c9bd_0%,#e5aaa0_58%,#d48b81_100%\)\]/);
  assert.match(misiones, /bg-\[linear-gradient\(155deg,#fffef8_0%,#f0efe8_54%,#deddd3_100%\)\]/);
  assert.match(misiones, /aria-expanded=\{expedicionExpandida\}/);
});

test("la compañía tiene una hoja rojiza expandible y la expedición compartida conserva su propio desplegable", () => {
  const party = read("src/components/base/PanelParty.tsx");
  assert.match(party, /bg-\[linear-gradient\(155deg,#f1c9bd_0%,#e5aaa0_58%,#d48b81_100%\)\]/);
  assert.match(party, /aria-expanded=\{partyDetalleAbierto\}/);
  assert.match(party, /aria-expanded=\{expedicionDetalleAbierto\}/);
});

test("las visitas entrantes conservan confirmación del servidor, permisos y acciones de aceptación", () => {
  const panel = read("src/components/base/PanelParty.tsx");
  const visitas = read("src/components/base/party/VisitasEntrantesParty.tsx");
  assert.match(panel, /<VisitasEntrantesParty/);
  assert.match(panel, /ejecutar=\{ejecutar\}/);
  assert.match(visitas, /haLlegadoEnServidor \?\? restante === 0/);
  assert.match(visitas, /restante === 0 && !haLlegado/);
  assert.match(visitas, /disabled=\{Boolean\(accion\) \|\| !puedeGestionarVisitasParty \|\| ocupado\}/);
  assert.match(visitas, /\/api\/party\/transfer\/aceptar/);
  assert.match(visitas, /\/api\/party\/transfer\/rechazar/);
});
