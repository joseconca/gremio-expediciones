import type { AtributosPrincipales, DefinicionHabilidad } from "../tiposJuego";
import { COEFICIENTES_ATRIBUTOS_RPG } from "./estadisticas";

import { obtenerHabilidadPorId } from "../habilidades";
import { ajustarHabilidadPorNivel, type HabilidadAprendidaConNivel } from "./niveles-habilidad";
import { puedeUsarHabilidadDeClase } from "./clases";
import type { ModificadoresEstadisticas } from "./estadisticas/modificadores-estadisticas";

/** Bonificaciones pasivas aprendidas, aplicando nivel y permisos de clase. */
export function obtenerModificadoresPasivas(
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
    regeneracionEnergiaPorTurno: sumar((habilidad) => habilidad.bonusRegeneracionEnergia) + sumar((habilidad) => habilidad.bonusEnergiaMaxima) * 0.2,
    regeneracionManaPorTurno: sumar((habilidad) => habilidad.bonusRegeneracionMana),
  };
}

/** Aplica la conversión especial de Núcleo arcano sobre el total y su desglose.
 * Mantiene la mutación original: sólo se llama después de sumar equipo y pasivas.
 */
export function aplicarConversionReservaInteligencia({
  habilidadesAprendidas,
  claseActualId,
  atributosPrincipales,
  atributosPorPasivas,
  totalSinRedondear,
  pasivas,
}: {
  habilidadesAprendidas: HabilidadAprendidaConNivel[];
  claseActualId: string;
  atributosPrincipales: AtributosPrincipales;
  atributosPorPasivas: Partial<AtributosPrincipales>;
  totalSinRedondear: ModificadoresEstadisticas;
  pasivas: ModificadoresEstadisticas;
}): void {
  const conversionActiva = habilidadesAprendidas.some((entrada) => {
    const id = typeof entrada === "string" ? entrada : entrada.habilidadId;
    const habilidad = obtenerHabilidadPorId(id);
    return habilidad?.conversionReservaInteligencia &&
      puedeUsarHabilidadDeClase(claseActualId, habilidad.claseId);
  });

  if (conversionActiva) {
    // El mana total ya incluye equipo y pasivas, sin redondeo de estadísticas.
    const manaPrevio = totalSinRedondear.manaMaximo ?? 0;
    const inteligenciaPrevia = atributosPrincipales.inteligencia;
    const ganada = Math.min(
      Math.floor(manaPrevio * 0.1),
      Math.floor(inteligenciaPrevia * 0.2),
      12
    );
    atributosPrincipales.inteligencia += ganada;
    atributosPorPasivas.inteligencia = ganada;

    const ataque = ganada * COEFICIENTES_ATRIBUTOS_RPG.ataqueMagicoPorInteligencia;
    const defensa = ganada * COEFICIENTES_ATRIBUTOS_RPG.defensaMagicaPorInteligencia;
    const regeneracion = ganada * COEFICIENTES_ATRIBUTOS_RPG.regeneracionManaPorInteligencia;

    totalSinRedondear.manaMaximo = Math.floor(manaPrevio * 0.9);
    totalSinRedondear.ataqueMagico = (totalSinRedondear.ataqueMagico ?? 0) + ataque;
    totalSinRedondear.defensaMagica = (totalSinRedondear.defensaMagica ?? 0) + defensa;
    totalSinRedondear.regeneracionManaPorTurno =
      (totalSinRedondear.regeneracionManaPorTurno ?? 0) + regeneracion;

    pasivas.manaMaximo = (pasivas.manaMaximo ?? 0) + Math.floor(manaPrevio * 0.9) - manaPrevio;
    pasivas.ataqueMagico = (pasivas.ataqueMagico ?? 0) + ataque;
    pasivas.defensaMagica = (pasivas.defensaMagica ?? 0) + defensa;
    pasivas.regeneracionManaPorTurno = (pasivas.regeneracionManaPorTurno ?? 0) + regeneracion;
  }
}
