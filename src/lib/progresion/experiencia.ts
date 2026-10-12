

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
 * Job tiene una curva independiente: 100 + 25 * nivel^1.5 XP por nivel.
 * El coste acumulado de Job 1 a 40 ronda los 105.000 XP, parecido a llegar
 * a Base 13-14 con la curva Base actual. Esto acelera Job sin regalar Job 40.
 */
export function experienciaJobParaNivel(nivelJob: number): number {
  const nivel = Number.isFinite(nivelJob) ? Math.max(1, Math.floor(nivelJob)) : 1;
  return Math.round(100 + 25 * Math.pow(nivel, 1.5));
}

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

    while (nivelJob < maximo && experienciaJob >= experienciaJobParaNivel(nivelJob)) {
      experienciaJob -= experienciaJobParaNivel(nivelJob);
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
      nivelJob >= maximo ? null : experienciaJobParaNivel(nivelJob) - experienciaJob,
  };
}
