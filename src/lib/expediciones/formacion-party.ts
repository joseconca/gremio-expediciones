import { normalizarPosicionCombate } from "./posicion-combate";

/** Center two allies as a group without changing their tactical lane or hiding their overhead bars. */
export function compactarPareja<T extends { x: number; y: number }>(
  actores: T[], alto: number, ancho: number, alturaHeroe: number, minimoY: number, maximoY: number,
): T[] {
  if (actores.length !== 2 || alto <= 0) return actores;
  const distanciaHorizontal = Math.abs(actores[0].x - actores[1].x) * ancho / 200;
  const distanciaSegura = (ancho < 768 ? 94 : 108) / 2 + alturaHeroe * 0.3;
  const separacionDeseada = distanciaHorizontal < distanciaSegura ? alturaHeroe + 72 : alturaHeroe * 0.75;
  const separacionActual = Math.abs(actores[0].y - actores[1].y) * alto / 100;
  const mitad = Math.min(separacionActual, separacionDeseada) / alto * 50;
  const centro = (minimoY + maximoY) / 2;
  const primeroArriba = actores[0].y <= actores[1].y;
  return actores.map((actor, indice) => ({
    ...actor, y: centro + ((indice === 0) === primeroArriba ? -mitad : mitad),
  }));
}

export function distribuirFormacionParty<T extends { jugadorPosicion: string; esLider: boolean; ordenTurno: number }>(
  participantes: T[],
  alto: number, alturaHeroe: number, ancho: number,
): { participante: T; x: number; y: number }[] {
  const columnas = { retaguardia: 30, centro: 56, mele: 76 } as const;
  const minimoY = Math.min(48, (alturaHeroe / 2 + (ancho >= 768 ? 102 : 84)) / Math.max(1, alto) * 100);
  const maximoY = Math.max(minimoY, 100 - (alturaHeroe / 2 + 18) / Math.max(1, alto) * 100);
  const carrilesY = { mele: minimoY, retaguardia: (minimoY + maximoY) / 2, centro: maximoY };
  const grupos: Record<keyof typeof columnas, T[]> = {
    retaguardia: [],
    centro: [],
    mele: [],
  };
  for (const participante of participantes) {
    const posicion = normalizarPosicionCombate(participante.jugadorPosicion);
    grupos[posicion].push(participante);
  }

  const resultado: { participante: T; x: number; y: number }[] = [];
  for (const posicion of ["retaguardia", "centro", "mele"] as const) {
    // Los aventureros en carriles distintos se alinean horizontalmente.
    // Si comparten carril, se escalonan verticalmente y el líder queda abajo.
    const grupo = grupos[posicion].sort((a, b) =>
      Number(a.esLider) - Number(b.esLider) ||
      a.ordenTurno - b.ordenTurno,
    );
    const nivelesY = grupo.length === 1 ? [carrilesY[posicion]]
      : grupo.map((_, indice) => minimoY + indice * (maximoY - minimoY) / Math.max(1, grupo.length - 1));
    grupo.forEach((participante, indice) => {
      resultado.push({ participante, x: columnas[posicion], y: nivelesY[indice] });
    });
  }
  return compactarPareja(resultado, alto, ancho, alturaHeroe, minimoY, maximoY);
}
