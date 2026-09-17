import type { Prisma } from "@prisma/client";

export async function asegurarInventarioYEquipo(
  tx: Prisma.TransactionClient,
  personajeId: string
) {
  const inventario = await tx.inventario.upsert({
    where: {
      personajeId,
    },
    update: {},
    create: {
      personajeId,
    },
  });

  const equipoEquipado = await tx.equipoEquipado.upsert({
    where: {
      personajeId,
    },
    update: {},
    create: {
      personajeId,
    },
  });

  return {
    inventario,
    equipoEquipado,
  };
}