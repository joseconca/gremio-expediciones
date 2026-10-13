import { procesarAccionCombate } from "@/server/services/combate/accion-combate";

/** Ruta de compatibilidad para clientes que todavía usan el endpoint común. */
export async function POST(request: Request) {
  return procesarAccionCombate(request);
}
