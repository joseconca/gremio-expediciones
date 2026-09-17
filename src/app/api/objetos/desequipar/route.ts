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

    const body = await request.json();

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
    console.error("Error al desequipar objeto:", error);

    return NextResponse.json(
      { error: "No se pudo desequipar el objeto." },
      { status: 500 }
    );
  }
}