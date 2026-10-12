import type { AtributosPrincipales } from "../tiposJuego";

/** Coeficientes iniciales de balance: se ajustan aquí, no en las rutas de API. */
export const COEFICIENTES_ATRIBUTOS_RPG = {
  vidaBase: 55, vidaPorNivelBase: 5, vidaPorVitalidad: 10,
  energiaBase: 20, energiaPorFuerza: 2, energiaPorVitalidad: 1,
  manaBase: 10, manaPorInteligencia: 3,
  ataqueFisicoBase: 3, ataqueFisicoPorFuerza: 2, ataqueFisicoPorDestreza: 0.5,
  ataqueMagicoBase: 3, ataqueMagicoPorInteligencia: 2, ataqueMagicoPorDestreza: 0.5,
  defensaFisicaPorVitalidad: 1.5, defensaFisicaPorFuerza: 0.25,
  defensaMagicaPorInteligencia: 1.5, defensaMagicaPorVitalidad: 0.25,
  precisionBase: 75, precisionPorDestreza: 2, precisionPorSuerte: 0.5,
  criticoBase: 0.03, criticoPorSuerte: 0.005, criticoPorDestreza: 0.001, criticoMaximo: 0.75,
  multiplicadorCriticoBase: 1.5, multiplicadorCriticoPorSuerte: 0.005,
  evasionPorAgilidad: 0.01, evasionPorSuerte: 0.002, evasionMaxima: 0.6,
  velocidadBase: 4, velocidadPorAgilidad: 1, velocidadPorDestreza: 0.25,
  regeneracionVidaPorVitalidad: 0.1,
  regeneracionEnergiaPorFuerzaVitalidad: 0.05,
  regeneracionManaPorInteligencia: 0.1,
} as const;

export interface EstadisticasDerivadasRpg {
  hpMaximo: number;
  energiaMaxima: number;
  manaMaximo: number;
  ataqueFisico: number;
  ataqueMagico: number;
  defensaFisica: number;
  defensaMagica: number;
  precision: number;
  probCritico: number;
  danoCritico: number;
  evasion: number;
  velocidad: number;
  regeneracionVidaPorTurno: number;
  regeneracionEnergiaPorTurno: number;
  regeneracionManaPorTurno: number;
}
export type BonificacionesDerivadasRpg = Partial<EstadisticasDerivadasRpg>;

function atributo(valor: number): number {
  return Number.isFinite(valor) ? Math.max(1, Math.floor(valor)) : 1;
}
function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, valor));
}

export function calcularEstadisticasDerivadasRpg(
  atributos: AtributosPrincipales,
  nivelBase = 1,
  bonificaciones: BonificacionesDerivadasRpg = {}
): EstadisticasDerivadasRpg {
  const c = COEFICIENTES_ATRIBUTOS_RPG;
  const fuerza = atributo(atributos.fuerza);
  const agilidad = atributo(atributos.agilidad);
  const vitalidad = atributo(atributos.vitalidad);
  const inteligencia = atributo(atributos.inteligencia);
  const destreza = atributo(atributos.destreza);
  const suerte = atributo(atributos.suerte);
  const nivel = Number.isFinite(nivelBase) ? Math.max(1, Math.floor(nivelBase)) : 1;
  const suma = (clave: keyof EstadisticasDerivadasRpg, base: number) =>
    base + (Number.isFinite(bonificaciones[clave]) ? (bonificaciones[clave] ?? 0) : 0);

  return {
    hpMaximo: Math.max(1, Math.floor(suma("hpMaximo", c.vidaBase + (nivel - 1) * c.vidaPorNivelBase + vitalidad * c.vidaPorVitalidad))),
    energiaMaxima: Math.max(1, Math.floor(suma("energiaMaxima", c.energiaBase + fuerza * c.energiaPorFuerza + vitalidad * c.energiaPorVitalidad))),
    manaMaximo: Math.max(1, Math.floor(suma("manaMaximo", c.manaBase + inteligencia * c.manaPorInteligencia))),
    ataqueFisico: Math.max(1, Math.floor(suma("ataqueFisico", c.ataqueFisicoBase + fuerza * c.ataqueFisicoPorFuerza + destreza * c.ataqueFisicoPorDestreza))),
    ataqueMagico: Math.max(1, Math.floor(suma("ataqueMagico", c.ataqueMagicoBase + inteligencia * c.ataqueMagicoPorInteligencia + destreza * c.ataqueMagicoPorDestreza))),
    defensaFisica: Math.max(0, Math.floor(suma("defensaFisica", vitalidad * c.defensaFisicaPorVitalidad + fuerza * c.defensaFisicaPorFuerza))),
    defensaMagica: Math.max(0, Math.floor(suma("defensaMagica", inteligencia * c.defensaMagicaPorInteligencia + vitalidad * c.defensaMagicaPorVitalidad))),
    precision: limitar(Math.floor(suma("precision", c.precisionBase + destreza * c.precisionPorDestreza + suerte * c.precisionPorSuerte)), 1, 100),
    probCritico: limitar(suma("probCritico", c.criticoBase + suerte * c.criticoPorSuerte + destreza * c.criticoPorDestreza), 0, c.criticoMaximo),
    danoCritico: Math.max(1, suma("danoCritico", c.multiplicadorCriticoBase + suerte * c.multiplicadorCriticoPorSuerte)),
    evasion: limitar(suma("evasion", agilidad * c.evasionPorAgilidad + suerte * c.evasionPorSuerte), 0, c.evasionMaxima),
    velocidad: Math.max(1, Math.floor(suma("velocidad", c.velocidadBase + agilidad * c.velocidadPorAgilidad + destreza * c.velocidadPorDestreza))),
    regeneracionVidaPorTurno: Math.max(0, suma("regeneracionVidaPorTurno", vitalidad * c.regeneracionVidaPorVitalidad)),
    regeneracionEnergiaPorTurno: Math.max(0, suma("regeneracionEnergiaPorTurno", (fuerza + vitalidad) * c.regeneracionEnergiaPorFuerzaVitalidad)),
    regeneracionManaPorTurno: Math.max(0, suma("regeneracionManaPorTurno", inteligencia * c.regeneracionManaPorInteligencia)),
  };
}
