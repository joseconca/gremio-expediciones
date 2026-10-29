import type { DefinicionHabilidad } from "../tiposJuego";
import { CLASES } from "./clases";

export const COSTE_PUNTO_POR_NIVEL_HABILIDAD = 1;
export const COSTE_REINICIO_POR_NIVEL_JOB = 100;

export type HabilidadAprendidaConNivel = string | { habilidadId: string; nivel?: number };

/** El máximo depende de la profesión propietaria, incluso cuando la habilidad se hereda. */
export function nivelMaximoHabilidad(claseId?: string | null): number {
  const tier = CLASES[claseId ?? "novato"]?.tier ?? 0;
  return tier <= 0 ? 3 : tier === 1 ? 5 : 10;
}

export function costeReinicioHabilidades(nivelJob: number): number {
  const nivel = Number.isFinite(nivelJob) ? Math.max(1, Math.floor(nivelJob)) : 1;
  return nivel * COSTE_REINICIO_POR_NIVEL_JOB;
}

/**
 * Novato: +10 % por rango (máx. 3); Tier 1: +6 % (máx. 5); Tier 2+: +3,5 % (máx. 10).
 * Los efectos temporales pueden durar más y los cooldown largos pueden reducirse.
 * Mejorar nunca aumenta el coste de Energía o Maná.
 */
export function ajustarHabilidadPorNivel(habilidad: DefinicionHabilidad, nivelSolicitado = 1): DefinicionHabilidad {
  const maximo = nivelMaximoHabilidad(habilidad.claseId);
  const nivel = Number.isFinite(nivelSolicitado) ? Math.max(1, Math.min(maximo, Math.floor(nivelSolicitado))) : 1;
  if (nivel === 1) return habilidad;
  // Las transformaciones conservan su presupuesto y sus relojes: subir rango
  // no puede convertir una retirada/traslado en una cadena de acciones gratis.
  if (habilidad.programaTactico) return { ...habilidad };

  const tier = CLASES[habilidad.claseId ?? "novato"]?.tier ?? 0;
  const rangos = nivel - 1;
  const factor = 1 + rangos * (tier <= 0 ? 0.10 : tier === 1 ? 0.06 : 0.035);
  const mejorada: DefinicionHabilidad = { ...habilidad };
  const porcentajes: (keyof DefinicionHabilidad)[] = [
    "multiplicadorDano", "curacionPorcentaje", "curacionProgresivaPorcentaje",
    "danoProgresivoPorcentaje", "roboVida", "bonusDefensaPorcentaje",
    "bonusCuracion", "probabilidadCritico", "bonusEvasion",
  ];
  const cantidades: (keyof DefinicionHabilidad)[] = [
    "danoBase", "curacion", "bonusAtaque", "bonusAtaqueMagico", "bonusDefensa",
    "bonusDefensaMagica", "bonusPrecision", "bonusEnergiaMaxima", "bonusManaMaximo",
    "bonusRegeneracionVida", "bonusRegeneracionEnergia",
    "bonusVelocidad", "bonusHpMaximo", "recuperarEnergia",
  ];
  for (const campo of porcentajes) {
    const valor = habilidad[campo];
    if (typeof valor === "number" && valor > 0) {
      (mejorada as unknown as Record<string, unknown>)[campo] = Math.round(valor * factor * 10000) / 10000;
    }
  }
  for (const campo of cantidades) {
    const valor = habilidad[campo];
    // Las penalizaciones deliberadas no se vuelven más severas al mejorar.
    if (typeof valor === "number" && valor > 0) {
      (mejorada as unknown as Record<string, unknown>)[campo] = Math.max(1, Math.round(valor * factor));
    }
  }
  // El maná conserva fracciones entre turnos: cada rango debe mejorar su regeneración.
  if ((habilidad.bonusRegeneracionMana ?? 0) > 0) {
    mejorada.bonusRegeneracionMana = Math.round(habilidad.bonusRegeneracionMana! * factor * 100) / 100;
  }
  if (habilidad.multiplicadorCritico !== undefined && habilidad.multiplicadorCritico > 1) {
    mejorada.multiplicadorCritico = Math.round(habilidad.multiplicadorCritico * factor * 100) / 100;
  }

  const incrementoDuracion = tier <= 1 ? Math.floor(rangos / 2) : Math.floor(rangos / 3);
  if (incrementoDuracion > 0) {
    if (habilidad.duracionTurnos !== undefined) mejorada.duracionTurnos = habilidad.duracionTurnos + incrementoDuracion;
  }
  const reduccionCooldown = tier <= 0 ? Math.floor(rangos / 2) : tier === 1 ? Math.floor(rangos / 3) : Math.floor(rangos / 4);
  if (habilidad.cooldownTurnos !== undefined && habilidad.cooldownTurnos > 0 && reduccionCooldown > 0) {
    const recuperacionGratuita = (habilidad.recuperarEnergia ?? 0) > 0 && !(habilidad.costeEnergia || habilidad.costeMana);
    const curacion = habilidad.efecto === "curacion" || habilidad.efecto === "curacion_progresiva";
    const minimo = recuperacionGratuita ? 4 : curacion ? 2 : 1;
    mejorada.cooldownTurnos = Math.max(minimo, habilidad.cooldownTurnos - reduccionCooldown);
  }
  if (habilidad.estadosSecundarios) {
    mejorada.estadosSecundarios = habilidad.estadosSecundarios.map((estado) => {
      if (estado.valor <= 0) return { ...estado, duracionTurnos: estado.duracionTurnos + incrementoDuracion };
      if (estado.tipo === "barrera") return { ...estado };
      const penalizacionPropia = estado.objetivo === "jugador" && estado.tipo.startsWith("debuff_");
      if (penalizacionPropia) return { ...estado };
      const valor = estado.tipo === "debuff_precision" || estado.tipo === "bonus_precision"
        ? Math.round(estado.valor * factor)
        : Math.round(estado.valor * factor * 10000) / 10000;
      return { ...estado, valor, duracionTurnos: estado.duracionTurnos + incrementoDuracion };
    });
  }
  return mejorada;
}
