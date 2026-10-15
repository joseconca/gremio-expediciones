/**
 * Calcula el tramo de vuelta a partir del horario previsto de la expedición.
 *
 * `fechaLlegada` representa el momento programado de llegada al encuentro,
 * situado a mitad de la duración total. La vuelta conserva esa duración
 * prevista aunque el combate se resuelva tarde; no debe empezar a contar
 * desde la hora real de resolución del combate.
 */
export function calcularFechasRegresoProgramadas(
  fechaSalidaIda: Date,
  fechaLlegadaEncuentro: Date,
): { fechaSalida: Date; fechaLlegada: Date } {
  if (
    !(fechaSalidaIda instanceof Date) ||
    !Number.isFinite(fechaSalidaIda.getTime()) ||
    !(fechaLlegadaEncuentro instanceof Date) ||
    !Number.isFinite(fechaLlegadaEncuentro.getTime())
  ) {
    throw new RangeError("Las fechas de la expedición no son válidas.");
  }

  const duracionIdaMs = fechaLlegadaEncuentro.getTime() - fechaSalidaIda.getTime();
  if (duracionIdaMs < 0) {
    throw new RangeError("La fecha del encuentro no puede preceder a la salida.");
  }

  return {
    fechaSalida: new Date(fechaLlegadaEncuentro.getTime()),
    fechaLlegada: new Date(fechaLlegadaEncuentro.getTime() + duracionIdaMs),
  };
}
