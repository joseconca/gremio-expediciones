import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  evaluarDesbloqueoClase,
  obtenerDefinicionClase,
} from "@/lib/progresion/clases";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    let bodyValue: unknown;
    try {
      bodyValue = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la petición no contiene JSON válido." },
        { status: 400 }
      );
    }

    if (!bodyValue || typeof bodyValue !== "object" || Array.isArray(bodyValue)) {
      return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
    }

    const claseId =
      typeof (bodyValue as Record<string, unknown>).claseId === "string"
        ? ((bodyValue as Record<string, unknown>).claseId as string).trim()
        : "";
    const definicion = obtenerDefinicionClase(claseId);

    if (!definicion) {
      return NextResponse.json({ error: "La profesión indicada no existe." }, { status: 404 });
    }

    const progresoCreado = await prisma.$transaction(async (tx) => {
      const personaje = await tx.personaje.findUnique({
        where: { usuarioId: usuarioSesion.id },
        select: {
          id: true,
          progresosClase: {
            select: {
              claseId: true,
              nivelJob: true,
              desbloqueada: true,
            },
          },
        },
      });

      if (!personaje) throw new Error("PERSONAJE_NO_ENCONTRADO");

      const resultado = evaluarDesbloqueoClase(claseId, personaje.progresosClase);
      if (resultado.yaDesbloqueada) throw new Error("CLASE_YA_DESBLOQUEADA");
      if (!resultado.puedeDesbloquear) throw new Error("REQUISITOS_CLASE_PENDIENTES");

      return tx.progresoClase.create({
        data: {
          personajeId: personaje.id,
          claseId,
          nivelJob: 1,
          experienciaJob: 0,
          puntosHabilidadDisponibles: 0,
          desbloqueada: true,
          maestriaCompletada: false,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true,
      progreso: progresoCreado,
      profesion: definicion,
      mensaje: `Has desbloqueado la profesión ${definicion.nombre}.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "PERSONAJE_NO_ENCONTRADO":
          return NextResponse.json({ error: "Necesitas un personaje." }, { status: 400 });
        case "CLASE_YA_DESBLOQUEADA":
          return NextResponse.json({ error: "Ya has desbloqueado esa profesión." }, { status: 409 });
        case "REQUISITOS_CLASE_PENDIENTES":
          return NextResponse.json({ error: "Todavía no cumples los requisitos de esa profesión." }, { status: 409 });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    ) {
      return NextResponse.json(
        { error: "La profesión ya se ha desbloqueado o hay un cambio simultáneo. Actualiza la lista e inténtalo de nuevo." },
        { status: 409 }
      );
    }

    console.error("Error al desbloquear profesión:", error);
    return NextResponse.json({ error: "No se pudo desbloquear la profesión." }, { status: 500 });
  }
}
