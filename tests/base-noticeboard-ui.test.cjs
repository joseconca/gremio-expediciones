const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("./load-typescript.cjs");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
require.extensions[".tsx"] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  }).outputText,
  filename,
);
const ConfirmacionDisolucionParty = require("../src/components/base/party/ConfirmacionDisolucionParty.tsx").default;

const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

test("el tablón presenta comercio amarillento, asedio rojizo y expedición normal blanquecina", () => {
  const misiones = read("src/components/base/PanelMisiones.tsx");
  assert.match(misiones, /bg-\[linear-gradient\(155deg,#eadbb8_0%,#dec99e_54%,#cdb486_100%\)\]/);
  assert.match(misiones, /bg-\[linear-gradient\(155deg,#f1c9bd_0%,#e5aaa0_58%,#d48b81_100%\)\]/);
  assert.match(misiones, /bg-\[linear-gradient\(155deg,#fffef8_0%,#f0efe8_54%,#deddd3_100%\)\]/);
  assert.match(misiones, /aria-expanded=\{expedicionExpandida\}/);
});

test("la compañía mantiene su desplegable y la expedición compartida el suyo propio", () => {
  const party = read("src/components/base/PanelParty.tsx");
  const aviso = read("src/components/base/party/AvisoCompaniaParty.tsx");
  const expedicion = read("src/components/base/party/ExpedicionActivaParty.tsx");
  assert.match(party, /<ExpedicionActivaParty/);
  assert.match(aviso, /aria-expanded=\{partyDetalleAbierto\}/);
  assert.match(expedicion, /aria-expanded=\{expedicionDetalleAbierto\}/);
  assert.match(expedicion, /<MissionMap/);
  assert.match(expedicion, /<InformeProvisionalParty/);
  assert.match(expedicion, /onAbrirCombate/);
  assert.match(expedicion, /#f1c9bd_0%,#e5aaa0_58%,#d48b81_100%/);
});

test("las visitas entrantes conservan confirmación del servidor, permisos y acciones de aceptación", () => {
  const panel = read("src/components/base/party/AvisoCompaniaParty.tsx");
  const contenedor = read("src/components/base/PanelParty.tsx");
  assert.match(contenedor, /<AvisoCompaniaParty/);
  const visitas = read("src/components/base/party/VisitasEntrantesParty.tsx");
  assert.match(panel, /<VisitasEntrantesParty/);
  assert.match(panel, /ejecutar=\{ejecutar\}/);
  assert.match(visitas, /haLlegadoEnServidor \?\? restante === 0/);
  assert.match(visitas, /restante === 0 && !haLlegado/);
  assert.match(visitas, /disabled=\{Boolean\(accion\) \|\| !puedeGestionarVisitasParty \|\| ocupado\}/);
  assert.match(visitas, /\/api\/party\/transfer\/aceptar/);
  assert.match(visitas, /\/api\/party\/transfer\/rechazar/);
});

test("los traslados de party conservan mapa, regreso y mensajes durante la espera", () => {
  const panel = read("src/components/base/party/AvisoCompaniaParty.tsx");
  const contenedor = read("src/components/base/PanelParty.tsx");
  assert.match(contenedor, /<AvisoCompaniaParty/);
  const traslados = read("src/components/base/party/TrasladosPropiosParty.tsx");
  assert.match(panel, /<TrasladosPropiosParty/);
  assert.match(panel, /ejecutar=\{ejecutar\}/);
  assert.match(traslados, /<MissionMap/);
  assert.match(traslados, /regresando=\{regresando\}/);
  assert.match(traslados, /\/api\/party\/transfer\/volver/);
  assert.match(traslados, /traslado\.decision === "lider_disuelve"/);
  assert.match(traslados, /traslado\.decision === "visitante_volver"/);
});

test("la confirmación de disolución conserva los avisos y bloquea ambos botones durante la petición", () => {
  const props = { enViaje: false, accion: null, onCancelar() {}, onConfirmar() {} };
  const render = (data) => renderToStaticMarkup(React.createElement(ConfirmacionDisolucionParty, { ...props, ...data }));
  const reposo = render({});
  assert.match(reposo, /¿Disolver la compañía\?/);
  assert.match(reposo, /Los integrantes regresarán a sus bases/);
  assert.match(reposo, /Sí, disolver/);
  assert.match(reposo, /aria-modal="true"/);
  assert.match(render({ enViaje: true }), /Se cancelará el contrato antes del combate/);
  const enviando = render({ accion: "disolver" });
  assert.match(enviando, /Disolviendo\.\.\./);
  assert.equal((enviando.match(/disabled=""/g) || []).length, 2);
});
