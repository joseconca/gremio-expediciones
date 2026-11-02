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
  const recompensas = read("src/components/base/party/RecompensasInformeParty.tsx");
  assert.match(panel, /<RecompensasInformeParty/);
  assert.match(recompensas, /fila\.valor > 0/);
  assert.match(recompensas, /obtenerSpriteObjeto/);
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

  const tipos = read("src/components/base/party/tipos.ts");
  assert.match(tipos, /origenCoords\?: \{ lat: number; lng: number \} \| null/);
  assert.match(panel, /<MissionMap[\s\S]*?destinoExpedicion=\{estado\.expedicionActiva\.destinoCoords\}/);
  assert.match(panel, /regresando=\{estado\.expedicionActiva\.fase === "regresando"\}/);
  assert.match(panel, /estado\.expedicionActiva\.fase === "regresando" && ultimoResultadoCombate\.expedicionPartyId === estado\.expedicionActiva\.id/);
  assert.match(panel, /Gremio · crónica compartida/);
  const recompensas = read("src/components/base/party/RecompensasInformeParty.tsx");
  assert.match(panel, /<RecompensasInformeParty/);
  assert.match(recompensas, /recompensa\.experienciaJob/);
  assert.match(recompensas, /obtenerSpriteObjeto/);
});

test("la crónica histórica de party empieza contraída y se expande al pulsar su cabecera", () => {
  const panel = read("src/components/base/PanelParty.tsx");

  assert.match(panel, /setEstadoInformeHistoricoParty/);
  assert.match(panel, /claveInformeHistoricoParty/);
  assert.match(panel, /estadoInformeHistoricoParty\.clave === claveInformeHistoricoParty && estadoInformeHistoricoParty\.abierto/);
  const informe = read("src/components/base/party/InformeHistoricoParty.tsx");
  assert.match(panel, /<InformeHistoricoParty/);
  assert.match(informe, /onClick=\{alternarInformeHistoricoParty\}/);
  assert.match(informe, /aria-expanded=\{informeHistoricoPartyAbierto\}/);
  assert.match(informe, /aria-controls="detalle-informe-historico-party"/);
  assert.match(informe, /\{informeHistoricoPartyAbierto && \(/);
  assert.doesNotMatch(panel, /setInformeHistoricoPartyAbierto\(false\)/);
});

test("toda la hoja de compañía tiene un tono más sólido y suave que el papel de misión", () => {
  const panel = read("src/components/base/PanelParty.tsx");

  assert.match(panel, /border-\[#995f56\] bg-\[linear-gradient\(155deg,#dfb1a7_0%,#d09a90_58%,#c38980_100%\)\]/);
  assert.match(panel, /bg-\[#edc5bc\] p-2 sm:p-3/);
  assert.match(panel, /bg-\[linear-gradient\(135deg,#bd776d_0%,#aa6158_58%,#98534b_100%\)\]/);
  assert.match(panel, /Aviso de compañía/);
  assert.match(panel, /focus-visible:ring-\[#f0c77f\]/);
});

test("el mismo desglose de recompensas sirve al informe provisional y al histórico", () => {
  const panel = read("src/components/base/PanelParty.tsx");
  const historico = read("src/components/base/party/InformeHistoricoParty.tsx");
  const recompensas = read("src/components/base/party/RecompensasInformeParty.tsx");
  assert.match(panel, /<RecompensasInformeParty/);
  assert.match(historico, /<RecompensasInformeParty/);
  assert.match(recompensas, /filas\.length === 0 && objetos\.length === 0/);
  assert.match(recompensas, /dropsEnemigo/);
  assert.match(recompensas, /nivelesJobSubidos/);
  assert.match(recompensas, /No hay recompensas de combate disponibles/);
  assert.doesNotMatch(panel, /filas\.length === 0 && objetos\.length === 0/);
  assert.doesNotMatch(historico, /filas\.length === 0 && objetos\.length === 0/);
});
