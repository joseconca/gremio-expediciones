import { calcularEstadisticasObjeto } from "@/lib/objetos";
import type { DefinicionObjeto } from "@/lib/tiposJuego";
import { NOMBRES_RAREZA_OBJETO } from "./resumen-objeto";
export { NOMBRES_RAREZA_OBJETO } from "./resumen-objeto";
import type { ModificadoresEstadisticas } from "@/lib/progresion/estadisticas/estadisticas-personaje";

const ETIQUETAS_ESTADISTICAS: Array<[keyof ModificadoresEstadisticas, string]> = [
  ["ataque", "Ataque"], ["ataqueMagico", "Ataque mágico"],
  ["defensa", "Defensa"], ["defensaMagica", "Defensa mágica"],
  ["velocidad", "Velocidad"], ["hpMaximo", "Vida máxima"],
  ["energiaMaxima", "Energía máxima"], ["manaMaximo", "Maná máximo"],
  ["precision", "Precisión"], ["evasion", "Evasión"],
  ["probCritico", "Prob. crítico"], ["danoCritico", "Daño crítico"],
  ["regeneracionVidaPorTurno", "Regeneración de vida"],
  ["regeneracionEnergiaPorTurno", "Regeneración de energía"],
  ["regeneracionManaPorTurno", "Regeneración de maná"],
  ["capacidadCarruaje", "Capacidad"],
];

function numero(valor: number): string {
  return valor.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

function estadisticaComoTexto(clave: keyof ModificadoresEstadisticas, valor: number): string {
  const prefijo = valor > 0 ? "+" : "";
  if (clave === "probCritico" || clave === "evasion") return prefijo + numero(valor * 100) + " %";
  if (clave === "precision") return prefijo + numero(valor) + " %";
  if (clave === "danoCritico") return prefijo + numero(valor) + "×";
  return prefijo + numero(valor);
}

/** Construye una única descripción para cualquier instancia o entrada de catálogo. */
export function obtenerDetallesObjeto(
  objeto: DefinicionObjeto,
  nivelMejora = 0,
  bonificaciones: Record<string, number> = {},
): string[] {
  const lineas = [
    `Rareza: ${NOMBRES_RAREZA_OBJETO[objeto.rareza]}.`,
    `Tipo: ${objeto.tipo}${objeto.subtipo ? " · " + objeto.subtipo : ""}.`,
  ];
  if (nivelMejora > 0) lineas.push(`Nivel de mejora: +${nivelMejora}.`);
  if (objeto.manos === 2) lineas.push("Arma a dos manos: ocupa mano principal y secundaria.");
  const estadisticas = calcularEstadisticasObjeto(objeto, nivelMejora, bonificaciones);
  for (const [clave, etiqueta] of ETIQUETAS_ESTADISTICAS) {
    const valor = estadisticas[clave] ?? 0;
    if (Number.isFinite(valor) && valor !== 0) lineas.push(`${etiqueta}: ${estadisticaComoTexto(clave, valor)}`);
  }
  if (objeto.tipo === "consumible") {
    const restauraciones: Array<[string, number | undefined, number | undefined]> = [
      ["Vida", objeto.curacion, objeto.curacionPorcentaje],
      ["Maná", objeto.restauracionMana, objeto.restauracionManaPorcentaje],
      ["Energía", objeto.restauracionEnergia, objeto.restauracionEnergiaPorcentaje],
    ];
    for (const [recurso, fijo, porcentaje] of restauraciones) {
      const partes = [fijo ? numero(fijo) : "", porcentaje ? numero(porcentaje * 100) + " % del máximo" : ""].filter(Boolean);
      if (partes.length) lineas.push(`Restaura ${recurso.toLowerCase()}: ${partes.join(" + ")}.`);
    }
    if (objeto.revivirPorcentajeVida) lineas.push(`Reanimar con ${numero(objeto.revivirPorcentajeVida * 100)} % de vida.`);
    if (objeto.duracionTurnos) lineas.push(`Duración: ${objeto.duracionTurnos} turnos.`);
  }
  return lineas;
}
