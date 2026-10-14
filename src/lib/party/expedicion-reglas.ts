export const ESTADOS_EXPEDICION_PARTY_ACTIVOS = [
  "en_viaje",
  "lista_para_combate",
  "combatiendo",
  "regresando",
] as const;

export function esMisionPveCompartida(misionId: string): boolean {
  return misionId.startsWith("mision-") || misionId.startsWith("elite-");
}

export function calcularVelocidadMinimaParty(velocidadesKmh: number[]): number {
  if (velocidadesKmh.length < 2 || velocidadesKmh.length > 3) {
    throw new RangeError("Una expedición de party debe tener entre dos y tres integrantes.");
  }
  if (velocidadesKmh.some((velocidad) => !Number.isFinite(velocidad) || velocidad <= 0)) {
    throw new RangeError("Todas las velocidades deben ser números positivos.");
  }
  return Math.min(...velocidadesKmh);
}

/**
 * Todos los integrantes usan una misma hora de llegada. El grupo viaja a la
 * velocidad del aventurero más lento, respetando la regla de duración mínima
 * y el modificador meteorológico de las expediciones actuales.
 */
export function calcularFechaLlegadaParty(
  distanciaKm: number,
  velocidadesKmh: number[],
  multiplicadorTiempo = 1,
  fechaSalida: Date = new Date(),
): Date {
  if (!Number.isFinite(distanciaKm) || distanciaKm < 0) {
    throw new RangeError("La distancia debe ser un número no negativo.");
  }
  if (!Number.isFinite(multiplicadorTiempo) || multiplicadorTiempo <= 0) {
    throw new RangeError("El multiplicador de tiempo debe ser positivo.");
  }
  if (!(fechaSalida instanceof Date) || !Number.isFinite(fechaSalida.getTime())) {
    throw new RangeError("La fecha de salida no es válida.");
  }

  const velocidadGrupo = calcularVelocidadMinimaParty(velocidadesKmh);
  const horas = Math.max(1 / 60, distanciaKm / velocidadGrupo) * multiplicadorTiempo;
  return new Date(fechaSalida.getTime() + (horas * 60 * 60 * 1000) / 2);
}
