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
  assert.ok(!read("src/components/reportes/HojaReporteExpedicion.tsx").includes("reporte.recompensa?.objetos"));
  assert.match(completion, /objetosObtenidos: actualizado\.botinEntregado/);
});

test("el reporte de party mantiene su pergamino, oculta recompensas cero y pliega el registro", () => {
  const panel = read("src/components/base/PanelParty.tsx");
  const service = read("src/server/services/party/party-service.ts");

  assert.match(panel, /cronicaPartyAbierta/);
  assert.match(panel, /aria-controls="cronica-expedicion-party"/);
  assert.match(panel, /fila\.valor > 0/);
  assert.match(panel, /obtenerSpriteObjeto/);
  assert.match(panel, /Has derrotado a/);
  assert.match(service, /duracionSegundos:/);
  assert.match(service, /enemigosDerrotados:/);
  assert.match(service, /logCombate:/);
});

test("el cartel expandido anexa el informe provisional bajo el mapa durante el regreso", () => {
  const panel = read("src/components/base/PanelMisiones.tsx");
  const hoja = read("src/components/reportes/HojaReporteExpedicion.tsx");

  assert.match(panel, /crearReporteAnexoRegreso/);
  assert.match(panel, /expedicionActiva\.fase === "regresando" && reporteAnexo/);
  assert.match(panel, /<HojaReporteExpedicion[\s\S]*presentacion="anexo"/);
  assert.match(panel, /duracionTramoMs \* 2/);
  assert.match(hoja, /presentacion\?: "modal" \| "anexo"/);
  assert.match(hoja, /Informe provisional: el botín adicional/);
});

test("el informe compartido conserva el diseño de pergamino y se anexa bajo el mapa al regresar", () => {
  const panel = read("src/components/base/PanelParty.tsx");

  assert.match(panel, /origenCoords\?: \{ lat: number; lng: number \} \| null/);
  assert.match(panel, /<MissionMap[\s\S]*?destinoExpedicion=\{estado\.expedicionActiva\.destinoCoords\}/);
  assert.match(panel, /regresando=\{estado\.expedicionActiva\.fase === "regresando"\}/);
  assert.match(panel, /estado\.expedicionActiva\.fase === "regresando" && ultimoResultadoCombate\.expedicionPartyId === estado\.expedicionActiva\.id/);
  assert.match(panel, /Gremio · crónica compartida/);
  assert.match(panel, /recompensa\.experienciaJob/);
  assert.match(panel, /obtenerSpriteObjeto/);
});
