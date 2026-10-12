import type { BonificacionesDerivadasRpg } from "./estadisticas";

export interface ModificadoresEquipoParaRpg {
  hpMaximo?: number;
  ataque?: number;
  defensa?: number;
  velocidad?: number;
  probCritico?: number;
  danoCritico?: number;
  ataqueMagico?: number;
  defensaMagica?: number;
  precision?: number;
  evasion?: number;
  energiaMaxima?: number;
  manaMaximo?: number;
  regeneracionVidaPorTurno?: number;
  regeneracionEnergiaPorTurno?: number;
  regeneracionManaPorTurno?: number;
}

function valorSeguro(
  modificadores: ModificadoresEquipoParaRpg,
  clave: keyof ModificadoresEquipoParaRpg
): number {
  const valor = modificadores[clave];
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

/**
 * Adapta las estadísticas del equipo (nombres heredados) a las claves que
 * utiliza el cálculo RPG nuevo. Así el equipo modifica también los máximos
 * y la regeneración de recursos en los turnos de combate.
 */
export function mapearBonificacionesEquipoRpg(
  equipo: ModificadoresEquipoParaRpg
): BonificacionesDerivadasRpg {
  return {
    hpMaximo: valorSeguro(equipo, "hpMaximo"),
    ataqueFisico: valorSeguro(equipo, "ataque"),
    ataqueMagico: valorSeguro(equipo, "ataqueMagico"),
    defensaFisica: valorSeguro(equipo, "defensa"),
    defensaMagica: valorSeguro(equipo, "defensaMagica"),
    velocidad: valorSeguro(equipo, "velocidad"),
    probCritico: valorSeguro(equipo, "probCritico"),
    danoCritico: valorSeguro(equipo, "danoCritico"),
    precision: valorSeguro(equipo, "precision"),
    evasion: valorSeguro(equipo, "evasion"),
    energiaMaxima: valorSeguro(equipo, "energiaMaxima"),
    manaMaximo: valorSeguro(equipo, "manaMaximo"),
    regeneracionVidaPorTurno: valorSeguro(equipo, "regeneracionVidaPorTurno"),
    regeneracionEnergiaPorTurno: valorSeguro(equipo, "regeneracionEnergiaPorTurno"),
    regeneracionManaPorTurno: valorSeguro(equipo, "regeneracionManaPorTurno"),
  };
}
