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
