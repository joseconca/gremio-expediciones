import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TipoEquipamiento = "arma" | "armadura" | "accesorio";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401 }
      );
    }

    let bodyJson: unknown;

    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la petición no contiene JSON válido." },
        { status: 400 }
      );
    }

    if (!bodyJson || typeof bodyJson !== "object" || Array.isArray(bodyJson)) {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const body = bodyJson as Record<string, unknown>;

    if (
      body.tipo !== "arma" &&
      body.tipo !== "armadura" &&
      body.tipo !== "accesorio"
    ) {
      return NextResponse.json(
        { error: "Tipo de equipamiento no válido." },
        { status: 400 }
      );
    }

    const tipo = body.tipo as TipoEquipamiento;

    const personaje = await prisma.personaje.findUnique({
      where: {
        usuarioId: usuarioSesion.id,
      },
      include: {
        equipoEquipado: true,
      },
    });

    if (!personaje) {
      return NextResponse.json(
        { error: "No se encontró el personaje." },
        { status: 404 }
      );
    }

    if (!personaje.equipoEquipado) {
      return NextResponse.json(
        { error: "No existe un equipo equipado para este personaje." },
        { status: 409 }
      );
    }

    const equipo = await prisma.equipoEquipado.update({
      where: {
        personajeId: personaje.id,
      },
      data:
        tipo === "arma"
          ? { armaInventarioId: null }
          : tipo === "armadura"
            ? { armaduraInventarioId: null }
            : { accesorioInventarioId: null },
    });

    return NextResponse.json({
      exito: true,
      mensaje: "Objeto desequipado correctamente.",
      equipo,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "El equipo ha cambiado durante la operación. Actualiza el inventario e inténtalo de nuevo." },
        { status: 409 }
      );
    }

    console.error("Error al desequipar objeto:", error);

    return NextResponse.json(
      { error: "No se pudo desequipar el objeto." },
      { status: 500 }
    );
  }
}