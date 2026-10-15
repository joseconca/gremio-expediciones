import type {
  DefinicionHabilidad,
  EquipoPersonaje,
  ObjetoInventario,
  AtributosPrincipales,
} from "./tiposJuego";
import { calcularEstadisticasBase } from "./configuracionJuego";
import { obtenerHabilidadPorId } from "./habilidades";
import { ajustarHabilidadPorNivel, type HabilidadAprendidaConNivel } from "./progresion/niveles-habilidad";
import { calcularEstadisticasObjeto, obtenerSubtipoArmadura } from "./objetos";
import {
  calcularEstadisticasDerivadasRpg,
  COEFICIENTES_ATRIBUTOS_RPG,
} from "./progresion/estadisticas";
import { calcularAtributosClase } from "./progresion/atributos-clase";
import {
  CLASES,
  calcularBonificacionesDominioEquipo,
  puedeUsarHabilidadDeClase,
} from "./progresion/clases";

export interface DatosPersonajeEstadisticas {
  clase: string;
  profesionActivaId?: string;
  nivel: number;
  nivelJob?: number;
  progresosClase?: readonly { claseId: string; nivelJob: number; desbloqueada?: boolean }[];
  fuerza?: number;
  agilidad?: number;
  vitalidad?: number;
  inteligencia?: number;
  destreza?: number;
  suerte?: number;
  velocidadMejoras: number;
  capacidadCarruajeMejoras: number;
}

/**
 * Estadísticas derivadas del personaje.
 * Las siete primeras conservan nombres legacy para compatibilidad con el juego
 * existente; las restantes permiten que los nuevos sistemas consuman atributos RPG.
 */
