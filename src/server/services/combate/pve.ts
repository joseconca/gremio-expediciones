import { procesarAccionCombate } from "@/server/services/combate/accion-combate";

/** Orquesta una acción validada para un combate PvE. */
export function ejecutarAccionPve(request: Request) {
  return procesarAccionCombate(request, "pve");
}
