import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerNombreObjetoConSufijo, sanitizarBonificacionesObjeto } from "@/lib/sufijosObjetos";
import { LIMITE_INVENTARIO_OBJETOS } from "@/lib/inventario";

interface VentaGuardada {
  objetoId: string;
  cantidad: number;
  nivelMejora: number;
  sufijoId: string | null;
  bonificaciones: Record<string, number>;
  precioVenta: number;
  precioRecompra: number;
  nombreObjeto: string;
  vendidoEn: string;
}

function leerUltimaVenta(value: unknown): VentaGuardada | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.objetoId !== "string" ||
      typeof v.precioRecompra !== "number" || !Number.isFinite(v.precioRecompra) ||
      typeof v.cantidad !== "number" || typeof v.nivelMejora !== "number") return null;
  return {
    objetoId: v.objetoId,
    cantidad: Math.max(1, Math.trunc(v.cantidad)),
    nivelMejora: Math.max(0, Math.trunc(v.nivelMejora)),
    sufijoId: typeof v.sufijoId === "string" ? v.sufijoId : null,
    bonificaciones: sanitizarBonificacionesObjeto(v.bonificaciones),
    precioVenta: typeof v.precioVenta === "number" ? v.precioVenta : 0,
    precioRecompra: Math.max(1, Math.trunc(v.precioRecompra)),
    nombreObjeto: typeof v.nombreObjeto === "string" ? v.nombreObjeto : v.objetoId,
    vendidoEn: typeof v.vendidoEn === "string" ? v.vendidoEn : "",
  };
}

export async function POST() {
  try {
    const sesion = await getAuthenticatedUser();
    if (!sesion) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

    const personaje = await prisma.personaje.findUnique({
      where: { usuarioId: sesion.id },
      include: { inventario: { include: { objetos: true } } },
    });
    if (!personaje) return NextResponse.json({ error: "No se encontró el personaje." }, { status: 404 });
    if (!personaje.inventario) return NextResponse.json({ error: "El personaje no tiene inventario." }, { status: 409 });

    const venta = leerUltimaVenta(personaje.inventario.ultimaVenta);
    if (!venta) return NextResponse.json({ error: "No tienes ningún objeto disponible para recomprar." }, { status: 404 });
    const objeto = obtenerObjetoPorId(venta.objetoId);
    if (!objeto) return NextResponse.json({ error: "La definición del objeto ya no existe." }, { status: 409 });

    const resultado = await prisma.$transaction(async (tx) => {
      // La última venta se vuelve a leer dentro de la transacción. Esto evita
      // que dos peticiones concurrentes recompren el mismo recibo dos veces.
      const inventarioActual = await tx.inventario.findUnique({
        where: { id: personaje.inventario!.id },
        select: { ultimaVenta: true },
      });
      const ventaActual = leerUltimaVenta(inventarioActual?.ultimaVenta);
      if (!ventaActual || ventaActual.vendidoEn !== venta.vendidoEn) {
        throw new Error("VENTA_MODIFICADA");
      }

      const ocupados = await tx.inventarioObjeto.count({
        where: { inventarioId: personaje.inventario!.id },
      });
      if (ocupados >= LIMITE_INVENTARIO_OBJETOS) throw new Error("INVENTARIO_LLENO");

      const cobro = await tx.usuario.updateMany({
        where: { id: sesion.id, oro: { gte: ventaActual.precioRecompra } },
        data: { oro: { decrement: ventaActual.precioRecompra } },
      });
      if (cobro.count !== 1) throw new Error("ORO_INSUFICIENTE");

      const item = await tx.inventarioObjeto.create({
        data: {
          inventarioId: personaje.inventario!.id,
          objetoId: ventaActual.objetoId,
          cantidad: ventaActual.cantidad,
          nivelMejora: ventaActual.nivelMejora,
          sufijoId: ventaActual.sufijoId,
          bonificaciones: ventaActual.bonificaciones,
        },
      });

      await tx.inventario.update({
        where: { id: personaje.inventario!.id },
        data: { ultimaVenta: Prisma.DbNull },
      });
      const usuario = await tx.usuario.findUniqueOrThrow({
        where: { id: sesion.id },
        select: { oro: true },
      });
      return { item, oro: usuario.oro };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true,
      mensaje: `Has recomprado ${obtenerNombreObjetoConSufijo(objeto.nombre, venta.sufijoId)} por ${venta.precioRecompra} de oro.`,
      oro: resultado.oro,
      precioRecompra: venta.precioRecompra,
      objeto: {
        id: resultado.item.id,
        objetoId: resultado.item.objetoId,
        cantidad: resultado.item.cantidad,
        nivelMejora: resultado.item.nivelMejora,
        sufijoId: resultado.item.sufijoId,
        bonificaciones: resultado.item.bonificaciones,
        nombre: obtenerNombreObjetoConSufijo(objeto.nombre, venta.sufijoId),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVENTARIO_LLENO") {
      return NextResponse.json({ error: `El inventario está lleno (${LIMITE_INVENTARIO_OBJETOS}/${LIMITE_INVENTARIO_OBJETOS}). Libera un espacio antes de recomprar.` }, { status: 409 });
    }
    if (error instanceof Error && error.message === "VENTA_MODIFICADA") {
      return NextResponse.json({ error: "La última venta ya ha cambiado o se ha recomprado. Actualiza el inventario." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "ORO_INSUFICIENTE") {
      return NextResponse.json({ error: "No tienes oro suficiente para recomprar el objeto." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "La venta ha cambiado. Actualiza el inventario e inténtalo de nuevo." }, { status: 409 });
    }
    console.error("Error al recomprar objeto:", error);
    return NextResponse.json({ error: "No se pudo recomprar el objeto." }, { status: 500 });
  }
}
