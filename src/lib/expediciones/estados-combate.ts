import type { EstadoEfectoHabilidad, TipoEfectoTemporalHabilidad } from "../tiposJuego";

const TIPOS_VALIDOS: readonly TipoEfectoTemporalHabilidad[] = [
  "bonus_defensa", "debuff_defensa", "bonus_ataque", "debuff_ataque",
  "bonus_ataque_magico", "debuff_precision", "bonus_evasion",
  "dano_progresivo", "curacion_progresiva",
];

export function leerEfectosCombate(valor: unknown): EstadoEfectoHabilidad[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is EstadoEfectoHabilidad => {
    if (!item || typeof item !== "object") return false;
    const e = item as Record<string, unknown>;
    return typeof e.habilidadId === "string" &&
      typeof e.tipo === "string" &&
      TIPOS_VALIDOS.includes(e.tipo as TipoEfectoTemporalHabilidad) &&
      typeof e.valor === "number" && Number.isFinite(e.valor) &&
      typeof e.turnosRestantes === "number" && Number.isFinite(e.turnosRestantes) &&
      e.turnosRestantes > 0 &&
      (e.objetivo === undefined || e.objetivo === "jugador" || e.objetivo === "enemigo");
  });
}

export function procesarTicksPeriodicos(
  efectos: readonly EstadoEfectoHabilidad[],
  hpActual: number,
  hpMaximo: number,
  nombreObjetivo: string,
): { hp: number; mensajes: string[]; danoAplicado: number; curacionAplicada: number } {
  let hp = Math.max(0, Math.min(Math.floor(hpMaximo), Math.floor(hpActual)));
  const mensajes: string[] = [];
  let danoAplicado = 0;
  let curacionAplicada = 0;
  for (const efecto of efectos) {
    if (efecto.tipo === "dano_progresivo" && hp > 0) {
      const danoSolicitado = Math.max(0, Math.floor(efecto.valor));
      const dano = Math.min(hp, danoSolicitado);
      hp = Math.max(0, hp - dano);
      danoAplicado += dano;
      if (dano > 0) mensajes.push(`🩸 ${nombreObjetivo} recibe ${dano} de daño progresivo de ${efecto.habilidadId}.`);
    } else if (efecto.tipo === "curacion_progresiva" && hp > 0) {
      const curacion = Math.min(Math.max(0, Math.floor(efecto.valor)), Math.max(0, Math.floor(hpMaximo) - hp));
      hp += curacion;
      curacionAplicada += curacion;
      if (curacion > 0) mensajes.push(`✨ ${nombreObjetivo} recupera ${curacion} HP por curación progresiva.`);
    }
  }
  return { hp, mensajes, danoAplicado, curacionAplicada };
}

/** Consume un turno y revierte las modificaciones de defensa al expirar. */
export function avanzarEfectosCombate(
  efectos: readonly EstadoEfectoHabilidad[],
  defensaActual: number,
): { efectos: EstadoEfectoHabilidad[]; defensa: number; mensajes: string[] } {
  let defensa = defensaActual;
  const nuevos: EstadoEfectoHabilidad[] = [];
  const mensajes: string[] = [];
  for (const efecto of efectos) {
    const restantes = efecto.turnosRestantes - 1;
    if (restantes > 0) {
      nuevos.push({ ...efecto, turnosRestantes: restantes });
      continue;
    }
    if (efecto.tipo === "bonus_defensa") defensa = Math.max(0, defensa - efecto.valor);
    if (efecto.tipo === "debuff_defensa") defensa = Math.max(0, defensa + efecto.valor);
    mensajes.push(`⌛ El efecto de ${efecto.habilidadId} termina.`);
  }
  return { efectos: nuevos, defensa, mensajes };
}

/** Reaplicar una misma habilidad renueva sus estados en vez de apilarlos. */
export function retirarEfectosHabilidad(
  efectos: readonly EstadoEfectoHabilidad[],
  habilidadId: string,
  defensaActual: number,
): { efectos: EstadoEfectoHabilidad[]; defensa: number } {
  let defensa = defensaActual;
  const restantes: EstadoEfectoHabilidad[] = [];
  for (const efecto of efectos) {
    if (efecto.habilidadId !== habilidadId) {
      restantes.push(efecto);
      continue;
    }
    if (efecto.tipo === "bonus_defensa") defensa = Math.max(0, defensa - efecto.valor);
    if (efecto.tipo === "debuff_defensa") defensa = Math.max(0, defensa + efecto.valor);
  }
  return { efectos: restantes, defensa };
}

/** Los efectos periódicos se procesan al comienzo del turno de quien los sufre. */
export function procesarEfectosTurno(
  efectos: readonly EstadoEfectoHabilidad[],
  hpActual: number,
  hpMaximo: number,
  defensaActual: number,
  nombreObjetivo: string,
): {
  efectos: EstadoEfectoHabilidad[];
  hp: number;
  defensa: number;
  mensajes: string[];
  danoAplicado: number;
  curacionAplicada: number;
} {
  const ticks = procesarTicksPeriodicos(efectos, hpActual, hpMaximo, nombreObjetivo);
  const duracion = avanzarEfectosCombate(efectos, defensaActual);
  return {
    efectos: duracion.efectos,
    hp: ticks.hp,
    defensa: duracion.defensa,
    mensajes: [...ticks.mensajes, ...duracion.mensajes],
    danoAplicado: ticks.danoAplicado,
    curacionAplicada: ticks.curacionAplicada,
  };
}

export function calcularAtaqueModificado(
  ataqueBase: number,
  efectos: readonly EstadoEfectoHabilidad[],
  magico = false,
): number {
  let ataque = ataqueBase;
  for (const efecto of efectos) {
    if (magico && efecto.tipo === "bonus_ataque_magico") ataque *= 1 + efecto.valor;
    if (!magico && efecto.tipo === "bonus_ataque") ataque *= 1 + efecto.valor;
    if (efecto.tipo === "debuff_ataque") ataque *= 1 - efecto.valor;
  }
  return Math.max(1, Math.floor(ataque + Number.EPSILON * Math.max(1, Math.abs(ataque))));
}

export function calcularPrecisionModificada(precisionBase: number, efectos: readonly EstadoEfectoHabilidad[]): number {
  return Math.min(100, Math.max(1, precisionBase - efectos.reduce((total, e) => total + (e.tipo === "debuff_precision" ? e.valor : 0), 0)));
}

export function calcularEvasionModificada(evasionBase: number, efectos: readonly EstadoEfectoHabilidad[]): number {
  return Math.min(0.6, Math.max(0, evasionBase + efectos.reduce((total, e) => total + (e.tipo === "bonus_evasion" ? e.valor : 0), 0)));
}
