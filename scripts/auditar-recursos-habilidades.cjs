/* eslint-disable @typescript-eslint/no-require-imports -- Herramienta CommonJS ejecutada directamente con Node. */
// Auditoría reproducible de recursos; no accede a la base de datos ni modifica partidas.
require("../tests/load-typescript.cjs");
const fs = require("node:fs");
const { CLASES, obtenerAncestrosClase } = require("../src/lib/progresion/clases.ts");
const { HABILIDADES } = require("../src/lib/habilidades.ts");
const { ajustarHabilidadPorNivel, nivelMaximoHabilidad } = require("../src/lib/progresion/niveles-habilidad.ts");
const { calcularEstadisticasPersonaje } = require("../src/lib/estadisticasPersonaje.ts");
const { calcularAtributosClase } = require("../src/lib/progresion/atributos-clase.ts");
const { calcularEstadisticasDerivadasRpg } = require("../src/lib/progresion/estadisticas.ts");
const { calcularRegeneracionRecursosTurno } = require("../src/lib/expediciones/recursos-combate.ts");

function simularRotacion(habilidades, stats, turnos = 30) {
  let energia = stats.energiaMaxima, mana = stats.manaMaximo, pendiente = 0, siguiente = 0;
  const cooldowns = habilidades.map(() => 0);
  const usos = habilidades.map(() => 0);
  let basicos = 0, costeEnergia = 0, costeMana = 0, recuperacionEnergia = 0;
  for (let turno = 0; turno < turnos; turno++) {
    if (turno) {
      cooldowns.forEach((c, i) => { cooldowns[i] = Math.max(0, c - 1); });
      const r = calcularRegeneracionRecursosTurno(energia, mana, stats.energiaMaxima, stats.manaMaximo,
        stats.regeneracionManaPorTurno, stats.regeneracionEnergiaPorTurno, pendiente);
      energia = r.energiaActual; mana = r.manaActual; pendiente = r.manaRegeneracionPendiente;
    }
    let elegida = -1;
    for (let intento = 0; intento < habilidades.length; intento++) {
      const i = (siguiente + intento) % habilidades.length, h = habilidades[i];
      if (!cooldowns[i] && energia >= (h.costeEnergia ?? 0) && mana >= (h.costeMana ?? 0)) { elegida = i; break; }
    }
    if (elegida < 0) { basicos++; continue; }
    const h = habilidades[elegida];
    const e = h.costeEnergia ?? 0, m = h.costeMana ?? 0;
    energia -= e; mana -= m;
    costeEnergia += e; costeMana += m;
    const recuperada = Math.min(h.recuperarEnergia ?? 0, stats.energiaMaxima - energia);
    energia += recuperada; recuperacionEnergia += recuperada;
    cooldowns[elegida] = h.cooldownTurnos ?? 0;
    usos[elegida]++; siguiente = (elegida + 1) % habilidades.length;
  }
  return { basicos, usos, energia, mana, costeEnergia, costeMana, recuperacionEnergia };
}

