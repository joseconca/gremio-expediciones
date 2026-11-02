import type { AtributosPrincipales } from "../tiposJuego";
import { obtenerHabilidadPorId } from "../habilidades";
import type { HabilidadAprendidaConNivel } from "./niveles-habilidad";
import { obtenerModificadoresPasivas } from "./bonificaciones-pasivas";
import { COEFICIENTES_ATRIBUTOS_RPG } from "./estadisticas";
import { puedeUsarHabilidadDeClase } from "./clases";
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
  AportesPorAtributo,
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
  const atributosPrincipales={...obtenerAtributosPrincipales(personaje)};
  const atributosPorPasivas:Partial<AtributosPrincipales>={};
  const totalSinRedondear = sumarModificadores(base, mejoras, pasivas, equipo, combate);
  const conversionActiva=habilidadesAprendidas.some(entrada=>{
    const id=typeof entrada==="string"?entrada:entrada.habilidadId;
    const h=obtenerHabilidadPorId(id);
    return h?.conversionReservaInteligencia&&puedeUsarHabilidadDeClase(claseActualId,h.claseId);
  });
  if(conversionActiva){
    const manaPrevio=totalSinRedondear.manaMaximo??0;
    const inteligenciaPrevia=obtenerAtributosPrincipales(personaje).inteligencia;
    const ganada=Math.min(Math.floor(manaPrevio*.1),Math.floor(inteligenciaPrevia*.2),12);
    atributosPrincipales.inteligencia+=ganada;
    atributosPorPasivas.inteligencia=ganada;
    const ataque=ganada*COEFICIENTES_ATRIBUTOS_RPG.ataqueMagicoPorInteligencia;
    const defensa=ganada*COEFICIENTES_ATRIBUTOS_RPG.defensaMagicaPorInteligencia;
    const regeneracion=ganada*COEFICIENTES_ATRIBUTOS_RPG.regeneracionManaPorInteligencia;
    totalSinRedondear.manaMaximo=Math.floor(manaPrevio*.9);
    totalSinRedondear.ataqueMagico=(totalSinRedondear.ataqueMagico??0)+ataque;
    totalSinRedondear.defensaMagica=(totalSinRedondear.defensaMagica??0)+defensa;
    totalSinRedondear.regeneracionManaPorTurno=(totalSinRedondear.regeneracionManaPorTurno??0)+regeneracion;
    pasivas.manaMaximo=(pasivas.manaMaximo??0)+Math.floor(manaPrevio*.9)-manaPrevio;
    pasivas.ataqueMagico=(pasivas.ataqueMagico??0)+ataque;
    pasivas.defensaMagica=(pasivas.defensaMagica??0)+defensa;
    pasivas.regeneracionManaPorTurno=(pasivas.regeneracionManaPorTurno??0)+regeneracion;
  }

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
