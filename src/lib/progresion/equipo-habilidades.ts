import { SLOTS_HABILIDADES_ACTIVAS, SLOTS_HABILIDADES_PASIVAS, type SlotHabilidad } from "../tiposJuego";

/** Contrato compartido por Escuela, API y todos los modos de combate. */
export const LIMITE_ACTIVAS_EQUIPADAS = 5;
export const LIMITE_PASIVAS_EQUIPADAS = 3;

export function esSlotActivo(slot: string | null | undefined): slot is SlotHabilidad {
  return SLOTS_HABILIDADES_ACTIVAS.includes(slot as SlotHabilidad);
}

export function esSlotPasivo(slot: string | null | undefined): slot is SlotHabilidad {
  return SLOTS_HABILIDADES_PASIVAS.includes(slot as SlotHabilidad);
}

export function esSlotHabilidad(slot: unknown): slot is SlotHabilidad {
  return typeof slot === "string" && (esSlotActivo(slot) || esSlotPasivo(slot));
}
