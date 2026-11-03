export const POSICIONES_COMBATE = ["mele", "centro", "retaguardia"] as const;

export type PosicionCombate = (typeof POSICIONES_COMBATE)[number];

export const ETIQUETAS_POSICION_COMBATE: Record<PosicionCombate, string> = {
  mele: "Melé",
  centro: "Centro",
  retaguardia: "Retaguardia",
};

export const DESCRIPCIONES_POSICION_COMBATE: Record<PosicionCombate, string> = {
  mele: "+15 % defensa · −15 % ataque",
  centro: "Sin modificaciones",
  retaguardia: "−15 % defensa · +15 % ataque",
};

export function normalizarPosicionCombate(valor: unknown): PosicionCombate {
  return typeof valor === "string" && POSICIONES_COMBATE.includes(valor as PosicionCombate)
    ? (valor as PosicionCombate)
    : "centro";
}

type EstadisticasConPosicion = {
  ataque: number;
  ataqueMagico?: number;
  defensa: number;
  defensaMagica?: number;
};

function multiplicarSeguro(valor: number, multiplicador: number, minimo: number): number {
  if (!Number.isFinite(valor)) return minimo;
  return Math.max(minimo, Math.round(valor * multiplicador));
}

/** Aplica modificadores tácticos a estadísticas congeladas al iniciar un combate. */
export function aplicarModificadoresPosicion<T extends EstadisticasConPosicion>(
  estadisticas: T,
  posicionOriginal: unknown,
): T {
  const posicion = normalizarPosicionCombate(posicionOriginal);
  const multiplicadorAtaque = posicion === "mele" ? 0.85 : posicion === "retaguardia" ? 1.15 : 1;
  const multiplicadorDefensa = posicion === "mele" ? 1.15 : posicion === "retaguardia" ? 0.85 : 1;

  return {
    ...estadisticas,
    ataque: multiplicarSeguro(estadisticas.ataque, multiplicadorAtaque, 1),
    ...(estadisticas.ataqueMagico !== undefined
      ? { ataqueMagico: multiplicarSeguro(estadisticas.ataqueMagico, multiplicadorAtaque, 1) }
      : {}),
    defensa: multiplicarSeguro(estadisticas.defensa, multiplicadorDefensa, 0),
    ...(estadisticas.defensaMagica !== undefined
      ? { defensaMagica: multiplicarSeguro(estadisticas.defensaMagica, multiplicadorDefensa, 0) }
      : {}),
  } as T;
}
