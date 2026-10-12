import type { DefinicionHabilidad, EquipoPersonaje, AtributosPrincipales } from "./tiposJuego";
import { calcularEstadisticasBase } from "./configuracionJuego";
import { obtenerHabilidadPorId } from "./habilidades";
import { calcularEstadisticasObjeto } from "./objetos";
import { calcularEstadisticasDerivadasRpg } from "./progresion/estadisticas";
import { CLASES, calcularBonificacionesDominioEquipo, puedeUsarHabilidadDeClase } from "./progresion/clases";

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

export interface ModificadoresEstadisticas {
  hpMaximo: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
  probCritico: number;
  danoCritico: number;
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
};

function sumarModificadores(
  ...modificadores: ModificadoresEstadisticas[]
): ModificadoresEstadisticas {
  return {
    hpMaximo: modificadores.reduce((total, actual) => total + actual.hpMaximo, 0),
    ataque: modificadores.reduce((total, actual) => total + actual.ataque, 0),
    defensa: modificadores.reduce((total, actual) => total + actual.defensa, 0),
    velocidad: modificadores.reduce((total, actual) => total + actual.velocidad, 0),
    capacidadCarruaje: modificadores.reduce((total, actual) => total + actual.capacidadCarruaje, 0),
    probCritico: modificadores.reduce((total, actual) => total + actual.probCritico, 0),
    danoCritico: modificadores.reduce((total, actual) => total + actual.danoCritico, 0),
  };
}

/** El bonus de dominio solo multiplica el ataque del arma o la defensa de la armadura correspondiente. */
export function calcularModificadoresEquipo(
  equipo: EquipoPersonaje,
  claseId?: string | null
): ModificadoresEstadisticas {
  const modificadores: ModificadoresEstadisticas[] = [];

  if (equipo.arma) {
    const estadisticasArma = calcularEstadisticasObjeto(
      equipo.arma.objeto,
      equipo.arma.nivelMejora
    );
    if (claseId) {
      const dominio = calcularBonificacionesDominioEquipo(
        claseId,
        equipo.arma.objeto.subtipo
      );
      estadisticasArma.ataque *= dominio.multiplicadorAtaqueArma;
    }
    modificadores.push(estadisticasArma);
  }

  if (equipo.armadura) {
    const estadisticasArmadura = calcularEstadisticasObjeto(
      equipo.armadura.objeto,
      equipo.armadura.nivelMejora
    );
    if (claseId) {
      const dominio = calcularBonificacionesDominioEquipo(
        claseId,
        undefined,
        equipo.armadura.objeto.categoriaArmadura
      );
      estadisticasArmadura.defensa *= dominio.multiplicadorDefensaArmadura;
    }
    modificadores.push(estadisticasArmadura);
  }

  if (equipo.accesorio) {
    modificadores.push(
      calcularEstadisticasObjeto(equipo.accesorio.objeto, equipo.accesorio.nivelMejora)
    );
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

  return {
    hpMaximo: pasivas.reduce((total, habilidad) => total + (habilidad.bonusHpMaximo ?? 0), 0),
    ataque: pasivas.reduce((total, habilidad) => total + (habilidad.bonusAtaque ?? 0), 0),
    defensa: pasivas.reduce((total, habilidad) => total + (habilidad.bonusDefensa ?? 0), 0),
    velocidad: pasivas.reduce((total, habilidad) => total + (habilidad.bonusVelocidad ?? 0), 0),
    capacidadCarruaje: 0,
    probCritico: pasivas.reduce((total, habilidad) => total + (habilidad.probabilidadCritico ?? 0), 0),
    danoCritico: 0,
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
  const claseBaseLegada = (
    personaje.clase === "Guerrero" ||
    personaje.clase === "Explorador" ||
    personaje.clase === "Comerciante"
  ) && claseActualId === "novato";

  // Personajes antiguos mantienen su balance original hasta que cambien de profesión.
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
    };
  }

  const derivadas = calcularEstadisticasDerivadasRpg(
    obtenerAtributosPrincipales(personaje),
    personaje.nivel
  );
  const capacidadLegada = calcularEstadisticasBase("Novato", personaje.nivel);

  return {
    hpMaximo: derivadas.hpMaximo,
    ataque: derivadas.ataqueFisico,
    defensa: derivadas.defensaFisica,
    velocidad: derivadas.velocidad,
    capacidadCarruaje: capacidadLegada.capacidadCarruaje,
    probCritico: derivadas.probCritico,
    danoCritico: derivadas.danoCritico,
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

  const total: ModificadoresEstadisticas = {
    hpMaximo: Math.max(1, Math.floor(totalSinRedondear.hpMaximo)),
    ataque: Math.max(1, Math.floor(totalSinRedondear.ataque)),
    defensa: Math.max(0, Math.floor(totalSinRedondear.defensa)),
    velocidad: Math.max(1, Math.floor(totalSinRedondear.velocidad)),
    capacidadCarruaje: Math.max(0, Math.floor(totalSinRedondear.capacidadCarruaje)),
    probCritico: Math.max(0, Math.min(0.75, totalSinRedondear.probCritico)),
    danoCritico: Math.max(1, totalSinRedondear.danoCritico),
  };

  return { base, mejoras, pasivas, equipo, combate, total };
}
