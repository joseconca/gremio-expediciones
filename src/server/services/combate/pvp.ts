import { procesarAccionCombate } from "@/server/services/combate/accion-combate";

/** Orquesta una acción validada para un combate PvP. */
export function ejecutarAccionPvp(request: Request) {
  return procesarAccionCombate(request, "pvp");
}
