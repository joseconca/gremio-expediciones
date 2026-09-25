import { obtenerEnemigosPorDificultad } from "@/lib/enemigos";
import type { DefinicionEnemigo } from "@/lib/tiposJuego";

const PESOS_RAREZA: Record<string, number> = {
  comun: 70,
  poco_comun: 50,
  raro: 35,
  epico: 20,
  legendario: 1,
};

export function seleccionarEnemigoNormal(
  dificultad: number
): DefinicionEnemigo {
  const enemigosDisponibles = obtenerEnemigosPorDificultad(dificultad);

  if (enemigosDisponibles.length === 0) {
    throw new Error("No hay enemigos disponibles para esta dificultad.");
  }

  const conteoPorRareza: Record<string, number> = {};
  for (const enemigo of enemigosDisponibles) {
    const rareza = enemigo.rareza ?? "comun";
    conteoPorRareza[rareza] = (conteoPorRareza[rareza] || 0) + 1;
  }

  let pesoTotal = 0;
  const enemigosConPeso = enemigosDisponibles.map((enemigo) => {
    const rareza = enemigo.rareza ?? "comun";
    const pesoGlobalRareza = PESOS_RAREZA[rareza] || 10;
    const peso = pesoGlobalRareza / conteoPorRareza[rareza];
  
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
