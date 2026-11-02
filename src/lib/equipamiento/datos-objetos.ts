import type { DefinicionObjeto, EquipoPersonaje, ObjetoInventario } from "@/lib/tiposJuego";

/** Un solo contrato para la respuesta de GET /api/objetos. No contiene reglas de negocio. */
export interface ObjetoEnVenta extends DefinicionObjeto {
  puedeComprar: boolean;
  nivelHeroeNecesario: number;
}

export interface UltimaVentaObjeto {
  nombreObjeto: string;
  precioRecompra: number;
  vendidoEn: string;
}

export interface DatosObjetos {
  armeriaNivel: number;
  herreriaNivel: number;
  enVenta: ObjetoEnVenta[];
  inventario: ObjetoInventario[];
  equipo: EquipoPersonaje;
  espaciosInventario: { ocupados: number; maximo: number };
  ultimaVenta: UltimaVentaObjeto | null;
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
}
