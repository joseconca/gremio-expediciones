import { obtenerEnemigoPorId, obtenerEnemigosPorDificultad } from "@/lib/enemigos";
import type { DefinicionEnemigo } from "@/lib/tiposJuego";

export const PROBABILIDAD_ENCUENTRO_MIMICO = 0.01;
export const MULTIPLICADOR_PESO_DIF_MIN = 3;

/** Los valores son pesos relativos, no porcentajes directos. */
export const PESOS_RAREZA_ENEMIGOS: Record<string, number> = {
  comun: 70,
  poco_comun: 50,
  raro: 35,
  epico: 20,
  legendario: 1,
};

export function calcularPesoDifMinEnemigo(difMin: number): number {
  const nivel = Number.isFinite(difMin) ? Math.max(0, Math.floor(difMin)) : 0;
  return Math.pow(MULTIPLICADOR_PESO_DIF_MIN, nivel);
}

export function calcularPesoRarezaEnemigo(rareza: string): number {
  return PESOS_RAREZA_ENEMIGOS[rareza] ?? 10;
}

function seleccionarPonderado<T>(opciones: { valor: T; peso: number }[]): T {
  const pesoTotal = opciones.reduce((total, opcion) => total + Math.max(0, opcion.peso), 0);
  if (opciones.length === 0 || pesoTotal <= 0) {
    throw new Error("No hay candidatos con peso para seleccionar un enemigo.");
  }
  let tirada = Math.random() * pesoTotal;
  for (const opcion of opciones) {
    if (tirada < opcion.peso) return opcion.valor;
    tirada -= opcion.peso;
  }
  return opciones[opciones.length - 1].valor;
}

export function seleccionarEnemigoNormal(dificultad: number): DefinicionEnemigo {
  // El Mímico es un encuentro especial e independiente del nivel y rareza.
  if (Math.random() < PROBABILIDAD_ENCUENTRO_MIMICO) {
    const mimico = obtenerEnemigoPorId("mimic");
    if (mimico) return mimico;
  }

  const enemigosDisponibles = obtenerEnemigosPorDificultad(dificultad);
  if (enemigosDisponibles.length === 0) {
    throw new Error("No hay enemigos disponibles para esta dificultad.");
  }

  // Primero se elige difMin. Al usar 3^difMin, el nivel N pesa exactamente
  // tres veces lo que N-1, manteniendo una probabilidad positiva para todos
  // los niveles inferiores que existan en el catálogo.
  const enemigosPorDifMin = new Map<number, DefinicionEnemigo[]>();
  for (const enemigo of enemigosDisponibles) {
    const grupo = enemigosPorDifMin.get(enemigo.difMin) ?? [];
    grupo.push(enemigo);
    enemigosPorDifMin.set(enemigo.difMin, grupo);
  }
  const gruposOrdenados = [...enemigosPorDifMin.entries()]
    .sort(([difMinA], [difMinB]) => difMinA - difMinB);
  const grupoElegido = seleccionarPonderado(
    gruposOrdenados.map(([difMin, enemigos]) => ({
      valor: { difMin, enemigos },
      peso: calcularPesoDifMinEnemigo(difMin),
    })),
  );

  // Luego se elige rareza según su peso y después la especie uniformemente.
  const rarezasDisponibles = [...new Set(
    grupoElegido.enemigos.map((enemigo) => enemigo.rareza ?? "comun"),
  )].sort(
    (rarezaA, rarezaB) =>
      calcularPesoRarezaEnemigo(rarezaB) - calcularPesoRarezaEnemigo(rarezaA),
  );
  const rarezaElegida = seleccionarPonderado(
    rarezasDisponibles.map((rareza) => ({
      valor: rareza,
      peso: calcularPesoRarezaEnemigo(rareza),
    })),
  );
  const candidatosFinales = grupoElegido.enemigos.filter(
    (enemigo) => (enemigo.rareza ?? "comun") === rarezaElegida,
  );
  const indice = Math.min(
    candidatosFinales.length - 1,
    Math.floor(Math.random() * candidatosFinales.length),
  );
  return candidatosFinales[indice];
}
