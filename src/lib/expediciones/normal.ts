import { obtenerEnemigosPorDificultad } from "@/lib/enemigos";
import type { DefinicionEnemigo } from "@/lib/tiposJuego";

const PESOS_RAREZA: Record<string, number> = {
  comun: 40,
  poco_comun: 25,
  raro: 15,
  epico: 10,
  legendario: 1,
};

export function seleccionarEnemigoNormal(
  dificultad: number
): DefinicionEnemigo {
  const enemigosDisponibles = obtenerEnemigosPorDificultad(dificultad);

  if (enemigosDisponibles.length === 0) {
    throw new Error("No hay enemigos disponibles para esta dificultad.");
  }

  let pesoTotal = 0;
  const enemigosConPeso = enemigosDisponibles.map((enemigo) => {
    // Si por algún motivo no tiene rareza, lo tratamos como "comun"
    const rareza = enemigo.rareza ?? "comun";
    const peso = PESOS_RAREZA[rareza] || 10; // Fallback por si hay un typo

    pesoTotal += peso;
    return { enemigo, peso };
  });

  let tirada = Math.random() * pesoTotal;

  for (const item of enemigosConPeso) {
    tirada -= item.peso;
    if (tirada <= 0) {
      return item.enemigo;
    }
  }

  return enemigosDisponibles[enemigosDisponibles.length - 1];
}
