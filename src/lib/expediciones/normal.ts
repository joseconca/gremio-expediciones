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

/**
 * Encuentros normales de referencia. En party las combinaciones con varios
 * enemigos usan las probabilidades solicitadas; en solitario se reducen.
 * Cuando una plantilla cae por debajo de amenaza 0, su probabilidad se
 * redistribuye al encuentro individual, evitando fabricar amenazas negativas.
 */
export type TipoComposicionEncuentro = "individual" | "doble_objetivo" | "objetivo_mas_uno_menor" | "triple_escalonado" | "doble_inferior";

export const PESOS_COMPOSICION_ENCUENTRO: Record<"solo" | "party", Record<TipoComposicionEncuentro, number>> = {
  party: {
    individual: 46,
    doble_objetivo: 12,
    objetivo_mas_uno_menor: 18,
    triple_escalonado: 12,
    doble_inferior: 12,
  },
  solo: {
    individual: 78,
    doble_objetivo: 5,
    objetivo_mas_uno_menor: 8,
    triple_escalonado: 3,
    doble_inferior: 6,
  },
};

export function generarComposicionDifMinEncuentro(
  dificultad: number,
  enParty: boolean,
  tirada: number,
): number[] {
  const objetivo = Number.isFinite(dificultad) ? Math.max(0, Math.floor(dificultad)) : 0;
  const pesos = PESOS_COMPOSICION_ENCUENTRO[enParty ? "party" : "solo"];
  const opciones: { tipo: TipoComposicionEncuentro; peso: number }[] = [];
  const redistribuirAlIndividual = { tipo: "individual" as const, peso: 0 };

  for (const [tipo, peso] of Object.entries(pesos) as [TipoComposicionEncuentro, number][]) {
    if (tipo === "objetivo_mas_uno_menor" && objetivo < 1 ||
        tipo === "triple_escalonado" && objetivo < 1 ||
        tipo === "doble_inferior" && objetivo < 1) {
      // En amenaza 0 solo existen enemigos de amenaza 0: conservar el 12%
      // de doble objetivo y concentrar los demás pesos en el encuentro único.
      redistribuirAlIndividual.peso += peso;
      continue;
    }
    if (tipo === "triple_escalonado" && objetivo === 1) {
      // Falta un segundo nivel inferior. La plantilla pasa a encuentro simple;
      // así en amenaza 1 la masa individual pasa al 58% (party) / 81% (solo).
      redistribuirAlIndividual.peso += peso;
      continue;
    }
    opciones.push({ tipo, peso });
  }
  const opcionesFinales = opciones.map((opcion) =>
    opcion.tipo === "individual"
      ? { ...opcion, peso: opcion.peso + redistribuirAlIndividual.peso }
      : opcion,
  );
  const total = opcionesFinales.reduce((suma, opcion) => suma + opcion.peso, 0);
  const normalizada = Math.max(0, Math.min(0.999999999, Number.isFinite(tirada) ? tirada : 0));
  let cursor = normalizada * total;
  let elegido = opcionesFinales[0]?.tipo ?? "individual";
  for (const opcion of opcionesFinales) {
    if (cursor < opcion.peso) {
      elegido = opcion.tipo;
      break;
    }
    cursor -= opcion.peso;
  }

  switch (elegido) {
    case "doble_objetivo":
      return [objetivo, objetivo];
    case "objetivo_mas_uno_menor":
      return [objetivo, objetivo - 1];
    case "triple_escalonado":
      return [objetivo, objetivo - 1, objetivo - 2];
    case "doble_inferior":
      return [objetivo - 1, objetivo - 1];
    default:
      return [objetivo];
  }
}

function seleccionarEnemigoDeAmenaza(
  difMin: number,
  rng: () => number,
  idsExcluidos: Set<string>,
): DefinicionEnemigo {
  const candidatosDisponibles = obtenerEnemigosPorDificultad(difMin)
    .filter((enemigo) => enemigo.id !== "mimic" && enemigo.difMin === difMin);
  const todosMismoNivel = candidatosDisponibles.length > 0
    ? candidatosDisponibles
    : obtenerEnemigosPorDificultad(difMin)
        .filter((enemigo) => enemigo.id !== "mimic" && enemigo.difMin <= difMin)
        .sort((a, b) => b.difMin - a.difMin);
  if (todosMismoNivel.length === 0) {
    throw new Error("No hay enemigos disponibles para amenaza " + difMin + ".");
  }

  const noRepetidos = todosMismoNivel.filter((enemigo) => !idsExcluidos.has(enemigo.id));
  const candidatos = noRepetidos.length > 0 ? noRepetidos : todosMismoNivel;
  const nivelElegido = candidatos[0].difMin;
  const delNivel = candidatos.filter((enemigo) => enemigo.difMin === nivelElegido);
  const rarezas = [...new Set(delNivel.map((enemigo) => enemigo.rareza ?? "comun"))];
  const rareza = seleccionarPonderado(rarezas.map((valor) => ({
    valor,
    peso: calcularPesoRarezaEnemigo(valor),
  })), rng);
  const finales = delNivel.filter((enemigo) => (enemigo.rareza ?? "comun") === rareza);
  return finales[Math.min(finales.length - 1, Math.floor(rng() * finales.length))];
}

/** Selecciona el grupo definitivo de una expedición PvE normal. */
export function seleccionarEnemigosNormales(
  dificultad: number,
  enParty: boolean,
  rng: () => number = Math.random,
): DefinicionEnemigo[] {
  // El mímico es un encuentro singular, no forma grupos normales.
  if (rng() < PROBABILIDAD_ENCUENTRO_MIMICO) {
    const mimico = obtenerEnemigoPorId("mimic");
    if (mimico) return [mimico];
  }

  const composicion = generarComposicionDifMinEncuentro(dificultad, enParty, rng());
  const excluidos = new Set<string>();
  return composicion.map((difMin) => {
    const enemigo = seleccionarEnemigoDeAmenaza(difMin, rng, excluidos);
    excluidos.add(enemigo.id);
    return enemigo;
  });
}

