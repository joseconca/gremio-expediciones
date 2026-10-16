import { obtenerEnemigoPorId } from "@/lib/enemigos";
import {
  aplicarMultiplicadorRecompensa,
  calcularExperienciaBaseGanada,
  calcularOroEnemigo,
  CONFIGURACION_DIFICULTAD,
  type ModoDificultad,
} from "@/lib/expediciones/dificultad";
import type { EnemigoEnCombate } from "@/lib/expediciones/enemigos-combate";
import type { DefinicionEnemigo, RecompensaMision } from "@/lib/tiposJuego";

export interface EnemigoDerrotadoConDefinicion {
  snapshot: EnemigoEnCombate;
  definicion: DefinicionEnemigo;
}

export interface RecompensasParcialesDerrota {
  /** Oro de consolación de la misión más oro por las criaturas abatidas. */
  oro: number;
  /** XP de consolación de la misión más XP Base de cada criatura abatida. */
  experiencia: number;
  /** Recursos de la misión asegurados en proporción a las criaturas abatidas. */
  recompensa: RecompensaMision;
  enemigosDerrotados: EnemigoDerrotadoConDefinicion[];
  oroPorEnemigos: number;
  experienciaPorEnemigos: number;
  oroConsolacion: number;
  experienciaConsolacion: number;
}

/**
 * Calcula la liquidación parcial de una derrota PvE.
 * Solo cuentan las criaturas cuyo HP llegó a cero; el resto de la misión
 * continúa fallida y no desbloquea progreso por victoria.
 */
export function calcularRecompensasParcialesDerrota(input: {
  enemigos: EnemigoEnCombate[];
  recompensaMision: RecompensaMision;
  dificultadMision: number;
  nivelBase: number;
  modoDificultad: ModoDificultad;
}): RecompensasParcialesDerrota {
  const {
    enemigos,
    recompensaMision,
    dificultadMision,
    nivelBase,
    modoDificultad,
  } = input;
  const enemigosDerrotados = enemigos
    .filter((snapshot) => snapshot.hp <= 0)
    .map((snapshot) => ({
      snapshot,
      definicion: obtenerEnemigoPorId(snapshot.enemigoId),
    }))
    .filter(
      (entrada): entrada is EnemigoDerrotadoConDefinicion =>
        entrada.definicion !== null && entrada.definicion !== undefined,
    );

  const oroConsolacion = Math.floor(
    recompensaMision.oro *
      CONFIGURACION_DIFICULTAD[modoDificultad].multiplicadorRecompensa *
      0.2,
  );
  const experienciaConsolacion = Math.floor(
    calcularExperienciaBaseGanada(dificultadMision, nivelBase, modoDificultad) * 0.1,
  );
  const oroBaseEnemigos = enemigosDerrotados.reduce(
    (total, entrada) =>
      total + calcularOroEnemigo(entrada.definicion.botin, entrada.snapshot.difMin),
    0,
  );
  const oroPorEnemigos = aplicarMultiplicadorRecompensa(oroBaseEnemigos, modoDificultad);
  const experienciaPorEnemigos = enemigosDerrotados.reduce(
    (total, entrada) =>
      total + calcularExperienciaBaseGanada(entrada.snapshot.difMin, nivelBase, modoDificultad),
    0,
  );

  const proporcionDerrotados = enemigos.length > 0
    ? Math.min(1, enemigosDerrotados.length / enemigos.length)
    : 0;
  const recursos = {
    madera: Math.floor(recompensaMision.madera * proporcionDerrotados),
    piedra: Math.floor(recompensaMision.piedra * proporcionDerrotados),
    metal: Math.floor(recompensaMision.metal * proporcionDerrotados),
  };

  return {
    oro: oroConsolacion + oroPorEnemigos,
    experiencia: experienciaConsolacion + experienciaPorEnemigos,
    recompensa: {
      oro: oroConsolacion + oroPorEnemigos,
      madera: recursos.madera,
      piedra: recursos.piedra,
      metal: recursos.metal,
    },
    enemigosDerrotados,
    oroPorEnemigos,
    experienciaPorEnemigos,
    oroConsolacion,
    experienciaConsolacion,
  };
}
