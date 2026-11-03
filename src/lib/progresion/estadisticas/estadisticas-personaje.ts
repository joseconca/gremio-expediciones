import type { AtributosPrincipales } from "../../tiposJuego";
import type { HabilidadAprendidaConNivel } from "../habilidades/niveles-habilidad";
import {
  obtenerModificadoresPasivas,
  aplicarConversionReservaInteligencia,
} from "./bonificaciones-pasivas";
import {
  obtenerAtributosPrincipales,
  obtenerEstadisticasBase,
  calcularAportesPorAtributo,
  calcularBaseSinAtributos,
} from "./estadisticas-base-personaje";

import {
  MODIFICADORES_VACIOS,
  sumarModificadores,
} from "./modificadores-estadisticas";
import type {
  DatosPersonajeEstadisticas,
  ModificadoresEstadisticas,
  DesgloseEstadisticasPersonaje,
} from "./modificadores-estadisticas";

// Mantener el contrato público de estadísticas del personaje para sus consumidores actuales.
export type {
  DatosPersonajeEstadisticas,
  ModificadoresEstadisticas,
  DesgloseEstadisticasPersonaje,
  AportesPorAtributo,
} from "./modificadores-estadisticas";

// API pública histórica: se mantiene para no modificar sus consumidores.
export { calcularModificadoresEquipo } from "./bonificaciones-equipo";

export function calcularEstadisticasPersonaje(
  personaje: DatosPersonajeEstadisticas,
  habilidadesAprendidas: HabilidadAprendidaConNivel[] = [],
  equipo: ModificadoresEstadisticas = MODIFICADORES_VACIOS,
  combate: ModificadoresEstadisticas = MODIFICADORES_VACIOS
): DesgloseEstadisticasPersonaje {
  const claseActualId = personaje.profesionActivaId ?? "novato";
  const base = obtenerEstadisticasBase(personaje, claseActualId);

  const mejoras: ModificadoresEstadisticas = {
    hpMaximo: 0,
    ataque: 0,
    defensa: 0,
    velocidad: personaje.velocidadMejoras,
    capacidadCarruaje: personaje.capacidadCarruajeMejoras,
    probCritico: 0,
    danoCritico: 0,
  };

  const pasivas = obtenerModificadoresPasivas(habilidadesAprendidas, claseActualId);
  const atributosPrincipales = { ...obtenerAtributosPrincipales(personaje) };
  const atributosPorPasivas: Partial<AtributosPrincipales> = {};
  const totalSinRedondear = sumarModificadores(base, mejoras, pasivas, equipo, combate);
  aplicarConversionReservaInteligencia({
    habilidadesAprendidas,
    claseActualId,
    atributosPrincipales,
    atributosPorPasivas,
    totalSinRedondear,
    pasivas,
  });

  const precision = totalSinRedondear.precision ?? 75;
  const evasion = totalSinRedondear.evasion ?? 0;

  const total: ModificadoresEstadisticas = {
    hpMaximo: Math.max(1, Math.floor(totalSinRedondear.hpMaximo)),
    ataque: Math.max(1, Math.floor(totalSinRedondear.ataque)),
    defensa: Math.max(0, Math.floor(totalSinRedondear.defensa)),
    velocidad: Math.max(1, Math.floor(totalSinRedondear.velocidad)),
    capacidadCarruaje: Math.max(0, Math.floor(totalSinRedondear.capacidadCarruaje)),
    probCritico: Math.max(0, Math.min(0.75, totalSinRedondear.probCritico)),
    danoCritico: Math.max(1, totalSinRedondear.danoCritico),
    ataqueMagico: Math.max(1, Math.floor(totalSinRedondear.ataqueMagico ?? 1)),
    defensaMagica: Math.max(0, Math.floor(totalSinRedondear.defensaMagica ?? 0)),
    precision: Math.max(1, Math.min(100, precision)),
    evasion: Math.max(0, Math.min(0.6, evasion)),
    energiaMaxima: Math.max(1, Math.floor(totalSinRedondear.energiaMaxima ?? 1)),
    manaMaximo: Math.max(1, Math.floor(totalSinRedondear.manaMaximo ?? 1)),
    regeneracionVidaPorTurno: Math.max(0, totalSinRedondear.regeneracionVidaPorTurno ?? 0),
    regeneracionEnergiaPorTurno: Math.max(0, totalSinRedondear.regeneracionEnergiaPorTurno ?? 0),
    regeneracionManaPorTurno: Math.max(0, totalSinRedondear.regeneracionManaPorTurno ?? 0),
  };

  const atributos = calcularAportesPorAtributo(personaje, claseActualId);
  const baseSinAtributos = calcularBaseSinAtributos(personaje, claseActualId, base);

  return {
    atributosPrincipales,
    atributosPorPasivas,
    base,
    baseSinAtributos,
    mejoras,
    pasivas,
    equipo,
    combate,
    atributos,
    total,
  };
}
