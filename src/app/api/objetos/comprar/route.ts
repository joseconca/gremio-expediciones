import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
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

    if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") {
      return NextResponse.json(
        { error: "Este objeto no puede comprarse en la Herrería." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: {
          include: {
            inventario: true,
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

    const objetoExistente = await prisma.inventarioObjeto.findUnique({
      where: {
        inventarioId_objetoId: {
          inventarioId,
          objetoId,
        },
      },
      select: { id: true },
    });

    if (objetoExistente) {
      return NextResponse.json({ error: "Ya tienes este objeto." }, { status: 409 });
    }

    if (usuario.oro < objeto.precio) {
      return NextResponse.json({ error: "No tienes suficiente oro." }, { status: 400 });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // El saldo se vuelve a comprobar dentro de la transacción. Si la creación
      // del inventario falla por una compra concurrente, el débito se revierte.
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
    });

    return NextResponse.json({
      exito: true,
      mensaje: `Has comprado ${objeto.nombre}.`,
      oro: resultado.usuario.oro,
      objeto: {
        id: resultado.objetoInventario.id,
        objetoId: resultado.objetoInventario.objetoId,
        cantidad: resultado.objetoInventario.cantidad,
        nivelMejora: resultado.objetoInventario.nivelMejora,
        datos: objeto,
      },
    });
  } catch (error) {
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
        { error: "Ya tienes este objeto; actualiza el inventario." },
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
