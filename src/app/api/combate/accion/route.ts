import { adaptarAccionCombate } from "@/server/services/combate/dispatcher";

/** Ruta de compatibilidad para clientes que todavía usan el endpoint común. */
export async function POST(request: Request) {
  return adaptarAccionCombate(request);
}
