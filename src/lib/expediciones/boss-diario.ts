/** El plazo comienza al ganar, nunca al partir, perder o huir. */
export const ESPERA_BOSS_DIARIO_MS = 23 * 60 * 60 * 1000;

export function bossDiarioDisponible(
  ultimaVictoria: Date | string | null | undefined,
  ahora: Date = new Date(),
): boolean {
  if (ultimaVictoria == null) return true;
  const fecha = ultimaVictoria instanceof Date ? ultimaVictoria : new Date(ultimaVictoria);
  return Number.isFinite(fecha.getTime()) &&
    ahora.getTime() - fecha.getTime() >= ESPERA_BOSS_DIARIO_MS;
}
