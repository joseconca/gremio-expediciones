import type { DefinicionHabilidad } from "./tiposJuego";
import { obtenerHabilidadesDisponiblesParaClase } from "./habilidades";

export interface ProgresoJobHabilidad {
  claseId: string;
  nivelJob: number;
  puntosHabilidadDisponibles: number;
  desbloqueada: boolean;
}

export interface RequisitosAprendizajeHabilidad {
  nivelJobClase: number;
  puntosHabilidadDisponiblesClase: number;
  progresoClaseDesbloqueada: boolean;
  costePuntosHabilidad: number;
  cumpleNivelJob: boolean;
  cumplePuntosHabilidad: boolean;
  puedeAprender: boolean;
}

/**
 * Evalúa una habilidad con el progreso de la clase a la que pertenece.
 * Las habilidades heredadas conservan los requisitos y puntos de su clase
 * de origen, aunque el personaje esté usando una profesión avanzada.
 */
export function evaluarRequisitosAprendizaje(
  habilidad: Pick<DefinicionHabilidad, "claseId" | "nivelJobRequerido" | "costePuntosHabilidad">,
  progreso: ProgresoJobHabilidad | null | undefined,
): RequisitosAprendizajeHabilidad {
  const nivelJobRequerido = habilidad.nivelJobRequerido ?? 1;
  const costePuntosHabilidad = Math.max(1, Math.floor(habilidad.costePuntosHabilidad ?? 1));
  const nivelJobClase = progreso?.nivelJob ?? 0;
  const puntosHabilidadDisponiblesClase = progreso?.puntosHabilidadDisponibles ?? 0;
  const progresoClaseDesbloqueada = Boolean(progreso?.desbloqueada);
  const cumpleNivelJob = progresoClaseDesbloqueada && nivelJobClase >= nivelJobRequerido;
  const cumplePuntosHabilidad = progresoClaseDesbloqueada && puntosHabilidadDisponiblesClase >= costePuntosHabilidad;

  return {
    nivelJobClase,
    puntosHabilidadDisponiblesClase,
    progresoClaseDesbloqueada,
    costePuntosHabilidad,
    cumpleNivelJob,
    cumplePuntosHabilidad,
    puedeAprender: cumpleNivelJob && cumplePuntosHabilidad,
  };
}

/**
 * La Escuela de Batalla muestra todo el catálogo propio y heredado de la
 * profesión activa. Ya no hay rotación diaria ni compra de habilidades por oro.
 */
export function obtenerHabilidadesEnVenta(claseActualId?: string): DefinicionHabilidad[] {
  if (!claseActualId) return [];
  return obtenerHabilidadesDisponiblesParaClase(claseActualId);
}
