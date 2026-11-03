require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  convertirEstadosTacticos,
  exportarEstadosTacticos,
  resolverTecnicaAdicional,
} = require("../src/lib/expediciones/adaptador-tactico.ts");

const efectoPeriodico = (tipo, habilidadId, valor, turnosRestantes) => ({
  habilidadId,
  tipo,
  valor,
  duracionTurnos: 3,
  turnosRestantes,
  objetivo: "enemigo",
});

const unidad = (estados = [], limites = {}) => ({
  id: "jugador",
  equipo: "aliado",
  hp: 50,
  hpMaximo: 100,
  energia: 20,
  energiaMaxima: 100,
  mana: 20,
  manaMaximo: 100,
  ataque: 10,
  ataqueMagico: 10,
  defensa: 5,
  defensaMagica: 5,
  fila: 1,
  columna: 0,
  estados,
  limites,
});

test("el adaptador convierte daño y curación progresivos legacy sin perder su creador", () => {
  const anteriores = [
    efectoPeriodico("dano_progresivo", "veneno", 7, 2),
    { ...efectoPeriodico("curacion_progresiva", "rejuvenecer", 4, 1), creadorId: "sanador" },
  ];
  const estados = convertirEstadosTacticos(anteriores, "jugador", "actor");
  assert.deepEqual(estados.map((estado) => ({
    id: estado.id,
    familia: estado.familia,
    clave: estado.clave,
    creadorId: estado.creadorId,
    restantes: estado.restantes,
  })), [
    { id: "legacy:jugador:veneno:dano_progresivo", familia: "herida", clave: "dano_progresivo", creadorId: "actor", restantes: 2 },
    { id: "legacy:jugador:rejuvenecer:curacion_progresiva", familia: "regeneracion", clave: "curacion_progresiva", creadorId: "sanador", restantes: 1 },
  ]);

  const guardados = exportarEstadosTacticos(unidad(estados), anteriores);
  assert.deepEqual(guardados, anteriores);
});

test("la exportación guarda pulsos modificados pero no recrea estados legacy expirados", () => {
  const anteriores = [
    efectoPeriodico("dano_progresivo", "veneno", 7, 3),
    efectoPeriodico("curacion_progresiva", "rejuvenecer", 4, 2),
  ];
  const estados = convertirEstadosTacticos(anteriores, "jugador", "actor");
  estados[0].valor = 5;
  estados[0].restantes = 1;
  const resultado = exportarEstadosTacticos(unidad([estados[0]]), anteriores);
  assert.deepEqual(resultado, [{ ...anteriores[0], valor: 5, turnosRestantes: 1 }]);
  assert.deepEqual(anteriores[0], efectoPeriodico("dano_progresivo", "veneno", 7, 3));
});

test("el adaptador conserva estados tácticos, límites y efectos ajenos sin duplicarlos", () => {
  const estado = {
    id: "a:escudo", fuenteId: "escudo", creadorId: "jugador",
    familia: "guardia", clave: "escudo", valor: 12,
    restantes: 2, reloj: "turno", cargas: 1,
  };
  const anterior = {
    habilidadId: "tactica:jugador", tipo: "tactico", valor: 0,
    duracionTurnos: 1, turnosRestantes: 1, objetivo: "jugador",
    datosTacticos: { version: 2, propietarioId: "jugador", estados: [estado], limites: { _ciclo: 4 } },
  };
  const ajeno = { habilidadId: "poder", tipo: "bonus_defensa", valor: 3, turnosRestantes: 2 };
  const anteriores = [ajeno, anterior];
  const convertidos = convertirEstadosTacticos(anteriores, "jugador", "actor");
  assert.deepEqual(convertidos, [estado]);
  assert.notStrictEqual(convertidos[0], estado);

  const guardados = exportarEstadosTacticos(unidad(convertidos, { _ciclo: 4 }), anteriores);
  assert.deepEqual(guardados, [ajeno, anterior]);
  assert.equal(guardados.filter((efecto) => efecto.tipo === "tactico").length, 1);
  assert.deepEqual(anteriores[1].datosTacticos.estados, [estado]);
});

test("sin estados ni límites el adaptador no inventa efectos tácticos", () => {
  const ajeno = { habilidadId: "escudo", tipo: "bonus_defensa", valor: 2, turnosRestantes: 3 };
  assert.deepEqual(convertirEstadosTacticos([ajeno], "jugador", "actor"), []);
  assert.deepEqual(exportarEstadosTacticos(unidad(), [ajeno]), [ajeno]);
  assert.deepEqual(exportarEstadosTacticos(unidad(), []), []);
  assert.throws(
    () => resolverTecnicaAdicional({ id: "invalida", claseId: "novato", programaTactico: "desconocido" }, {}),
    /PROGRAMA_TACTICO_DESCONOCIDO/
  );
});
