import type { Prisma } from "@prisma/client";
import type { tirarBotinEnemigo } from "@/lib/equipamiento/botin";
import { hayHuecoInventario } from "@/lib/equipamiento/inventario";

export type DependenciasInventarioRecompensaParty = {
  existeObjeto: (objetoId: string) => boolean;
  limiteInventario: number;
};

/** Entrega objetos usando exactamente la transacción de liquidación de la party. */
export async function agregarObjetoAlInventario(
  tx: Prisma.TransactionClient,
  personajeId: string,
  objetoId: string,
  cantidad: number,
  dependencias: DependenciasInventarioRecompensaParty,
): Promise<boolean> {
  if (cantidad <= 0 || !Number.isInteger(cantidad) || !dependencias.existeObjeto(objetoId)) return false;
  const inventarioExistente = await tx.inventario.findUnique({
    where: { personajeId },
    select: { id: true },
  });
  const inventario = inventarioExistente ?? await tx.inventario.create({
    data: { personajeId },
    select: { id: true },
  });
  const stack = await tx.inventarioObjeto.findFirst({
    where: { inventarioId: inventario.id, objetoId },
    select: { id: true, cantidad: true },
    orderBy: { id: "asc" },
  });
  if (stack) {
    await tx.inventarioObjeto.update({
      where: { id: stack.id },
      data: { cantidad: { increment: cantidad } },
    });
    return true;
  }
  const ocupados = await tx.inventarioObjeto.count({ where: { inventarioId: inventario.id } });
  if (!hayHuecoInventario(ocupados, dependencias.limiteInventario)) return false;
  await tx.inventarioObjeto.create({
    data: {
      inventarioId: inventario.id,
      objetoId,
      cantidad,
      nivelMejora: 0,
      sufijoId: null,
      bonificaciones: {},
    },
  });
  return true;
}

export async function agregarInstanciaBotinAlInventario(
  tx: Prisma.TransactionClient,
  personajeId: string,
  botin: NonNullable<ReturnType<typeof tirarBotinEnemigo>>,
  dependencias: DependenciasInventarioRecompensaParty,
): Promise<boolean> {
  const inventarioExistente = await tx.inventario.findUnique({
    where: { personajeId },
    select: { id: true },
  });
  const inventario = inventarioExistente ?? await tx.inventario.create({
    data: { personajeId },
    select: { id: true },
  });
  const ocupados = await tx.inventarioObjeto.count({ where: { inventarioId: inventario.id } });
  if (!hayHuecoInventario(ocupados, dependencias.limiteInventario)) return false;
  await tx.inventarioObjeto.create({
    data: {
      inventarioId: inventario.id,
      objetoId: botin.objeto.id,
      cantidad: 1,
      nivelMejora: 0,
      sufijoId: botin.sufijoId,
      bonificaciones: botin.bonificaciones as unknown as Prisma.InputJsonValue,
    },
  });
  return true;
}
