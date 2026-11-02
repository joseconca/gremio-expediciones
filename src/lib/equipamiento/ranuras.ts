import type { EquipoPersonaje } from "@/lib/tiposJuego";

/**
 * Identificadores de instancias equipadas en cualquiera de las ranuras.
 * Una misma instancia solo aparece una vez, incluso si ocupa ambas manos.
 * No consulta Prisma ni modifica el equipo.
 */
export function obtenerIdsObjetosEquipados(
  equipo: EquipoPersonaje | null | undefined,
): Set<string> {
  return new Set(
    Object.values(equipo ?? {})
      .map((instancia) => instancia?.id)
      .filter((id): id is string => typeof id === "string"),
  );
}
