require("./load-typescript.cjs");
const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

require.extensions[".css"] = (module) => { module.exports = { commands: "commands" }; };
require.extensions[".tsx"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const ResultadoCombate = require("../src/components/combate/ResultadoCombate.tsx").default;
const InformacionCombatientes = require("../src/components/combate/InformacionCombatientes.tsx").default;
const PanelConsumiblesCombate = require("../src/components/combate/PanelConsumiblesCombate.tsx").default;
const PanelHabilidadesCombate = require("../src/components/combate/PanelHabilidadesCombate.tsx").default;
const ComandosCombate = require("../src/components/combate/ComandosCombate.tsx").default;
const { default: HistorialCombate, HistorialCombateExpandido } = require("../src/components/combate/HistorialCombate.tsx");
const ResultadoAsedio = require("../src/components/combate/ResultadoAsedio.tsx").default;
const InformacionAsedio = require("../src/components/combate/InformacionAsedio.tsx").default;

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

test("el panel de consumibles muestra los porcentajes de curación y conserva el bloqueo al estar lleno", () => {
  const pocion = { id: "inv-1", cantidad: 2, objeto: {
    id: "pocion", nombre: "Poción de vida", descripcion: "Restaura salud",
    tipo: "consumible", curacion: 15, curacionPorcentaje: 0.15,
  } };
  const props = {
    combate: { jugadorHp: 50, jugadorHpMaximo: 100, turno: "jugador" },
    personaje: { energiaActual: 20, energiaMaxima: 100, manaActual: 10, manaMaximo: 50 },
    objetosConsumibles: [pocion],
    objetoSeleccionadoId: "inv-1",
    ocupado: false,
    onSeleccionarObjeto() {}, onUsarObjeto: async () => {}, onCerrar() {},
  };
  const disponible = renderToStaticMarkup(React.createElement(PanelConsumiblesCombate, props));
  assert.match(disponible, /Poción de vida/);
  assert.match(disponible, /2 disponibles/);
  assert.match(disponible, /\+30 PV/);
  assert.match(disponible, /USAR OBJETO/);

  const lleno = renderToStaticMarkup(React.createElement(PanelConsumiblesCombate, {
    ...props, combate: { ...props.combate, jugadorHp: 100 },
  }));
  assert.match(lleno, /Recursos al máximo/);
  assert.match(lleno, /disabled=""/);
});

test("el panel de habilidades respeta energía, cooldown y objetivo pendiente", () => {
  const habilidad = {
    id: "equipada-1",
    habilidadId: "primeros_auxilios",
    habilidad: {
      nombre: "Primeros auxilios",
      descripcion: "Cura a un compañero.",
      rareza: "Basica",
      costeEnergia: 10,
      costeMana: 0,
      cooldownTurnos: 2,
      curacion: 15,
    },
  };
  const base = {
    habilidades: [habilidad],
    habilidadSeleccionadaId: habilidad.habilidadId,
    habilidadEsperandoObjetivoId: null,
    energiaActual: 20,
    manaActual: 10,
    ocupado: false,
    puedeActuarJugador: true,
    obtenerCooldown: () => 0,
    onSeleccionar() {},
    onPrevisualizar() {},
    onCerrar() {},
  };
  const render = (props) => renderToStaticMarkup(React.createElement(PanelHabilidadesCombate, { ...base, ...props }));
  const disponible = render({});
  assert.match(disponible, /Habilidades equipadas/);
  assert.match(disponible, /Primeros auxilios/);
  assert.match(disponible, /10 ENE/);
  assert.match(disponible, /Curación:/);
  assert.match(disponible, /aria-label="Usar habilidad Primeros auxilios"/);
  const botonHabilidad = (html) => html.match(/<button[^>]*aria-label="Usar habilidad Primeros auxilios"[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(botonHabilidad(disponible), /\sdisabled=""/);

  const bloqueadaEnergia = render({ energiaActual: 0 });
  assert.match(botonHabilidad(bloqueadaEnergia), /\sdisabled=""/);
  const bloqueadaCooldown = render({ obtenerCooldown: () => 3 });
  assert.match(bloqueadaCooldown, /CD 3/);
  assert.match(botonHabilidad(bloqueadaCooldown), /\sdisabled=""/);

  const objetivo = render({ habilidadEsperandoObjetivoId: habilidad.habilidadId });
  assert.match(objetivo, /Toca un objetivo en la escena/);
  assert.match(objetivo, /ELIGE OBJETIVO/);
});


test("el historial mantiene la vista compacta, la ampliada y la opción de reducir", () => {
  const lineas = ["Primer ataque", "Segundo ataque", "Cura de prueba", "Cuarto ataque", "Quinto ataque"];
  const compacto = renderToStaticMarkup(React.createElement(HistorialCombate, {
    lineas, onAmpliar() {},
  }));
  assert.match(compacto, /Ampliar historial/);
  assert.doesNotMatch(compacto, /Primer ataque/);
  for (const linea of lineas.slice(-4)) assert.ok(compacto.includes(linea), linea);

  const ampliado = renderToStaticMarkup(React.createElement(HistorialCombateExpandido, {
    lineas, onReducir() {},
  }));
  assert.match(ampliado, /Historial del Combate/);
  assert.match(ampliado, /aria-label="Reducir historial"/);
  for (const linea of lineas) assert.ok(ampliado.includes(linea), linea);

  const vacio = renderToStaticMarkup(React.createElement(HistorialCombateExpandido, {
    lineas: [], onReducir() {},
  }));
  assert.match(vacio, /El combate comienza/);
});

test("los comandos son presentacionales y reflejan la disponibilidad de cada acción", () => {
  const base = {
    mostrarHabilidades: false,
    mostrarObjetos: false,
    accionesDeshabilitadas: false,
    huidaDeshabilitada: false,
    hayHabilidades: true,
    cantidadObjetos: 3,
    onAtacar() {}, onHabilidades() {}, onObjetos() {}, onSolicitarHuida() {},
  };
  const render = (props) => renderToStaticMarkup(React.createElement(ComandosCombate, { ...base, ...props }));
  const html = render({});
  for (const accion of ["ATACAR", "HABILIDADES", "OBJETOS", "HUIR"]) {
    assert.ok(html.includes(accion), accion);
  }
  assert.match(html, /data-active="true"/);
  assert.equal((html.match(/disabled=""/g) || []).length, 0);

  const bloqueado = render({
    mostrarHabilidades: true,
    accionesDeshabilitadas: true,
    huidaDeshabilitada: true,
    hayHabilidades: false,
    cantidadObjetos: 0,
  });
  assert.match(bloqueado, /data-active="false"/);
  assert.equal((bloqueado.match(/disabled=""/g) || []).length, 4);
});

test("el resultado de un asedio distingue victoria, derrota y rol del jugador", () => {
  const render = (props) => renderToStaticMarkup(React.createElement(ResultadoAsedio, {
    fase: "victoria", esAtacante: true, nombreRival: "Rival", onCerrar() {}, ...props,
  }));
  assert.match(render({}), /VICTORIA/);
  assert.match(render({}), /Has derrotado a Rival/);
  assert.match(render({}), /CONTINUAR/);
  assert.match(render({ esAtacante: false }), /Has defendido el gremio/);
  assert.match(render({ fase: "derrota", esAtacante: true }), /Has sido derrotado por Rival/);
  assert.match(render({ fase: "derrota", esAtacante: false }), /El atacante Rival ha vencido/);
});

test("la información de asedio conserva estadísticas de atacante y defensor", () => {
  const combateAsedio = {
    jugadorPosicion: "mele", enemigoPosicion: "retaguardia",
    jugadorAtaque: 20, enemigoAtaque: 12,
    jugadorDefensa: 17, enemigoDefensa: 8,
    jugadorVelocidad: 11, enemigoVelocidad: 9,
    jugadorPrecision: 75, enemigoPrecision: 65,
    jugadorEvasion: 0.1, enemigoEvasion: 0.05,
    jugadorProbCritico: 0.12, enemigoProbCritico: 0.08,
    jugadorDanoCritico: 2, enemigoDanoCritico: 1.5,
  };
  const personajeAsedio = {
    nombre: "Guerrera", clase: "Novato", nivel: 6, nivelJob: 3,
    profesionActivaId: "novato", ataqueMagico: 3, defensaMagica: 4, precision: 75, evasion: 0.1,
    fuerza: 7, agilidad: 5, vitalidad: 6, inteligencia: 2, destreza: 4, suerte: 3,
  };
  const props = {
    combate: combateAsedio, personaje: personajeAsedio, esAtacante: true,
    nombreRival: "Caballero", claseRival: "caballero", nombreClaseActiva: "Novato",
    hpMaximoPropio: 120,
    statsRival: { hpMaximo: 90, ataque: 12, defensa: 8, velocidad: 9, nivel: 5 },
    panelStatsRival: "rival",
    onCambiarPanel() {}, onCerrar() {},
  };
  const render = (p) => renderToStaticMarkup(React.createElement(InformacionAsedio, { ...props, ...p }));
  const rival = render({});
  assert.match(rival, /Información del asedio/);
  assert.match(rival, /Caballero/);
  assert.match(rival, /Posición:/);
  assert.match(rival, /Daño crítico/);
  const jugador = render({ panelStatsRival: "jugador" });
  assert.match(jugador, /Guerrera/);
  assert.match(jugador, /Nivel Base 6/);
  assert.match(jugador, /Atributos/);
  assert.match(jugador, /Defensa mágica/);
});
