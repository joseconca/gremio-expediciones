import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId, calcularCosteMejoraObjeto } from "@/lib/objetos";


export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      typeof body.objetoInventarioId !== "string" ||
      body.objetoInventarioId.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Debes indicar el objeto que quieres mejorar." },
        { status: 400 }
      );
    }

    const objetoInventarioId = body.objetoInventarioId;

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },
      include: {
        personaje: {
          include: {
            inventario: true,
            equipoEquipado: true,
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

    const personaje = usuario.personaje;

    const edificios =
      usuario.edificios &&
      typeof usuario.edificios === "object" &&
      !Array.isArray(usuario.edificios)
        ? (usuario.edificios as Record<string, unknown>)
        : {};

    const nivelHerrería =
      typeof edificios.herreria === "number"
        ? edificios.herreria
        : 0;

    if (nivelHerrería <= 0) {
      return NextResponse.json(
        { error: "No tienes la Herrería construida." },
        { status: 403 }
      );
    }

    if (!personaje.inventario) {
      return NextResponse.json(
        { error: "El personaje no tiene inventario." },
        { status: 409 }
      );
    }

    if (!personaje.equipoEquipado) {
      return NextResponse.json(
        { error: "No existe un equipo equipado para este personaje." },
        { status: 409 }
      );
    }

    const objetoInventario = await prisma.inventarioObjeto.findFirst({
      where: {
        id: objetoInventarioId,
        inventarioId: personaje.inventario.id,
      },
    });

    if (!objetoInventario) {
      return NextResponse.json(
        { error: "El objeto no pertenece a tu inventario." },
        { status: 403 }
      );
    }

    const objeto = obtenerObjetoPorId(objetoInventario.objetoId);

    if (!objeto) {
      return NextResponse.json(
        { error: "No se encontró la definición del objeto." },
        { status: 404 }
      );
    }

    if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") {
      return NextResponse.json(
        { error: "Este objeto no puede mejorarse en la Herrería." },
        { status: 400 }
      );
    }

    const objetoEstaEquipado =
      objetoInventario.id === personaje.equipoEquipado.armaInventarioId ||
      objetoInventario.id === personaje.equipoEquipado.armaduraInventarioId;

    if (!objetoEstaEquipado) {
      return NextResponse.json(
        { error: "Solo puedes mejorar un objeto que esté equipado." },
        { status: 400 }
      );
    }

    const nivelMaximo = nivelHerrería * 3;

    if (objetoInventario.nivelMejora >= nivelMaximo) {
      return NextResponse.json(
        {
          error: `Este objeto ya tiene el nivel máximo de mejora para tu Herrería (+${nivelMaximo}).`,
        },
        { status: 400 }
      );
    }

    const coste = calcularCosteMejoraObjeto(
      objeto.precio,
      objetoInventario.nivelMejora
    );

    if (usuario.oro < coste) {
      return NextResponse.json(
        {
          error: `No tienes suficiente oro. Necesitas ${coste} 🪙.`,
        },
        { status: 400 }
      );
    }

    const nivelAnterior = objetoInventario.nivelMejora;
    const nivelNuevo = nivelAnterior + 1;

    const resultado = await prisma.$transaction(async (tx) => {
      const usuarioActualizado = await tx.usuario.updateMany({
        where: {
          id: usuario.id,
          oro: {
            gte: coste,
          },
        },
        data: {
          oro: {
            decrement: coste,
          },
        },
      });

      if (usuarioActualizado.count !== 1) {
        throw new Error("ORO_INSUFICIENTE");
      }

      const objetoActualizado = await tx.inventarioObjeto.updateMany({
        where: {
          id: objetoInventario.id,
          inventarioId: personaje.inventario!.id,
          nivelMejora: nivelAnterior,
        },
        data: {
          nivelMejora: nivelNuevo,
        },
      });

      if (objetoActualizado.count !== 1) {
        throw new Error("OBJETO_MODIFICADO");
      }

      const usuarioFinal = await tx.usuario.findUniqueOrThrow({
        where: {
          id: usuario.id,
        },
        select: {
          oro: true,
        },
      });

      return usuarioFinal;
    });

    return NextResponse.json({
      exito: true,
      mensaje: `Has mejorado ${objeto.nombre} a +${nivelNuevo}.`,
      oro: resultado.oro,
      nivelMejora: nivelNuevo,
      coste,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORO_INSUFICIENTE") {
      return NextResponse.json(
        { error: "No tienes suficiente oro." },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "OBJETO_MODIFICADO") {
      return NextResponse.json(
        {
          error:
            "El objeto ha cambiado mientras se procesaba la mejora. Actualiza el inventario e inténtalo de nuevo.",
        },
        { status: 409 }
      );
    }

    console.error("Error al mejorar objeto:", error);

    return NextResponse.json(
      { error: "No se pudo mejorar el objeto." },
      { status: 500 }
    );
  }
}