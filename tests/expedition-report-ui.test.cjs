const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("el informe compartido usa pergamino, oculta vida perdida y pliega la crónica", () => {
  const hoja = read("src/components/reportes/HojaReporteExpedicion.tsx");

  assert.match(hoja, /bg-\[linear-gradient\(155deg,#fffef8/);
  assert.match(hoja, /bg-\[linear-gradient\(155deg,#eadbb8/);
  assert.match(hoja, /aria-expanded=\{cronicaAbierta\}/);
  assert.match(hoja, /setCronicaAbierta/);
  assert.match(hoja, /obtenerSpriteObjeto/);
  assert.match(hoja, /fila\.cantidad > 0/);
  assert.match(hoja, /Afinidad entre gremios/);
  assert.doesNotMatch(hoja, /hpPerdido|Daño sufrido|Vida perdida/);
});

test("los reportes individuales conservan duración, Job XP, objetos y crónica comercial", () => {
  const completion = read("src/server/services/expediciones/completar-expedicion.ts");

  assert.match(completion, /duracionSegundos/);
  assert.match(completion, /experienciaJobGanada/);
  assert.match(completion, /enemigosDerrotados/);
  assert.match(completion, /objetivoNombre/);
  assert.match(completion, /logComercio: resultado\.logCombate/);
  assert.match(completion, /objetosObtenidos: actualizado\\.botinEntregado/);
  assert.doesNotMatch(read("src/components/reportes/HojaReporteExpedicion.tsx"), /recompensa\\?\\.objetos/);
  assert.match(completion, /objetosObtenidos: actualizado\.botinEntregado/);
});

test("el reporte de party mantiene su pergamino, oculta recompensas cero y pliega el registro", () => {
  const panel = read("src/components/base/PanelParty.tsx");
  const service = read("src/server/services/party/party-service.ts");

  assert.match(panel, /cronicaPartyAbierta/);
  assert.match(panel, /Consultar crónica del combate/);
  assert.match(panel, /fila\.valor > 0/);
  assert.match(panel, /obtenerSpriteObjeto/);
  assert.match(panel, /Has derrotado a/);
  assert.match(service, /duracionSegundos:/);
  assert.match(service, /enemigosDerrotados:/);
  assert.match(service, /logCombate:/);
});
