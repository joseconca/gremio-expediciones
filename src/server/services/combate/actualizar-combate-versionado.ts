import type { Prisma } from "@prisma/client";

/**
 * Compare-and-swap del combate. La versión se comprueba y aumenta en la misma
 * escritura SQL, por lo que dos peticiones basadas en el mismo turno no pueden
 * confirmar ambas la acción.
 */
export async function actualizarCombateVersionado(
  tx: Prisma.TransactionClient,
  id: string,
  version: number,
  data: Prisma.CombateActivoUpdateManyMutationInput,
) {
  const actualizado = await tx.combateActivo.updateMany({
    where: { id, version, fase: "activo" },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });
  if (actualizado.count !== 1) {
    throw new Error("COMBATE_MODIFICADO");
  }
  return tx.combateActivo.findUniqueOrThrow({ where: { id } });
}
