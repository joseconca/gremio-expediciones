import type { DefinicionHabilidad } from "./tiposJuego";
import { obtenerHabilidadesDisponiblesParaClase } from "./habilidades";

/**
 * La Escuela de Batalla muestra todo el catálogo propio y heredado de la
 * profesión activa. Ya no hay rotación diaria ni compra de habilidades por oro.
 */
export function obtenerHabilidadesEnVenta(claseActualId?: string): DefinicionHabilidad[] {
  if (!claseActualId) return [];
  return obtenerHabilidadesDisponiblesParaClase(claseActualId);
}
