import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerObjetosEnVenta } from "@/lib/tiendaObjetos";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body = await request.json();

    if (typeof body.objetoId !== "string" || body.objetoId.trim() === "") {
      return NextResponse.json(
        { error: "Debes indicar un objeto." },
        { status: 400 }
      );
    }

    const objetoId = body.objetoId;

    const objeto = obtenerObjetoPorId(objetoId);

    if (!objeto) {
      return NextResponse.json(
        { error: "Objeto no encontrado." },
        { status: 404 }
      );
    }

    if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") {
      return NextResponse.json(
        { error: "Este objeto no puede comprarse en la Herrería." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },
      include: {
        personaje: {
          include: {
            inventario: true,
          },
        },
      },
    });

    if (!usuario || !usuario.personaje) {
      return NextResponse.json(
        { error: "No se encontró el personaje." },
        { status: 404 }
      );
    }

    const edificios =
      usuario.edificios &&
      typeof usuario.edificios === "object" &&
      !Array.isArray(usuario.edificios)
        ? (usuario.edificios as Record<string, unknown>)
        : {};

    const nivelArmeria =
      typeof edificios.armeria === "number" ? edificios.armeria : 0;

    if (nivelArmeria <= 0) {
      return NextResponse.json(
        { error: "No tienes una Armería construida." },
        { status: 403 }
      );
    }

    const objetosDisponibles = obtenerObjetosEnVenta(nivelArmeria);

    const objetoDisponible = objetosDisponibles.some(
      (objetoDisponible) => objetoDisponible.id === objetoId
    );

    if (!objetoDisponible) {
      return NextResponse.json(
        {
          error: "Tu Armería todavía no puede vender este objeto.",
        },
        { status: 400 }
      );
    }

    if (!usuario.personaje.inventario) {
      return NextResponse.json(
        { error: "El personaje no tiene inventario." },
        { status: 409 }
      );
    }

    const objetoExistente = await prisma.inventarioObjeto.findUnique({
      where: {
        inventarioId_objetoId: {
          inventarioId: usuario.personaje.inventario.id,
          objetoId,
        },
      },
    });

    if (objetoExistente) {
      return NextResponse.json(
        { error: "Ya tienes este objeto." },
        { status: 409 }
      );
    }

    if (usuario.oro < objeto.precio) {
      return NextResponse.json(
        { error: "No tienes suficiente oro." },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const usuarioActualizado = await tx.usuario.update({
        where: {
          id: usuario.id,
        },
        data: {
          oro: {
            decrement: objeto.precio,
          },
        },
      });

      const objetoInventario = await tx.inventarioObjeto.create({
        data: {
          inventarioId: usuario.personaje!.inventario!.id,
          objetoId,
          cantidad: 1,
          nivelMejora: 0,
        },
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
    console.error("Error al comprar objeto:", error);

    return NextResponse.json(
      { error: "No se pudo comprar el objeto." },
      { status: 500 }
    );
  }
}
