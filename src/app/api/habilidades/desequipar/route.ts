import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { obtenerHabilidadPorId } from "@/lib/habilidades";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
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
    const habilidadId = typeof body.habilidadId === "string" ? body.habilidadId.trim() : body.habilidadId;

    if (typeof habilidadId !== "string" || habilidadId.trim() === "") {
      return NextResponse.json(
        { error: "La habilidad indicada no es válida." },
        { status: 400 }
      );
    }

    const habilidad = obtenerHabilidadPorId(habilidadId);

    if (!habilidad) {
      return NextResponse.json(
        { error: "La habilidad no existe." },
        { status: 404 }
      );
    }

    const personaje = await prisma.personaje.findUnique({
      where: {
        usuarioId: usuarioSesion.id,
      },
      select: {
        id: true,
      },
    });

    if (!personaje) {
      return NextResponse.json(
        { error: "No se encontró el personaje." },
        { status: 404 }
      );
    }

    const actualizada = await prisma.habilidadAprendida.updateMany({
      where: {
        personajeId: personaje.id,
        habilidadId,
      },
      data: {
        slot: null,
      },
    });

    if (actualizada.count === 0) {
      return NextResponse.json(
        { error: "No has aprendido esta habilidad." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exito: true,
      habilidadId,
      slot: null,
      mensaje: `${habilidad.nombre} ha sido desequipada.`,
    });
  } catch (error) {
    console.error("Error al desequipar habilidad:", error);

    return NextResponse.json(
      { error: "No se pudo desequipar la habilidad." },
      { status: 500 }
    );
  }
}
