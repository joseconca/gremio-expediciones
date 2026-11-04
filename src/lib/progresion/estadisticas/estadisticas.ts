import type { AtributosPrincipales } from "../../tiposJuego";

/** Coeficientes iniciales de balance: se ajustan aquí, no en las rutas de API. */
export const COEFICIENTES_ATRIBUTOS_RPG = {
  vidaBase: 55, vidaPorNivelBase: 5, vidaPorVitalidad: 10,
  energiaBase: 100, energiaPorFuerza: 0, energiaPorVitalidad: 0,
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
  regeneracionEnergiaPorFuerzaVitalidad: 0,
  regeneracionManaBase: 2, regeneracionManaPorInteligencia: 0.1,
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
  bonificaciones: BonificacionesDerivadasRpg = {},
  redondearEstadisticas = true
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
  const ajustarEntero = (valor: number, minimo: number) =>
    Math.max(minimo, redondearEstadisticas ? Math.floor(valor) : valor);

  return {
    hpMaximo: ajustarEntero(suma("hpMaximo", c.vidaBase + (nivel - 1) * c.vidaPorNivelBase + vitalidad * c.vidaPorVitalidad), 1),
    energiaMaxima: ajustarEntero(suma("energiaMaxima", c.energiaBase + fuerza * c.energiaPorFuerza + vitalidad * c.energiaPorVitalidad), 1),
    manaMaximo: ajustarEntero(suma("manaMaximo", c.manaBase + inteligencia * c.manaPorInteligencia), 1),
    ataqueFisico: ajustarEntero(suma("ataqueFisico", c.ataqueFisicoBase + fuerza * c.ataqueFisicoPorFuerza + destreza * c.ataqueFisicoPorDestreza), 1),
    ataqueMagico: ajustarEntero(suma("ataqueMagico", c.ataqueMagicoBase + inteligencia * c.ataqueMagicoPorInteligencia + destreza * c.ataqueMagicoPorDestreza), 1),
    defensaFisica: ajustarEntero(suma("defensaFisica", vitalidad * c.defensaFisicaPorVitalidad + fuerza * c.defensaFisicaPorFuerza), 0),
    defensaMagica: ajustarEntero(suma("defensaMagica", inteligencia * c.defensaMagicaPorInteligencia + vitalidad * c.defensaMagicaPorVitalidad), 0),
    precision: limitar(redondearEstadisticas ? Math.floor(suma("precision", c.precisionBase + destreza * c.precisionPorDestreza + suerte * c.precisionPorSuerte)) : suma("precision", c.precisionBase + destreza * c.precisionPorDestreza + suerte * c.precisionPorSuerte), 1, 100),
    probCritico: limitar(suma("probCritico", c.criticoBase + suerte * c.criticoPorSuerte + destreza * c.criticoPorDestreza), 0, c.criticoMaximo),
    danoCritico: Math.max(1, suma("danoCritico", c.multiplicadorCriticoBase + suerte * c.multiplicadorCriticoPorSuerte)),
    evasion: limitar(suma("evasion", agilidad * c.evasionPorAgilidad + suerte * c.evasionPorSuerte), 0, c.evasionMaxima),
    velocidad: ajustarEntero(suma("velocidad", c.velocidadBase + agilidad * c.velocidadPorAgilidad + destreza * c.velocidadPorDestreza), 1),
    regeneracionVidaPorTurno: Math.max(0, suma("regeneracionVidaPorTurno", vitalidad * c.regeneracionVidaPorVitalidad)),
    regeneracionEnergiaPorTurno: Math.max(0, suma("regeneracionEnergiaPorTurno", (c.energiaBase + (bonificaciones.energiaMaxima ?? 0)) * 0.2)),
    regeneracionManaPorTurno: Math.max(0, suma("regeneracionManaPorTurno", c.regeneracionManaBase + inteligencia * c.regeneracionManaPorInteligencia)),
  };
}


// Fórmulas de estadísticas físicas almacenadas en personajes de las cuatro clases iniciales.
// Contrato interno: no define las profesiones disponibles en el catálogo actual.
type ClaseFormulaInicial = "Novato" | "Guerrero" | "Explorador" | "Comerciante";
export interface EstadisticasBasePersonaje {
  hpMaximo: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
  probCritico: number;
  danoCritico: number;
}

export function calcularEstadisticasBase(
  clase: ClaseFormulaInicial,
  nivel: number
): EstadisticasBasePersonaje {
  const nivelSeguro = Math.max(1, nivel);
  const nivelesExtra = nivelSeguro - 1;

  switch (clase) {
    case "Novato":
      return {
        hpMaximo: 65 + nivelesExtra * 5,
        ataque: 5 + nivelesExtra,
        defensa: 3 + nivelesExtra * 0.8,
        velocidad: 5 + nivelesExtra * 0.4,
        capacidadCarruaje: 8 + nivelesExtra,
        probCritico: 0.03,
        danoCritico: 1.5,
      };

    case "Guerrero":
      return {
        hpMaximo: 85 + nivelesExtra * 6,
        ataque: 7 + nivelesExtra * 1.4,
        defensa: 6 + nivelesExtra * 1.3,
        velocidad: 5 + nivelesExtra * 0.5,
        capacidadCarruaje: 10 + nivelesExtra,
        probCritico: 0.05,
        danoCritico: 1.5,
      };

    case "Explorador":
      return {
        hpMaximo: 75 + nivelesExtra * 5,
        ataque: 6.5 + nivelesExtra * 1.2,
        defensa: 4 + nivelesExtra * 0.9,
        velocidad: 9 + nivelesExtra,
        capacidadCarruaje: 10 + nivelesExtra,
        probCritico: 0.05,
        danoCritico: 1.5,
      };

    case "Comerciante":
      return {
        hpMaximo: 80 + nivelesExtra * 5,
        ataque: 6 + nivelesExtra * 1.05,
        defensa: 5 + nivelesExtra,
        velocidad: 7 + nivelesExtra * 0.7,
        capacidadCarruaje: 14 + nivelesExtra * 1.2,
        probCritico: 0.05,
        danoCritico: 1.5,
      };
  }
}
