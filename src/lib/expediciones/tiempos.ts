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

/** El encuentro ocurre a mitad del tiempo total, antes de cualquier combate. */
export function calcularFechaEncuentroProgramada(
  fechaSalida: Date,
  duracionTotalHoras: number,
): Date {
  return new Date(
    fechaSalida.getTime() + (duracionTotalHoras * 60 * 60 * 1000) / 2
  );
}

/**
 * El comercio conserva el mínimo histórico de un minuto por tramo.
 * Su regreso parte de la fecha prevista del encuentro, no del momento
 * en que el jugador confirma el resultado comercial.
 */
export function calcularRegresoComercioProgramado(
  fechaSalidaIda: Date,
  fechaLlegadaEncuentro: Date,
): { duracionIda: number; fechaSalidaRegreso: Date; fechaLlegadaRegreso: Date } {
  const duracionIda = Math.max(
    60_000,
    fechaLlegadaEncuentro.getTime() - fechaSalidaIda.getTime()
  );
  const fechaSalidaRegreso = fechaLlegadaEncuentro;
  return {
    duracionIda,
    fechaSalidaRegreso,
    fechaLlegadaRegreso: new Date(fechaSalidaRegreso.getTime() + duracionIda),
  };
}

/** Penalizaciones meteorológicas históricas; la consulta al proveedor queda en servidor. */
export function clasificarClimaExpedicion(codigo: unknown): {
  multiplicadorTiempo: number;
  climaReporte: string;
} {
  if (typeof codigo === "number") {
    if (codigo >= 51 && codigo <= 67) {
      return { multiplicadorTiempo: 1.2, climaReporte: "Lluvia y barro en los caminos" };
    }
    if (codigo >= 71 && codigo <= 77) {
      return { multiplicadorTiempo: 1.5, climaReporte: "Fuertes nevadas" };
    }
    if (codigo >= 95) {
      return { multiplicadorTiempo: 1.8, climaReporte: "Tormenta eléctrica peligrosa" };
    }
  }
  return { multiplicadorTiempo: 1, climaReporte: "Despejado / Buen tiempo" };
}
