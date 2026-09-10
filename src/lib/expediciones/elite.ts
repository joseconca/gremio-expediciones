import { JEFES_ELITE, obtenerEnemigoPorId } from "@/lib/enemigos";
import type { DefinicionEnemigo } from "@/lib/tiposJuego";

export function seleccionarJefeElite(
  enemigoId: string
): DefinicionEnemigo {
  const jefe = obtenerEnemigoPorId(enemigoId);

  if (!jefe || !JEFES_ELITE.some((enemigo) => enemigo.id === jefe.id)) {
    throw new Error("El enemigo indicado no es un jefe de élite válido.");
  }

  return jefe;
}