function auditarRecursos(catalogo = HABILIDADES, ajustar = ajustarHabilidadPorNivel) {
  const inaccesibles = [];
  const mejorada = (h) => ajustar(h, nivelMaximoHabilidad(h.claseId));
  for (const h of catalogo.filter((h) => h.tipo === "activa")) {
    const stats = calcularEstadisticasDerivadasRpg(calcularAtributosClase(h.claseId, 1, h.nivelJobRequerido ?? 1), 1);
    if ((h.costeEnergia ?? 0) > stats.energiaMaxima || (h.costeMana ?? 0) > stats.manaMaximo) inaccesibles.push(h.id);
  }
  const clases = [];
  let rotaciones = 0;
  for (const c of Object.values(CLASES)) {
    const rama = [c.id, ...obtenerAncestrosClase(c.id)];
    const compatibles = catalogo.filter((h) => rama.includes(h.claseId));
    const activas = compatibles.filter((h) => h.tipo === "activa").map(mejorada);
    const pasivas = compatibles.filter((h) => h.tipo === "pasiva");
    const progresosClase = rama.map((id) => ({ claseId: id, nivelJob: CLASES[id].nivelJobMaximo, desbloqueada: true }));
    const datos = { clase: "Novato", profesionActivaId: c.id, nivel: 50, nivelJob: c.nivelJobMaximo, progresosClase, velocidadMejoras: 0, capacidadCarruajeMejoras: 0 };
    const variantes = [];
    const base = calcularEstadisticasPersonaje(datos).total;
    for (let i = 0; i < pasivas.length; i++) for (let j = i + 1; j < pasivas.length; j++) {
      const pareja = [pasivas[i], pasivas[j]];
      const efectivas = pareja.map(mejorada);
      const suma = (clave) => efectivas.reduce((total, h) => total + (h[clave] ?? 0), 0);
      const stats = { ...base,
        energiaMaxima: base.energiaMaxima + suma("bonusEnergiaMaxima"),
        manaMaximo: base.manaMaximo + suma("bonusManaMaximo"),
        regeneracionEnergiaPorTurno: base.regeneracionEnergiaPorTurno + suma("bonusRegeneracionEnergia") + suma("bonusEnergiaMaxima") * 0.2,
        regeneracionManaPorTurno: base.regeneracionManaPorTurno + suma("bonusRegeneracionMana"),
      };
      variantes.push({ stats, ids: pareja.map((h) => h.id) });
    }
    const criterios = ["regeneracionEnergiaPorTurno", "regeneracionManaPorTurno", "manaMaximo"];
    const casos = [...new Map(criterios.map((clave) => {
      const caso = variantes.reduce((mejor, v) => !mejor || v.stats[clave] > mejor.stats[clave] ? v : mejor, null);
      return [caso.ids.join("+"), caso];
    })).values()];
    let minBasicos = 30, maxBasicos = 0, sumaBasicos = 0, cuenta = 0;
    for (let i = 0; i < activas.length; i++) for (let j = i + 1; j < activas.length; j++) for (let k = j + 1; k < activas.length; k++) {
      for (const caso of casos) {
        const r = simularRotacion([activas[i], activas[j], activas[k]], caso.stats);
        minBasicos = Math.min(minBasicos, r.basicos); maxBasicos = Math.max(maxBasicos, r.basicos);
        sumaBasicos += r.basicos; cuenta++;
      }
    }
    rotaciones += cuenta;
    clases.push({ claseId: c.id, activas: activas.length, rotaciones: cuenta,
      basicosMinimos: minBasicos, basicosMaximos: maxBasicos, basicosMedios: Math.round(sumaBasicos / cuenta * 100) / 100 });
  }
  return { habilidades: catalogo.length, activas: catalogo.filter((h) => h.tipo === "activa").length, inaccesibles, rotaciones, clases };
}

module.exports = { simularRotacion, auditarRecursos };

if (require.main === module) {
  const resultado = auditarRecursos();
  const indiceAntes = process.argv.indexOf("--comparar");
  if (indiceAntes >= 0) {
    let ajustarAntes = ajustarHabilidadPorNivel;
    const indiceRef = process.argv.indexOf("--referencia");
    if (indiceRef >= 0) {
      const { execFileSync } = require("node:child_process");
      const Module = require("node:module"), path = require("node:path"), ts = require("typescript");
      const fuente = execFileSync("git", ["show", `${process.argv[indiceRef + 1]}:src/lib/progresion/niveles-habilidad.ts`], { encoding: "utf8" });
      const anterior = new Module(path.resolve(__dirname, "../src/lib/progresion/niveles-habilidad.ts"), module);
      anterior.filename = anterior.id;
      anterior.paths = Module._nodeModulePaths(path.dirname(anterior.id));
      anterior._compile(ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, anterior.id);
      ajustarAntes = anterior.exports.ajustarHabilidadPorNivel;
    }
    resultado.antes = auditarRecursos(JSON.parse(fs.readFileSync(process.argv[indiceAntes + 1], "utf8")), ajustarAntes);
  }
  console.log(JSON.stringify(resultado, null, 2));
}
