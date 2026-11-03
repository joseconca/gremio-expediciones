import type { AtributosPrincipales } from "../../tiposJuego";
import { calcularAtributosClase } from "../atributos-clase";
import { CLASES } from "../clases";
import {
  calcularEstadisticasBase,
  calcularEstadisticasDerivadasRpg,
  COEFICIENTES_ATRIBUTOS_RPG,
} from "../estadisticas";
import type {
  AportesPorAtributo,
  DatosPersonajeEstadisticas,
  ModificadoresEstadisticas,
} from "./modificadores-estadisticas";

/**
 * Cálculo de base, aportaciones de los atributos y compatibilidad con las
 * estadísticas físicas de personajes anteriores al sistema de profesiones.
 */
export function obtenerAtributosPrincipales(personaje: DatosPersonajeEstadisticas): AtributosPrincipales {
  const claseId = personaje.profesionActivaId ?? "novato";
  const progreso = personaje.progresosClase?.find((item) => item.claseId === claseId && item.desbloqueada !== false);
  const nivelJob = typeof personaje.nivelJob === "number" && Number.isFinite(personaje.nivelJob) ? personaje.nivelJob : progreso?.nivelJob ?? 1;
  return calcularAtributosClase(claseId, personaje.nivel, nivelJob, personaje.progresosClase);
}

export function obtenerEstadisticasBase(
  personaje: DatosPersonajeEstadisticas,
  claseActualId: string
): ModificadoresEstadisticas {
  const derivadasRpg = calcularEstadisticasDerivadasRpg(
    obtenerAtributosPrincipales(personaje),
    personaje.nivel,
    {},
    false
  );
  // Las cuentas antiguas conservan sus estadísticas físicas hasta que cambien de profesión.
  if (usaEstadisticasLegadas(personaje, claseActualId)) {
    const baseLegada = calcularEstadisticasBase(
      personaje.clase as "Guerrero" | "Explorador" | "Comerciante" | "Novato",
      personaje.nivel
    );
    return {
      hpMaximo: baseLegada.hpMaximo,
      ataque: baseLegada.ataque,
      defensa: baseLegada.defensa,
      velocidad: baseLegada.velocidad,
      capacidadCarruaje: baseLegada.capacidadCarruaje,
      probCritico: baseLegada.probCritico,
      danoCritico: baseLegada.danoCritico,
      ataqueMagico: derivadasRpg.ataqueMagico,
      defensaMagica: derivadasRpg.defensaMagica,
      precision: derivadasRpg.precision,
      evasion: derivadasRpg.evasion,
      energiaMaxima: derivadasRpg.energiaMaxima,
      manaMaximo: derivadasRpg.manaMaximo,
      regeneracionVidaPorTurno: derivadasRpg.regeneracionVidaPorTurno,
      regeneracionEnergiaPorTurno: derivadasRpg.regeneracionEnergiaPorTurno,
      regeneracionManaPorTurno: derivadasRpg.regeneracionManaPorTurno,
    };
  }

  const capacidadLegada = calcularEstadisticasBase("Novato", personaje.nivel);

  return {
    hpMaximo: derivadasRpg.hpMaximo,
    ataque: derivadasRpg.ataqueFisico,
    defensa: derivadasRpg.defensaFisica,
    velocidad: derivadasRpg.velocidad,
    capacidadCarruaje: capacidadLegada.capacidadCarruaje,
    probCritico: derivadasRpg.probCritico,
    danoCritico: derivadasRpg.danoCritico,
    ataqueMagico: derivadasRpg.ataqueMagico,
    defensaMagica: derivadasRpg.defensaMagica,
    precision: derivadasRpg.precision,
    evasion: derivadasRpg.evasion,
    energiaMaxima: derivadasRpg.energiaMaxima,
    manaMaximo: derivadasRpg.manaMaximo,
    regeneracionVidaPorTurno: derivadasRpg.regeneracionVidaPorTurno,
    regeneracionEnergiaPorTurno: derivadasRpg.regeneracionEnergiaPorTurno,
    regeneracionManaPorTurno: derivadasRpg.regeneracionManaPorTurno,
  };
}

function usaEstadisticasLegadas(
  personaje: DatosPersonajeEstadisticas,
  claseActualId: string
): boolean {
  const claseBaseLegada = (
    personaje.clase === "Guerrero" ||
    personaje.clase === "Explorador" ||
    personaje.clase === "Comerciante"
  ) && claseActualId === "novato";

  return claseBaseLegada || (!CLASES[claseActualId] && personaje.clase !== "Novato");
}

