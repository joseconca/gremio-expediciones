import { calcularPrecioVentaObjeto, calcularPrecioRecompraObjeto } from "@/lib/economia/mercado";
import { obtenerNombreObjetoConSufijo, sanitizarBonificacionesObjeto } from "./sufijos";

/**
 * Contrato persistido en inventario.ultimaVenta, compartido por venta y recompra.
 * Almacena la instancia completa, no solo su definición de catálogo.
 */
export interface VentaGuardada {
  instanciaId: string;
  objetoId: string;
  cantidad: number;
  nivelMejora: number;
  sufijoId: string | null;
  bonificaciones: Record<string, number>;
  precioVenta: number;
  precioRecompra: number;
  nombreObjeto: string;
  vendidoEn: string;
}

/** Construye un recibo de venta conservando las fórmulas históricas. */
export function crearUltimaVenta(
  instancia: {
    id: string;
    objetoId: string;
    cantidad: number;
    nivelMejora: number;
    sufijoId: string | null;
    bonificaciones: unknown;
  },
  definicion: { nombre: string; precio: number },
  vendidoEn: Date,
): VentaGuardada {
  const cantidadPrecio = Math.max(1, instancia.cantidad);
  const precioVenta = calcularPrecioVentaObjeto(definicion.precio, cantidadPrecio);
  const precioRecompra = calcularPrecioRecompraObjeto(definicion.precio, cantidadPrecio, precioVenta);
  const sufijoId = instancia.sufijoId ?? null;
  return {
    instanciaId: instancia.id,
    objetoId: instancia.objetoId,
    cantidad: instancia.cantidad,
    nivelMejora: instancia.nivelMejora,
    sufijoId,
    bonificaciones: sanitizarBonificacionesObjeto(instancia.bonificaciones),
    precioVenta,
    precioRecompra,
    nombreObjeto: obtenerNombreObjetoConSufijo(definicion.nombre, sufijoId),
    vendidoEn: vendidoEn.toISOString(),
  };
}

/**
 * Interpreta únicamente un recibo válido. Mantiene la compatibilidad con
 * registros antiguos, incluidas las normalizaciones de cantidad y sufijo.
 */
export function leerUltimaVenta(value: unknown): VentaGuardada | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.instanciaId !== "string" ||
      typeof v.objetoId !== "string" ||
      typeof v.precioRecompra !== "number" || !Number.isFinite(v.precioRecompra) ||
      typeof v.cantidad !== "number" || typeof v.nivelMejora !== "number") return null;
  return {
    instanciaId: v.instanciaId,
    objetoId: v.objetoId,
    cantidad: Math.max(1, Math.trunc(v.cantidad)),
    nivelMejora: Math.max(0, Math.trunc(v.nivelMejora)),
    sufijoId: typeof v.sufijoId === "string" ? v.sufijoId : null,
    bonificaciones: sanitizarBonificacionesObjeto(v.bonificaciones),
    precioVenta: typeof v.precioVenta === "number" ? v.precioVenta : 0,
    precioRecompra: Math.max(1, Math.trunc(v.precioRecompra)),
    nombreObjeto: typeof v.nombreObjeto === "string" ? v.nombreObjeto : v.objetoId,
    vendidoEn: typeof v.vendidoEn === "string" ? v.vendidoEn : "",
  };
}
