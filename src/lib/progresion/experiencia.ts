import { experienciaParaNivel } from "../configuracionJuego";

/** Puntos libres que obtiene el personaje por cada nivel Base alcanzado. */
export const PUNTOS_ATRIBUTO_POR_NIVEL_BASE = 3;

export interface EstadoProgresoJob {
  nivelJob: number;
  experienciaJob: number;
  puntosHabilidadDisponibles: number;
  maestriaCompletada: boolean;
}

export interface ResultadoExperienciaJob extends EstadoProgresoJob {
  nivelesSubidos: number;
  experienciaNecesariaSiguienteNivel: number | null;
}

/**
 * El progreso Job usa la misma curva que el nivel Base, pero se almacena
 * independientemente para cada profesión en ProgresoClase.
 */
export function aplicarExperienciaJob(
  progreso: EstadoProgresoJob,
  experienciaGanada: number,
  nivelJobMaximo: number
): ResultadoExperienciaJob {
  const maximo = Number.isFinite(nivelJobMaximo)
    ? Math.max(1, Math.floor(nivelJobMaximo))
    : 1;
  let nivelJob = Number.isFinite(progreso.nivelJob)
    ? Math.min(maximo, Math.max(1, Math.floor(progreso.nivelJob)))
    : 1;
  let experienciaJob = Number.isFinite(progreso.experienciaJob)
    ? Math.max(0, Math.floor(progreso.experienciaJob))
    : 0;
  let puntosHabilidadDisponibles = Number.isFinite(progreso.puntosHabilidadDisponibles)
    ? Math.max(0, Math.floor(progreso.puntosHabilidadDisponibles))
    : 0;
  const ganada = Number.isFinite(experienciaGanada)
    ? Math.max(0, Math.floor(experienciaGanada))
    : 0;
  let nivelesSubidos = 0;

  if (nivelJob < maximo) {
    experienciaJob += ganada;

    while (nivelJob < maximo && experienciaJob >= experienciaParaNivel(nivelJob)) {
      experienciaJob -= experienciaParaNivel(nivelJob);
      nivelJob += 1;
      nivelesSubidos += 1;
    }
  }

  if (nivelJob >= maximo) {
    // No acumular XP sin límite cuando la profesión ya está al máximo.
    experienciaJob = 0;
  }

  puntosHabilidadDisponibles += nivelesSubidos;
  const maestriaCompletada = progreso.maestriaCompletada || nivelJob >= maximo;

  return {
    nivelJob,
    experienciaJob,
    puntosHabilidadDisponibles,
    maestriaCompletada,
    nivelesSubidos,
    experienciaNecesariaSiguienteNivel:
      nivelJob >= maximo ? null : experienciaParaNivel(nivelJob) - experienciaJob,
  };
}
