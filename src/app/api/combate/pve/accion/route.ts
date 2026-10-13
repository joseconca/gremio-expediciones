import { procesarAccionCombate } from "@/server/services/combate/accion-combate";

export async function POST(request: Request) {
  return procesarAccionCombate(request, "pve");
}
