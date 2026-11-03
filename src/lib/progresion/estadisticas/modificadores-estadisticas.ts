import type { AtributosPrincipales } from "../../tiposJuego";

/** Contratos y operaciones aditivas para el desglose de estadísticas del personaje. */
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
  atributosPrincipales?: AtributosPrincipales;
  atributosPorPasivas?: Partial<AtributosPrincipales>;
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

export const MODIFICADORES_VACIOS: ModificadoresEstadisticas = {
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

export function sumarModificadores(
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
