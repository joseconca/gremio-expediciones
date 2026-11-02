require("./load-typescript.cjs");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

require.extensions[".tsx"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const ResultadoCombate = require("../src/components/combate/ResultadoCombate.tsx").default;
const InformacionCombatientes = require("../src/components/combate/InformacionCombatientes.tsx").default;

const combate = {
  fase: "derrota",
  enemigoNombre: "Lobo",
  oroGanado: 7,
  experienciaGanada: 12,
  log: [
    "⭐ Job XP: 4",
    "🎲 Botín de Lobo: Espada del bosque para u1.",
    "🎲 Botín de Lobo: Capa de otro jugador para u2.",
    "🎒 El botín de Lobo para u1 se ha perdido porque su inventario está lleno.",
  ],
};

test("el informe de derrota muestra los recursos y botín del jugador correcto", () => {
  const html = renderToStaticMarkup(React.createElement(ResultadoCombate, {
    combate,
    nombrePersonaje: "Heroína",
    usuarioPartyId: "u1",
    esParty: true,
    enemigosDerrotados: [{ nombre: "Lobo" }],
    recompensaInforme: null,
    recompensa: { madera: 3, piedra: 2, metal: 1 },
    onCerrar() {},
  }));
  assert.match(html, /DERROTA/);
  assert.match(html, /Criaturas abatidas: Lobo/);
  for (const etiqueta of ["Experiencia Base", "Experiencia Job", "Oro asegurado", "Madera asegurada", "Piedra asegurada", "Metal asegurado"]) {
    assert.ok(html.includes(etiqueta), etiqueta);
  }
  assert.match(html, /Espada del bosque/);
  assert.doesNotMatch(html, /Capa de otro jugador/);
  assert.match(html, /Inventario lleno/);
  assert.match(html, /CONTINUAR/);
});

test("el resultado de victoria individual no muestra un informe de derrota", () => {
  const html = renderToStaticMarkup(React.createElement(ResultadoCombate, {
    combate: { ...combate, fase: "victoria" },
    nombrePersonaje: "Heroína",
    esParty: false,
    enemigosDerrotados: [],
  }));
  assert.match(html, /VICTORIA/);
  assert.match(html, /Heroína ha derrotado a Lobo/);
  assert.doesNotMatch(html, /Madera asegurada/);
});

test("la ventana de información conserva los paneles de aliados y enemigos", () => {
  const personaje = { nombre: "Heroína", clase: "Novato", nivel: 3 };
  const enemigosVisibles = [{
    id: "enemigo-1", nombre: "Lobo", nivel: 2, hp: 20, hpMaximo: 30,
    posicion: "mele", ataque: 6, ataqueMagico: 2, defensa: 4, defensaMagica: 1,
    velocidad: 5, precision: 75, evasion: 0.05, probCritico: 0.1, danoCritico: 1.5,
    efectos: [],
  }];
  const comunes = { combate, personaje, enemigosVisibles, onCambiarPanel() {}, onCerrar() {} };
  const enemigo = renderToStaticMarkup(React.createElement(InformacionCombatientes, {
    ...comunes, panelStats: "enemigo",
  }));
  assert.match(enemigo, /Información de combate/);
  assert.match(enemigo, /Enemigos · 1/);
  assert.match(enemigo, /Lobo/);
  assert.match(enemigo, /Ataque mágico/);

  const aliado = renderToStaticMarkup(React.createElement(InformacionCombatientes, {
    ...comunes, panelStats: "jugador",
    partyMode: { participantes: [{
      id: "p1", nombre: "Heroína", clase: "Novato", esLider: true, jugadorNivel: 3,
      jugadorPosicion: "centro", estado: "activo", jugadorHp: 60, jugadorHpMaximo: 80,
      jugadorAtaque: 9, jugadorAtaqueMagico: 4, jugadorDefensa: 5, jugadorDefensaMagica: 3,
      jugadorVelocidad: 6, jugadorPrecision: 80, jugadorEvasion: 0.1,
      jugadorProbCritico: 0.05, jugadorDanoCritico: 1.5, efectos: [],
    }] },
  }));
  assert.match(aliado, /Party · 1/);
  assert.match(aliado, /Heroína/);
  assert.match(aliado, /PV actuales/);
});
