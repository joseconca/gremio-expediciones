import type { RecompensaMision } from "@/lib/tiposJuego";

type RecursosAlmacen = Pick<RecompensaMision, "madera" | "piedra" | "metal">;

/**
 * Los premios de regreso se liquidan en unidades enteras. No sustituir por
 * el lector histórico del combate: ese conserva cantidades decimales.
 */
export function leerRecompensaRegreso(valor: unknown): RecompensaMision {
  if (
    typeof valor === "object" &&
    valor !== null &&
    "oro" in valor &&
    "madera" in valor &&
    "piedra" in valor &&
    "metal" in valor &&
    typeof valor.oro === "number" &&
    typeof valor.madera === "number" &&
    typeof valor.piedra === "number" &&
    typeof valor.metal === "number"
  ) {
    return {
      oro: Math.max(0, Math.trunc(valor.oro)),
      madera: Math.max(0, Math.trunc(valor.madera)),
      piedra: Math.max(0, Math.trunc(valor.piedra)),
      metal: Math.max(0, Math.trunc(valor.metal)),
    };
  }

  return { oro: 0, madera: 0, piedra: 0, metal: 0 };
}

/**
 * Cada recurso se limita por separado según su cantidad actual y el mismo
 * máximo del almacén. El oro se conserva íntegro, sin límite de almacén.
 * No consulta ni modifica base de datos.
 */
export function calcularRecompensaAlmacen(
  recompensa: RecompensaMision,
  recursosActuales: RecursosAlmacen,
  capacidadAlmacen: number,
): {
  recompensaRecibida: RecompensaMision;
  recursosPerdidos: RecursosAlmacen;
} {
  const maderaRecibida = Math.max(
    0,
    Math.min(recompensa.madera, Math.max(0, capacidadAlmacen - recursosActuales.madera))
  );
  const piedraRecibida = Math.max(
    0,
    Math.min(recompensa.piedra, Math.max(0, capacidadAlmacen - recursosActuales.piedra))
  );
  const metalRecibido = Math.max(
    0,
    Math.min(recompensa.metal, Math.max(0, capacidadAlmacen - recursosActuales.metal))
  );

  return {
    recompensaRecibida: {
      oro: recompensa.oro,
      madera: maderaRecibida,
      piedra: piedraRecibida,
      metal: metalRecibido,
    },
    recursosPerdidos: {
      madera: recompensa.madera - maderaRecibida,
      piedra: recompensa.piedra - piedraRecibida,
      metal: recompensa.metal - metalRecibido,
    },
  };
}
