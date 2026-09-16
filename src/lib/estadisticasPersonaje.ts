import type { DefinicionHabilidad } from "./tiposJuego";
import { calcularEstadisticasBase } from "./configuracionJuego";
import { obtenerHabilidadPorId } from "./habilidades";

export interface DatosPersonajeEstadisticas {
  clase: string;
  nivel: number;

  ataqueMejoras: number;
  defensaMejoras: number;
  velocidadMejoras: number;
  capacidadCarruajeMejoras: number;
}

export interface ModificadoresEstadisticas {
  hpMaximo: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
  probCritico: number;
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
};

function sumarModificadores(
  ...modificadores: ModificadoresEstadisticas[]
): ModificadoresEstadisticas {
  return {
    hpMaximo: modificadores.reduce(
      (total, actual) => total + actual.hpMaximo,
      0
    ),
    ataque: modificadores.reduce((total, actual) => total + actual.ataque, 0),
    defensa: modificadores.reduce((total, actual) => total + actual.defensa, 0),
    velocidad: modificadores.reduce(
      (total, actual) => total + actual.velocidad,
      0
    ),
    capacidadCarruaje: modificadores.reduce(
      (total, actual) => total + actual.capacidadCarruaje,
      0
    ),
    probCritico: modificadores.reduce(
      (total, actual) => total + actual.probCritico,
      0
    ),
  };
}

function obtenerModificadoresPasivas(
  habilidadesAprendidas: string[]
): ModificadoresEstadisticas {
  const pasivas: DefinicionHabilidad[] = habilidadesAprendidas
    .map((habilidadId) => obtenerHabilidadPorId(habilidadId))
    .filter(
      (habilidad): habilidad is DefinicionHabilidad =>
        habilidad !== undefined && habilidad.tipo === "pasiva"
    );

  return {
    hpMaximo: pasivas.reduce(
      (total, habilidad) => total + (habilidad.bonusHpMaximo ?? 0),
      0
    ),
    ataque: pasivas.reduce(
      (total, habilidad) => total + (habilidad.bonusAtaque ?? 0),
      0
    ),
    defensa: pasivas.reduce(
      (total, habilidad) => total + (habilidad.bonusDefensa ?? 0),
      0
    ),
    velocidad: pasivas.reduce(
      (total, habilidad) => total + (habilidad.bonusVelocidad ?? 0),
      0
    ),
    capacidadCarruaje: 0,
    probCritico: pasivas.reduce(
      (total, habilidad) => total + (habilidad.probabilidadCritico ?? 0),
      0
    ),
  };
}

export function calcularEstadisticasPersonaje(
  personaje: DatosPersonajeEstadisticas,
  habilidadesAprendidas: string[] = [],
  equipo: ModificadoresEstadisticas = MODIFICADORES_VACIOS,
  combate: ModificadoresEstadisticas = MODIFICADORES_VACIOS
): DesgloseEstadisticasPersonaje {
  if (
    personaje.clase !== "Guerrero" &&
    personaje.clase !== "Explorador" &&
    personaje.clase !== "Comerciante"
  ) {
    throw new Error(`Clase de personaje inválida: ${personaje.clase}`);
  }

  const baseCalculada = calcularEstadisticasBase(
    personaje.clase,
    personaje.nivel
  );

  const base: ModificadoresEstadisticas = {
    hpMaximo: baseCalculada.hpMaximo,
    ataque: baseCalculada.ataque,
    defensa: baseCalculada.defensa,
    velocidad: baseCalculada.velocidad,
    capacidadCarruaje: baseCalculada.capacidadCarruaje,
    probCritico: baseCalculada.probCritico,
  };

  const mejoras: ModificadoresEstadisticas = {
    hpMaximo: 0,
    ataque: personaje.ataqueMejoras,
    defensa: personaje.defensaMejoras,
    velocidad: personaje.velocidadMejoras,
    capacidadCarruaje: personaje.capacidadCarruajeMejoras,
    probCritico: 0,
  };

  const pasivas = obtenerModificadoresPasivas(habilidadesAprendidas);

  const totalSinRedondear = sumarModificadores(
    base,
    mejoras,
    pasivas,
    equipo,
    combate
  );

  const total: ModificadoresEstadisticas = {
    hpMaximo: Math.floor(totalSinRedondear.hpMaximo),
    ataque: Math.floor(totalSinRedondear.ataque),
    defensa: Math.floor(totalSinRedondear.defensa),
    velocidad: Math.floor(totalSinRedondear.velocidad),
    capacidadCarruaje: Math.floor(totalSinRedondear.capacidadCarruaje),
    probCritico: Math.min(1, totalSinRedondear.probCritico),
  };

  return {
    base,
    mejoras,
    pasivas,
    equipo,
    combate,
    total,
  };
}