export function calcularAportesPorAtributo(
  personaje: DatosPersonajeEstadisticas,
  claseActualId: string
): AportesPorAtributo {
  const c = COEFICIENTES_ATRIBUTOS_RPG;
  const atributos = obtenerAtributosPrincipales(personaje);
  const fuerza = atributos.fuerza;
  const agilidad = atributos.agilidad;
  const vitalidad = atributos.vitalidad;
  const inteligencia = atributos.inteligencia;
  const destreza = atributos.destreza;
  const suerte = atributos.suerte;

  const aportes: AportesPorAtributo = {
    fuerza: {
      ataque: fuerza * c.ataqueFisicoPorFuerza,
      defensa: fuerza * c.defensaFisicaPorFuerza,
      energiaMaxima: fuerza * c.energiaPorFuerza,
      regeneracionEnergiaPorTurno: fuerza * c.regeneracionEnergiaPorFuerzaVitalidad,
    },
    agilidad: {
      velocidad: agilidad * c.velocidadPorAgilidad,
      evasion: agilidad * c.evasionPorAgilidad,
    },
    vitalidad: {
      hpMaximo: vitalidad * c.vidaPorVitalidad,
      energiaMaxima: vitalidad * c.energiaPorVitalidad,
      defensa: vitalidad * c.defensaFisicaPorVitalidad,
      defensaMagica: vitalidad * c.defensaMagicaPorVitalidad,
      regeneracionVidaPorTurno: vitalidad * c.regeneracionVidaPorVitalidad,
      regeneracionEnergiaPorTurno: vitalidad * c.regeneracionEnergiaPorFuerzaVitalidad,
    },
    inteligencia: {
      manaMaximo: inteligencia * c.manaPorInteligencia,
      ataqueMagico: inteligencia * c.ataqueMagicoPorInteligencia,
      defensaMagica: inteligencia * c.defensaMagicaPorInteligencia,
      regeneracionManaPorTurno: inteligencia * c.regeneracionManaPorInteligencia,
    },
    destreza: {
      ataque: destreza * c.ataqueFisicoPorDestreza,
      ataqueMagico: destreza * c.ataqueMagicoPorDestreza,
      precision: destreza * c.precisionPorDestreza,
      probCritico: destreza * c.criticoPorDestreza,
      velocidad: destreza * c.velocidadPorDestreza,
    },
    suerte: {
      precision: suerte * c.precisionPorSuerte,
      probCritico: suerte * c.criticoPorSuerte,
      danoCritico: suerte * c.multiplicadorCriticoPorSuerte,
      evasion: suerte * c.evasionPorSuerte,
    },
  };

  if (usaEstadisticasLegadas(personaje, claseActualId)) {
    // En personajes legacy, vida/ataque/defensa/velocidad/crítico siguen
    // dependiendo de la fórmula antigua de clase y nivel, no de los atributos.
    for (const fuente of Object.values(aportes)) {
      delete fuente.hpMaximo;
      delete fuente.ataque;
      delete fuente.defensa;
      delete fuente.velocidad;
      delete fuente.probCritico;
      delete fuente.danoCritico;
    }
  }

  return aportes;
}

export function calcularBaseSinAtributos(
  personaje: DatosPersonajeEstadisticas,
  claseActualId: string,
  baseCalculada: ModificadoresEstadisticas
): ModificadoresEstadisticas {
  const c = COEFICIENTES_ATRIBUTOS_RPG;
  const nivel = Number.isFinite(personaje.nivel) ? Math.max(1, Math.floor(personaje.nivel)) : 1;

  if (usaEstadisticasLegadas(personaje, claseActualId)) {
    // Las estadísticas heredadas no dependen de atributos, pero las estadísticas
    // mágicas y los recursos siguen usando las fórmulas del sistema RPG.
    return {
      ...baseCalculada,
      ataqueMagico: c.ataqueMagicoBase,
      defensaMagica: 0,
      precision: c.precisionBase,
      evasion: 0,
      energiaMaxima: c.energiaBase,
      manaMaximo: c.manaBase,
      regeneracionVidaPorTurno: 0,
      regeneracionEnergiaPorTurno: c.energiaBase * 0.2,
      regeneracionManaPorTurno: c.regeneracionManaBase,
    };
  }

  const capacidadLegada = calcularEstadisticasBase("Novato", nivel);
  return {
    hpMaximo: c.vidaBase + (nivel - 1) * c.vidaPorNivelBase,
    ataque: c.ataqueFisicoBase,
    defensa: 0,
    velocidad: c.velocidadBase,
    capacidadCarruaje: capacidadLegada.capacidadCarruaje,
    probCritico: c.criticoBase,
    danoCritico: c.multiplicadorCriticoBase,
    ataqueMagico: c.ataqueMagicoBase,
    defensaMagica: 0,
    precision: c.precisionBase,
    evasion: 0,
    energiaMaxima: c.energiaBase,
    manaMaximo: c.manaBase,
    regeneracionVidaPorTurno: 0,
    regeneracionEnergiaPorTurno: c.energiaBase * 0.2,
    regeneracionManaPorTurno: c.regeneracionManaBase,
  };
}

