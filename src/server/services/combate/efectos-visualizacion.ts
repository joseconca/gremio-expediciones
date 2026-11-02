import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";

/** Único adaptador de pulsos visuales para PvE y PvP. */
export function adjuntarPulsosEstado(
  accion: AccionAnimadaCombate,
  objetivo: "jugador" | "enemigo",
  cambios: { danoAplicado: number; curacionAplicada: number },
): AccionAnimadaCombate {
  const pulsosEstado = [...(accion.pulsosEstado ?? [])];
  if (cambios.danoAplicado > 0) pulsosEstado.push({ objetivo, tipo: "dano", cantidad: cambios.danoAplicado });
  if (cambios.curacionAplicada > 0) pulsosEstado.push({ objetivo, tipo: "curacion", cantidad: cambios.curacionAplicada });
  return { ...accion, ...(pulsosEstado.length > 0 ? { pulsosEstado } : {}) };
}
