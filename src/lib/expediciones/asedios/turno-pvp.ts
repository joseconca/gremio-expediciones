export const TIEMPO_MAXIMO_TURNO_MS = 90_000;

/** El turno se considera expirado exactamente al alcanzar los 90 segundos. */
export function haExpiradoTurnoPvp(
  ultimoTurno: Date | number,
  ahora: number,
): boolean {
  const timestamp = ultimoTurno instanceof Date ? ultimoTurno.getTime() : ultimoTurno;
  return Number.isFinite(timestamp) && ahora - timestamp >= TIEMPO_MAXIMO_TURNO_MS;
}
