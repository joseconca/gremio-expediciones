import { calcularEstadisticasObjeto } from "@/lib/objetos";
import type { DefinicionObjeto, Rareza } from "@/lib/tiposJuego";
import type { ModificadoresEstadisticas } from "@/lib/progresion/estadisticas-personaje";

// Presentación breve compartida por Equipo y Mochila, sin modificar mecánicas.
const ESTADISTICAS: Array<{ clave: keyof ModificadoresEstadisticas; nombre: string }> = [
  { clave: "ataque", nombre: "Ataque" },
  { clave: "ataqueMagico", nombre: "Ataque mágico" },
  { clave: "defensa", nombre: "Defensa" },
  { clave: "defensaMagica", nombre: "Defensa mágica" },
  { clave: "velocidad", nombre: "Velocidad" },
  { clave: "hpMaximo", nombre: "Vida máxima" },
  { clave: "energiaMaxima", nombre: "Energía máxima" },
  { clave: "manaMaximo", nombre: "Maná máximo" },
  { clave: "precision", nombre: "Precisión" },
  { clave: "evasion", nombre: "Evasión" },
  { clave: "regeneracionVidaPorTurno", nombre: "Regeneración de vida" },
  { clave: "regeneracionEnergiaPorTurno", nombre: "Regeneración de energía" },
  { clave: "regeneracionManaPorTurno", nombre: "Regeneración de maná" },
  { clave: "probCritico", nombre: "Prob. crítico" },
  { clave: "danoCritico", nombre: "Daño crítico" },
];

export function nombreRareza(rareza: Rareza): string {
  const etiquetas: Record<Rareza, string> = {
    basico: "Básico",
    comun: "Común",
    poco_comun: "Poco común",
    raro: "Raro",
    epico: "Épico",
    legendario: "Legendario",
  };
  return etiquetas[rareza];
}

export function estiloRareza(rareza: Rareza): string {
  const clases: Record<Rareza, string> = {
    basico: "border-neutral-500/60 bg-[#34383a] text-[#ddd8cf]",
    comun: "border-green-700/60 bg-[#233329] text-green-300",
    poco_comun: "border-sky-600/60 bg-[#21333d] text-sky-300",
    raro: "border-amber-600/60 bg-[#40351f] text-amber-300",
    epico: "border-fuchsia-700/60 bg-[#392538] text-fuchsia-300",
    legendario: "border-red-700/60 bg-[#402322] text-red-300",
  };
  return clases[rareza];
}

export function obtenerEstadisticasNoCero(objeto: DefinicionObjeto, nivelMejora: number, bonificaciones: Record<string, number> = {}) {
  const estadisticas = calcularEstadisticasObjeto(objeto, nivelMejora, bonificaciones);
  return ESTADISTICAS.filter(({ clave }) => (estadisticas[clave] ?? 0) !== 0).map(({ clave, nombre }) => ({
    clave,
    nombre,
    valor: estadisticas[clave] ?? 0,
  }));
}

export function formatearEstadistica(clave: keyof ModificadoresEstadisticas, valor: number): string {
  const signo = valor > 0 ? "+" : "";
  if (clave === "probCritico") return signo + (valor * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "%";
  if (clave === "danoCritico") return signo + valor.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "×";
  return signo + valor.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

