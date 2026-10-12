import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerNombreObjetoConSufijo, sanitizarBonificacionesObjeto } from "@/lib/sufijosObjetos";

const CAMPOS_EQUIPO = [
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

export async function POST(request: Request) {
  try {
    const sesion = await getAuthenticatedUser();
    if (!sesion) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "La petición no es válida." }, { status: 400 });
    }
    const id = (body as Record<string, unknown>).objetoInventarioId;
    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "Debes indicar el objeto que quieres vender." }, { status: 400 });
    }

    const personaje = await prisma.personaje.findUnique({
      where: { usuarioId: sesion.id },
      include: { inventario: true },
    });
    if (!personaje) return NextResponse.json({ error: "No se encontró el personaje." }, { status: 404 });
    if (!personaje.inventario) return NextResponse.json({ error: "El personaje no tiene inventario." }, { status: 409 });

    const item = await prisma.inventarioObjeto.findFirst({
      where: { id: id.trim(), inventarioId: personaje.inventario.id },
    });
    if (!item) return NextResponse.json({ error: "El objeto no pertenece a tu inventario." }, { status: 403 });
    const objeto = obtenerObjetoPorId(item.objetoId);
    if (!objeto) return NextResponse.json({ error: "La definición de este objeto ya no existe." }, { status: 409 });

    const resultado = await prisma.$transaction(async (tx) => {
      const equipo = await tx.equipoEquipado.findUnique({
        where: { personajeId: personaje.id },
      });
      if (equipo && CAMPOS_EQUIPO.some((campo) => equipo[campo] === item.id)) {
        throw new Error("OBJETO_EQUIPADO");
      }

      // Relee la instancia en la transacción para no vender con datos obsoletos
      // si una mejora u otra acción se produjo después de la lectura inicial.
      const existente = await tx.inventarioObjeto.findFirst({
        where: { id: item.id, inventarioId: personaje.inventario!.id },
      });
      if (!existente) throw new Error("OBJETO_NO_EXISTE");

      const definicionActual = obtenerObjetoPorId(existente.objetoId);
      if (!definicionActual) throw new Error("DEFINICION_NO_EXISTE");
      const cantidad = Math.max(1, existente.cantidad);
      const precioVenta = Math.max(1, Math.floor(definicionActual.precio * cantidad * 0.35));
      const precioRecompra = Math.max(
        precioVenta + 1,
        Math.ceil(definicionActual.precio * cantidad * 0.7)
      );
      const sufijoId = existente.sufijoId ?? null;
      const snapshot = {
        objetoId: existente.objetoId,
        cantidad: existente.cantidad,
        nivelMejora: existente.nivelMejora,
        sufijoId,
        bonificaciones: sanitizarBonificacionesObjeto(existente.bonificaciones),
        precioVenta,
        precioRecompra,
        nombreObjeto: obtenerNombreObjetoConSufijo(definicionActual.nombre, sufijoId),
        vendidoEn: new Date().toISOString(),
      };

      const borrado = await tx.inventarioObjeto.deleteMany({
        where: { id: existente.id, inventarioId: personaje.inventario!.id },
      });
      if (borrado.count !== 1) throw new Error("OBJETO_MODIFICADO");

      await tx.usuario.update({
        where: { id: sesion.id },
        data: { oro: { increment: precioVenta } },
      });
      await tx.inventario.update({
        where: { id: personaje.inventario!.id },
        data: { ultimaVenta: snapshot as Prisma.InputJsonValue },
      });
      return { snapshot, precioVenta, precioRecompra };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true,
      mensaje: `Has vendido ${resultado.snapshot.nombreObjeto} por ${resultado.precioVenta} de oro.`,
      oroRecibido: resultado.precioVenta,
      precioRecompra: resultado.precioRecompra,
      ultimaVenta: resultado.snapshot,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "OBJETO_EQUIPADO") {
      return NextResponse.json({ error: "No puedes vender un objeto equipado. Desequípalo primero." }, { status: 409 });
    }
    if (error instanceof Error && (error.message === "OBJETO_NO_EXISTE" || error.message === "OBJETO_MODIFICADO")) {
      return NextResponse.json({ error: "El objeto ha cambiado. Actualiza el inventario e inténtalo de nuevo." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "DEFINICION_NO_EXISTE") {
      return NextResponse.json({ error: "La definición de este objeto ya no existe." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "El inventario ha cambiado. Actualízalo e inténtalo de nuevo." }, { status: 409 });
    }
    console.error("Error al vender objeto:", error);
    return NextResponse.json({ error: "No se pudo vender el objeto." }, { status: 500 });
  }
}
