export const PRECIOS_RECURSOS = {
  madera: 50,
  piedra: 100,
  metal: 350,
} as const;

export type RecursoMercado = keyof typeof PRECIOS_RECURSOS;

/** Descuento adicional del 10 % por nivel, limitado al máximo actual del Mercado. */
export function calcularPrecioRecurso(recurso: RecursoMercado, nivelMercado: number): number {
  const nivelSeguro = Number.isFinite(nivelMercado)
    ? Math.min(3, Math.max(1, Math.floor(nivelMercado)))
    : 1;
  const multiplicador = 1 - (nivelSeguro - 1) * 0.1;
  return Math.max(1, Math.trunc(PRECIOS_RECURSOS[recurso] * multiplicador));
}
