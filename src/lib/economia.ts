export const PRECIOS_RECURSOS = {
  madera: 50,
  piedra: 100,
  metal: 250,
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

/** Venta de recursos: un cuarto del precio de compra vigente, con oro entero. */
export function calcularPrecioVentaRecurso(precioUnitarioCompra: number, cantidad: number): number {
  const precio = Number.isFinite(precioUnitarioCompra)
    ? Math.max(0, Math.trunc(precioUnitarioCompra))
    : 0;
  const unidades = Number.isFinite(cantidad) ? Math.max(0, Math.trunc(cantidad)) : 0;
  return Math.floor((precio * unidades) / 4);
}

/** Venta: 35 % del precio de catálogo, calculado con aritmética entera. */
export function calcularPrecioVentaObjeto(precioUnitario: number, cantidad: number): number {
  const precio = Number.isFinite(precioUnitario) ? Math.max(0, Math.trunc(precioUnitario)) : 0;
  const unidades = Number.isFinite(cantidad) ? Math.max(1, Math.trunc(cantidad)) : 1;
  return Math.max(1, Math.floor((precio * unidades * 35) / 100));
}

/** Recompra: 70 % del catálogo y al menos una moneda más que la venta. */
export function calcularPrecioRecompraObjeto(
  precioUnitario: number,
  cantidad: number,
  precioVenta: number
): number {
  const precio = Number.isFinite(precioUnitario) ? Math.max(0, Math.trunc(precioUnitario)) : 0;
  const unidades = Number.isFinite(cantidad) ? Math.max(1, Math.trunc(cantidad)) : 1;
  const venta = Number.isFinite(precioVenta) ? Math.max(1, Math.trunc(precioVenta)) : 1;
  return Math.max(venta + 1, Math.ceil((precio * unidades * 70) / 100));
}
