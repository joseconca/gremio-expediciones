import { calcularEstadisticasObjeto } from "@/lib/objetos";
import type { DefinicionObjeto, Rareza } from "@/lib/tiposJuego";
import type { ModificadoresEstadisticas } from "@/lib/progresion/estadisticas-personaje";

// Presentación breve compartida por Equipo y Mochila, sin modificar mecánicas.
/** Orden y etiquetas idénticos en Armería/Herrería; la ficha omite Capacidad. */
export const ESTADISTICAS_OBJETO: ReadonlyArray<{
  clave: keyof ModificadoresEstadisticas;
  nombre: string;
}> = [
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
  { clave: "capacidadCarruaje", nombre: "Capacidad" },
  { clave: "probCritico", nombre: "Prob. crítico" },
  { clave: "danoCritico", nombre: "Daño crítico" },
];

export const NOMBRES_RAREZA_OBJETO: Record<Rareza, string> = {
  basico: "Básico",
  comun: "Común",
  poco_comun: "Poco común",
  raro: "Raro",
  epico: "Épico",
  legendario: "Legendario",
};

export function nombreRareza(rareza: Rareza): string {
  return NOMBRES_RAREZA_OBJETO[rareza];
}

/** Las etiquetas son comunes; se mantienen las variantes visuales históricas por pantalla. */
export type PresentacionRareza = "aventurero" | "tienda" | "botica";

const ESTILOS_RAREZA_AVENTURERO: Record<Rareza, string> = {
  basico: "border-neutral-500/60 bg-[#34383a] text-[#ddd8cf]",
  comun: "border-green-700/60 bg-[#233329] text-green-300",
  poco_comun: "border-sky-600/60 bg-[#21333d] text-sky-300",
  raro: "border-amber-600/60 bg-[#40351f] text-amber-300",
  epico: "border-fuchsia-700/60 bg-[#392538] text-fuchsia-300",
  legendario: "border-red-700/60 bg-[#402322] text-red-300",
};

const ESTILOS_RAREZA_BOTICA: Record<Rareza, string> = {
  basico: "border-neutral-500/60 bg-neutral-900/60 text-neutral-300",
  comun: "border-emerald-700/60 bg-emerald-950/40 text-emerald-300",
  poco_comun: "border-sky-700/60 bg-sky-950/40 text-sky-300",
  raro: "border-amber-700/60 bg-amber-950/40 text-amber-300",
  epico: "border-fuchsia-700/60 bg-fuchsia-950/40 text-fuchsia-300",
  legendario: "border-red-700/60 bg-red-950/40 text-red-300",
};

export function estiloRareza(rareza: Rareza, presentacion: PresentacionRareza = "aventurero"): string {
  if (presentacion === "botica") return ESTILOS_RAREZA_BOTICA[rareza];
  // El nombre común en Armería y Herrería utiliza text-green-400 y no text-green-300.
  if (presentacion === "tienda" && rareza === "comun") {
    return "border-green-700/60 bg-[#233329] text-green-400";
  }
  return ESTILOS_RAREZA_AVENTURERO[rareza];
}

export function obtenerEstadisticasNoCero(
  objeto: DefinicionObjeto,
  nivelMejora: number,
  bonificaciones: Record<string, number> = {},
  opciones: { incluirCapacidad?: boolean } = {},
) {
  const estadisticas = calcularEstadisticasObjeto(objeto, nivelMejora, bonificaciones);
  return ESTADISTICAS_OBJETO.filter(({ clave }) => (opciones.incluirCapacidad || clave !== "capacidadCarruaje") && (estadisticas[clave] ?? 0) !== 0).map(({ clave, nombre }) => ({
    clave,
    nombre,
    valor: estadisticas[clave] ?? 0,
  }));
}

/** En tienda se muestra además la Capacidad del carruaje, igual que antes. */
export function obtenerEstadisticasNoCeroTienda(
  objeto: DefinicionObjeto,
  nivelMejora: number,
  bonificaciones: Record<string, number> = {},
) {
  return obtenerEstadisticasNoCero(objeto, nivelMejora, bonificaciones, { incluirCapacidad: true });
}

export function formatearEstadistica(clave: keyof ModificadoresEstadisticas, valor: number): string {
  const signo = valor > 0 ? "+" : "";
  if (clave === "probCritico") return signo + (valor * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "%";
  if (clave === "danoCritico") return signo + valor.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "×";
  return signo + valor.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