export interface ModificadoresEstadisticas {
  hpMaximo: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
  probCritico: number;
  danoCritico: number;
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

export type AportesPorAtributo = Record<
  keyof AtributosPrincipales,
  Partial<ModificadoresEstadisticas>
>;

export interface DesgloseEstadisticasPersonaje {
  /** Base calculada (con los atributos aplicados y redondeada por el sistema). */
  base: ModificadoresEstadisticas;
  /** Término fijo/nivel anterior a sumar los atributos principales. */
  baseSinAtributos: ModificadoresEstadisticas;
  mejoras: ModificadoresEstadisticas;
  pasivas: ModificadoresEstadisticas;
  equipo: ModificadoresEstadisticas;
  combate: ModificadoresEstadisticas;
  /** Aporte matemático de cada atributo principal a las estadísticas derivadas. */
  atributos: AportesPorAtributo;
  total: ModificadoresEstadisticas;
}

const MODIFICADORES_VACIOS: ModificadoresEstadisticas = {
  hpMaximo: 0,
  ataque: 0,
  defensa: 0,
  velocidad: 0,
  capacidadCarruaje: 0,
  probCritico: 0,
  danoCritico: 0,
  ataqueMagico: 0,
  defensaMagica: 0,
  precision: 0,
  evasion: 0,
  energiaMaxima: 0,
  manaMaximo: 0,
  regeneracionVidaPorTurno: 0,
  regeneracionEnergiaPorTurno: 0,
  regeneracionManaPorTurno: 0,
};

function sumarModificadores(
  ...modificadores: ModificadoresEstadisticas[]
): ModificadoresEstadisticas {
  const sumar = (campo: keyof ModificadoresEstadisticas) =>
    modificadores.reduce((total, actual) => {
      const valor = actual[campo];
      return total + (typeof valor === "number" && Number.isFinite(valor) ? valor : 0);
    }, 0);

  return {
    hpMaximo: sumar("hpMaximo"),
    ataque: sumar("ataque"),
    defensa: sumar("defensa"),
    velocidad: sumar("velocidad"),
    capacidadCarruaje: sumar("capacidadCarruaje"),
    probCritico: sumar("probCritico"),
    danoCritico: sumar("danoCritico"),
    ataqueMagico: sumar("ataqueMagico"),
    defensaMagica: sumar("defensaMagica"),
    precision: sumar("precision"),
    evasion: sumar("evasion"),
    energiaMaxima: sumar("energiaMaxima"),
    manaMaximo: sumar("manaMaximo"),
    regeneracionVidaPorTurno: sumar("regeneracionVidaPorTurno"),
    regeneracionEnergiaPorTurno: sumar("regeneracionEnergiaPorTurno"),
    regeneracionManaPorTurno: sumar("regeneracionManaPorTurno"),
  };
}

/**
 * Calcula las estadísticas de una pieza y aplica dominio de armas/armaduras.
 * Las joyas son objetos de tipo "accesorio", por lo que quedan fuera de la
 * penalización de armadura aunque aporten defensa.
 */
function calcularEstadisticasPiezaEquipamiento(
  pieza: ObjetoInventario,
  claseId?: string | null
): ModificadoresEstadisticas {
  const estadisticas = calcularEstadisticasObjeto(
    pieza.objeto,
    pieza.nivelMejora,
    pieza.bonificaciones
  );
  if (!claseId) return estadisticas;

  if (pieza.objeto.tipo === "arma") {
    const dominio = calcularBonificacionesDominioEquipo(
      claseId,
      pieza.objeto.subtipo
    );
    estadisticas.ataque *= dominio.multiplicadorAtaqueArma;
    if (typeof estadisticas.ataqueMagico === "number") {
      estadisticas.ataqueMagico *= dominio.multiplicadorAtaqueArma;
    }
  } else if (pieza.objeto.tipo === "armadura" && pieza.objeto.slot === "mano_secundaria") {
    // El escudo se domina como un tipo de equipamiento de mano, no como
    // armadura ligera/media/pesada. Las piezas legacy sin subtipo se tratan como escudos.
    const tipoEscudo = pieza.objeto.subtipo ?? "escudo";
    const dominio = calcularBonificacionesDominioEquipo(
      claseId,
      tipoEscudo
    );
    estadisticas.defensa *= dominio.multiplicadorAtaqueArma;
    if (typeof estadisticas.defensaMagica === "number") {
      estadisticas.defensaMagica *= dominio.multiplicadorAtaqueArma;
    }
  } else if (pieza.objeto.tipo === "armadura") {
    // Una armadura sin subtipo conocido se trata como no dominada, nunca como
    // una pieza que evita por accidente la penalización.
    const subtipo = obtenerSubtipoArmadura(pieza.objeto) ?? "__sin_subtipo__";
    const dominio = calcularBonificacionesDominioEquipo(
      claseId,
      undefined,
      subtipo
    );
    estadisticas.defensa *= dominio.multiplicadorDefensaArmadura;
    if (typeof estadisticas.defensaMagica === "number") {
      estadisticas.defensaMagica *= dominio.multiplicadorDefensaArmadura;
    }
  }

  return estadisticas;
}

/** Aplica dominios en todas las ranuras; las joyas no se consideran armadura. */
export function calcularModificadoresEquipo(
  equipo: EquipoPersonaje,
  claseId?: string | null
): ModificadoresEstadisticas {
  const piezas: Array<ObjetoInventario | null> = [
    equipo.arma,
    equipo.manoSecundaria,
    equipo.casco,
    equipo.armadura,
    equipo.pantalones,
    equipo.botas,
    equipo.guantes,
    equipo.accesorio,
    equipo.anillo1,
    equipo.anillo2,
  ];

  return sumarModificadores(
    ...piezas
      .filter((pieza): pieza is ObjetoInventario => pieza !== null)
      .map((pieza) => calcularEstadisticasPiezaEquipamiento(pieza, claseId))
  );
}

function obtenerModificadoresPasivas(
  habilidadesAprendidas: HabilidadAprendidaConNivel[],
  claseActualId: string
): ModificadoresEstadisticas {
  const pasivas: DefinicionHabilidad[] = habilidadesAprendidas
    .map((entrada) => {
      const habilidadId = typeof entrada === "string" ? entrada : entrada.habilidadId;
      const nivel = typeof entrada === "string" ? 1 : entrada.nivel ?? 1;
      const habilidad = obtenerHabilidadPorId(habilidadId);
      return habilidad ? ajustarHabilidadPorNivel(habilidad, nivel) : undefined;
    })
    .filter(
      (habilidad): habilidad is DefinicionHabilidad =>
        habilidad !== undefined &&
        habilidad.tipo === "pasiva" &&
        puedeUsarHabilidadDeClase(claseActualId, habilidad.claseId)
    );

  const sumar = (selector: (habilidad: DefinicionHabilidad) => number | undefined) =>
    pasivas.reduce((total, habilidad) => total + (selector(habilidad) ?? 0), 0);

  return {
    hpMaximo: sumar((habilidad) => habilidad.bonusHpMaximo),
    ataque: sumar((habilidad) => habilidad.bonusAtaque),
    defensa: sumar((habilidad) => habilidad.bonusDefensa),
    velocidad: sumar((habilidad) => habilidad.bonusVelocidad),
    capacidadCarruaje: 0,
    probCritico: sumar((habilidad) => habilidad.probabilidadCritico),
    danoCritico: 0,
    ataqueMagico: sumar((habilidad) => habilidad.bonusAtaqueMagico),
    defensaMagica: sumar((habilidad) => habilidad.bonusDefensaMagica),
    precision: sumar((habilidad) => habilidad.bonusPrecision),
    evasion: sumar((habilidad) => habilidad.bonusEvasion),
    energiaMaxima: sumar((habilidad) => habilidad.bonusEnergiaMaxima),
    manaMaximo: sumar((habilidad) => habilidad.bonusManaMaximo),
    regeneracionVidaPorTurno: sumar((habilidad) => habilidad.bonusRegeneracionVida),
    regeneracionEnergiaPorTurno: sumar((habilidad) => habilidad.bonusRegeneracionEnergia),
    regeneracionManaPorTurno: sumar((habilidad) => habilidad.bonusRegeneracionMana),
  };
}

function obtenerAtributosPrincipales(personaje: DatosPersonajeEstadisticas): AtributosPrincipales {
  const claseId = personaje.profesionActivaId ?? "novato";
  const progreso = personaje.progresosClase?.find((item) => item.claseId === claseId && item.desbloqueada !== false);
  const nivelJob = typeof personaje.nivelJob === "number" && Number.isFinite(personaje.nivelJob) ? personaje.nivelJob : progreso?.nivelJob ?? 1;
  return calcularAtributosClase(claseId, personaje.nivel, nivelJob);
}

function obtenerEstadisticasBase(
  personaje: DatosPersonajeEstadisticas,
  claseActualId: string
): ModificadoresEstadisticas {
  const derivadasRpg = calcularEstadisticasDerivadasRpg(
    obtenerAtributosPrincipales(personaje),
    personaje.nivel
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

function calcularAportesPorAtributo(
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

function calcularBaseSinAtributos(
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
      regeneracionEnergiaPorTurno: 0,
      regeneracionManaPorTurno: 0,
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
    regeneracionEnergiaPorTurno: 0,
    regeneracionManaPorTurno: 0,
  };
}

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
  const totalSinRedondear = sumarModificadores(base, mejoras, pasivas, equipo, combate);

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
