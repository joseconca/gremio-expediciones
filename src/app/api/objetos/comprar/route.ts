import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerNombreObjetoConSufijo } from "@/lib/sufijosObjetos";
import { LIMITE_INVENTARIO_OBJETOS } from "@/lib/inventario";
import {
  puedeComprarObjeto,
  obtenerRequisitosRareza,
} from "@/lib/tiendaObjetos";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
    }

    const objetoId = (body as Record<string, unknown>).objetoId;
    if (typeof objetoId !== "string" || objetoId.trim() === "") {
      return NextResponse.json(
        { error: "Debes indicar un objeto." },
        { status: 400 }
      );
    }

    const objeto = obtenerObjetoPorId(objetoId);
    if (!objeto) {
      return NextResponse.json({ error: "Objeto no encontrado." }, { status: 404 });
    }

    if (objeto.tipo !== "arma" && objeto.tipo !== "armadura" && objeto.tipo !== "accesorio") {
      return NextResponse.json(
        { error: "Este objeto no se vende en la Armería." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: {
          include: {
            inventario: { include: { objetos: true } },
          },
        },
      },
    });

    if (!usuario || !usuario.personaje) {
      return NextResponse.json({ error: "No se encontró el personaje." }, { status: 404 });
    }

    const edificios =
      usuario.edificios &&
      typeof usuario.edificios === "object" &&
      !Array.isArray(usuario.edificios)
        ? (usuario.edificios as Record<string, unknown>)
        : {};

    const nivelArmeria =
      typeof edificios.armeria === "number" ? edificios.armeria : 0;
    const nivelHeroe = usuario.personaje.nivel;

    if (nivelArmeria <= 0) {
      return NextResponse.json(
        { error: "No tienes una Armería construida." },
        { status: 403 }
      );
    }

    const requisitos = obtenerRequisitosRareza(objeto.rareza);
    if (nivelArmeria < requisitos.nivelArmeria) {
      return NextResponse.json(
        { error: "Tu Armería todavía no puede vender este objeto." },
        { status: 400 }
      );
    }

    if (nivelHeroe < requisitos.nivelHeroe) {
      return NextResponse.json(
        { error: `Necesitas nivel ${requisitos.nivelHeroe} de héroe para comprar este objeto.` },
        { status: 400 }
      );
    }

    if (!puedeComprarObjeto(objeto, nivelArmeria, nivelHeroe)) {
      return NextResponse.json(
        { error: "No cumples los requisitos para comprar este objeto." },
        { status: 400 }
      );
    }

    const inventarioId = usuario.personaje.inventario?.id;
    if (!inventarioId) {
      return NextResponse.json(
        { error: "El personaje no tiene inventario." },
        { status: 409 }
      );
    }

    if (usuario.oro < objeto.precio) {
      return NextResponse.json({ error: "No tienes suficiente oro." }, { status: 400 });
    }

    // La tienda vende la definición normal. Los sufijos se generan al obtener botín,
    // no al comprar copias, para evitar rerollear sufijos pagando oro.
    const resultado = await prisma.$transaction(async (tx) => {
      const espaciosOcupados = await tx.inventarioObjeto.count({
        where: { inventarioId },
      });
      if (espaciosOcupados >= LIMITE_INVENTARIO_OBJETOS) {
        throw new Error("INVENTARIO_LLENO");
      }

      // El saldo se vuelve a comprobar dentro de la transacción. Si falla
      // la creación, el débito se revierte junto con el resto de la operación.
      const debitado = await tx.usuario.updateMany({
        where: {
          id: usuario.id,
          oro: { gte: objeto.precio },
        },
        data: {
          oro: { decrement: objeto.precio },
        },
      });

      if (debitado.count !== 1) {
        throw new Error("ORO_INSUFICIENTE");
      }

      const objetoInventario = await tx.inventarioObjeto.create({
        data: {
          inventarioId,
          objetoId,
          cantidad: 1,
          nivelMejora: 0,
          sufijoId: null,
          bonificaciones: {},
        },
      });

      const usuarioActualizado = await tx.usuario.findUniqueOrThrow({
        where: { id: usuario.id },
        select: { oro: true },
      });

      return {
        usuario: usuarioActualizado,
        objetoInventario,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true,
      mensaje: `Has comprado ${obtenerNombreObjetoConSufijo(objeto.nombre, null)}.`,
      oro: resultado.usuario.oro,
      objeto: {
        id: resultado.objetoInventario.id,
        objetoId: resultado.objetoInventario.objetoId,
        cantidad: resultado.objetoInventario.cantidad,
        nivelMejora: resultado.objetoInventario.nivelMejora,
        sufijoId: resultado.objetoInventario.sufijoId,
        bonificaciones: resultado.objetoInventario.bonificaciones,
        datos: { ...objeto, nombre: obtenerNombreObjetoConSufijo(objeto.nombre, null) },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVENTARIO_LLENO") {
      return NextResponse.json(
        { error: `El inventario está lleno (${LIMITE_INVENTARIO_OBJETOS}/${LIMITE_INVENTARIO_OBJETOS}). Vende algún objeto antes de comprar.` },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "ORO_INSUFICIENTE") {
      return NextResponse.json(
        { error: "No tienes suficiente oro." },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "La compra ha cambiado durante la operación. Actualiza el inventario e inténtalo de nuevo." },
        { status: 409 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "El inventario o el saldo han cambiado. Actualiza e inténtalo de nuevo." },
        { status: 409 }
      );
    }

    console.error("Error al comprar objeto:", error);

    return NextResponse.json(
      { error: "No se pudo comprar el objeto." },
      { status: 500 }
    );
  }
}
