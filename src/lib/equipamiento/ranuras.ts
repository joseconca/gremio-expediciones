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

/**
 * Campos de relación de las instancias equipadas, tal y como los guarda Prisma.
 * No confundir con el EquipoPersonaje ya expandido para la interfaz.
 */
export const CAMPOS_EQUIPO_PERSISTIDO = [
  "armaInventarioId",
  "manoSecundariaInventarioId",
  "cascoInventarioId",
  "armaduraInventarioId",
  "pantalonesInventarioId",
  "botasInventarioId",
  "guantesInventarioId",
  "accesorioInventarioId",
  "anillo1InventarioId",
  "anillo2InventarioId",
] as const;

type CampoEquipoPersistido = (typeof CAMPOS_EQUIPO_PERSISTIDO)[number];

/** Comprueba la misma instancia en todas las ranuras del modelo persistido. */
export function estaInstanciaEquipadaPersistida(
  equipo: Partial<Record<CampoEquipoPersistido, string | null>> | null | undefined,
  instanciaId: string,
): boolean {
  return equipo != null && CAMPOS_EQUIPO_PERSISTIDO.some((campo) => equipo[campo] === instanciaId);
}
