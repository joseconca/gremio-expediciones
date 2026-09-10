import { obtenerEnemigosPorDificultad } from "@/lib/enemigos";
import type { DefinicionEnemigo } from "@/lib/tiposJuego";

export function seleccionarEnemigoNormal(
  dificultad: number
): DefinicionEnemigo {
  const enemigosDisponibles = obtenerEnemigosPorDificultad(dificultad);

  if (enemigosDisponibles.length === 0) {
    throw new Error("No hay enemigos disponibles para esta dificultad.");
  }

  return enemigosDisponibles[
    Math.floor(Math.random() * enemigosDisponibles.length)
  ];
}
