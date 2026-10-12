import type {
  DefinicionHabilidad,
  EquipoPersonaje,
  AtributosPrincipales,
} from "./tiposJuego";
import { calcularEstadisticasBase } from "./configuracionJuego";
import { obtenerHabilidadPorId } from "./habilidades";
import { calcularEstadisticasObjeto } from "./objetos";
import { calcularEstadisticasDerivadasRpg } from "./progresion/estadisticas";
import {
  CLASES,
  calcularBonificacionesDominioEquipo,
  puedeUsarHabilidadDeClase,
} from "./progresion/clases";

export interface DatosPersonajeEstadisticas {
  clase: string;
  profesionActivaId?: string;
  nivel: number;
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

export interface DesgloseEstadisticasPersonaje {
  base: ModificadoresEstadisticas;
  mejoras: ModificadoresEstadisticas;
  pasivas: ModificadoresEstadisticas;
  equipo: ModificadoresEstadisticas;
  combate: ModificadoresEstadisticas;
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

/** Aplica los dominios profesionales a la categoría de arma y armadura correspondiente. */
export function calcularModificadoresEquipo(
  equipo: EquipoPersonaje,
  claseId?: string | null
): ModificadoresEstadisticas {
  const modificadores: ModificadoresEstadisticas[] = [];

  if (equipo.arma) {
    const estadisticasArma = calcularEstadisticasObjeto(
      equipo.arma.objeto,
      equipo.arma.nivelMejora,
      equipo.arma.bonificaciones
    );
    if (claseId) {
      const dominio = calcularBonificacionesDominioEquipo(
        claseId,
        equipo.arma.objeto.subtipo
      );
      estadisticasArma.ataque *= dominio.multiplicadorAtaqueArma;
      if (estadisticasArma.ataqueMagico) {
        estadisticasArma.ataqueMagico *= dominio.multiplicadorAtaqueArma;
      }
    }
    modificadores.push(estadisticasArma);
  }

  if (equipo.armadura) {
    const estadisticasArmadura = calcularEstadisticasObjeto(
      equipo.armadura.objeto,
      equipo.armadura.nivelMejora,
      equipo.armadura.bonificaciones
    );
    if (claseId) {
      const dominio = calcularBonificacionesDominioEquipo(
        claseId,
        undefined,
        equipo.armadura.objeto.categoriaArmadura
      );
      estadisticasArmadura.defensa *= dominio.multiplicadorDefensaArmadura;
      if (estadisticasArmadura.defensaMagica) {
        estadisticasArmadura.defensaMagica *= dominio.multiplicadorDefensaArmadura;
      }
    }
    modificadores.push(estadisticasArmadura);
  }

  if (equipo.accesorio) {
    modificadores.push(
      calcularEstadisticasObjeto(
        equipo.accesorio.objeto,
        equipo.accesorio.nivelMejora,
        equipo.accesorio.bonificaciones
      )
    );
  }

  const piezasAdicionales = [
    equipo.manoSecundaria,
    equipo.casco,
    equipo.pantalones,
    equipo.botas,
    equipo.guantes,
    equipo.anillo1,
    equipo.anillo2,
  ];

  for (const pieza of piezasAdicionales) {
    if (!pieza) continue;
    const estadisticas = calcularEstadisticasObjeto(
      pieza.objeto,
      pieza.nivelMejora,
      pieza.bonificaciones
    );
    if (claseId && pieza.objeto.tipo === "armadura") {
      const dominio = calcularBonificacionesDominioEquipo(
        claseId,
        undefined,
        pieza.objeto.categoriaArmadura
      );
      estadisticas.defensa *= dominio.multiplicadorDefensaArmadura;
      if (estadisticas.defensaMagica) {
        estadisticas.defensaMagica *= dominio.multiplicadorDefensaArmadura;
      }
    }
    modificadores.push(estadisticas);
  }

  return sumarModificadores(...modificadores);
}

function obtenerModificadoresPasivas(
  habilidadesAprendidas: string[],
  claseActualId: string
): ModificadoresEstadisticas {
  const pasivas: DefinicionHabilidad[] = habilidadesAprendidas
    .map((habilidadId) => obtenerHabilidadPorId(habilidadId))
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

function obtenerAtributosPrincipales(
  personaje: DatosPersonajeEstadisticas
): AtributosPrincipales {
  const enteroPositivo = (valor: number | undefined) =>
    typeof valor === "number" && Number.isFinite(valor)
      ? Math.max(1, Math.floor(valor))
      : 1;

  return {
    fuerza: enteroPositivo(personaje.fuerza),
    agilidad: enteroPositivo(personaje.agilidad),
    vitalidad: enteroPositivo(personaje.vitalidad),
    inteligencia: enteroPositivo(personaje.inteligencia),
    destreza: enteroPositivo(personaje.destreza),
    suerte: enteroPositivo(personaje.suerte),
  };
}

function obtenerEstadisticasBase(
  personaje: DatosPersonajeEstadisticas,
  claseActualId: string
): ModificadoresEstadisticas {
  const derivadasRpg = calcularEstadisticasDerivadasRpg(
    obtenerAtributosPrincipales(personaje),
    personaje.nivel
  );
  const claseBaseLegada = (
    personaje.clase === "Guerrero" ||
    personaje.clase === "Explorador" ||
    personaje.clase === "Comerciante"
  ) && claseActualId === "novato";

  // Las cuentas antiguas conservan sus estadísticas físicas hasta que cambien de profesión.
  if (claseBaseLegada || (!CLASES[claseActualId] && personaje.clase !== "Novato")) {
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

export function calcularEstadisticasPersonaje(
  personaje: DatosPersonajeEstadisticas,
  habilidadesAprendidas: string[] = [],
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

  return { base, mejoras, pasivas, equipo, combate, total };
}
