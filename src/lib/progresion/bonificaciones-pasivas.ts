import type { DefinicionHabilidad } from "../tiposJuego";
import { obtenerHabilidadPorId } from "../habilidades";
import { ajustarHabilidadPorNivel, type HabilidadAprendidaConNivel } from "./niveles-habilidad";
import { puedeUsarHabilidadDeClase } from "./clases";
import type { ModificadoresEstadisticas } from "./modificadores-estadisticas";

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
