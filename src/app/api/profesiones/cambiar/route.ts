import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  obtenerDefinicionClase,
  puedeUsarHabilidadDeClase,
} from "@/lib/progresion/clases";
import { obtenerHabilidadPorId } from "@/lib/habilidades";

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

    const resultado = await prisma.$transaction(async (tx) => {
      const personaje = await tx.personaje.findUnique({
        where: { usuarioId: usuarioSesion.id },
        select: {
          id: true,
          clase: true,
          profesionActivaId: true,
          progresosClase: {
            select: { claseId: true, desbloqueada: true },
          },
          habilidades: {
            select: { id: true, habilidadId: true, slot: true },
          },
        },
      });

      if (!personaje) throw new Error("PERSONAJE_NO_ENCONTRADO");

      if (!personaje.progresosClase.some(
        (progreso) => progreso.claseId === claseId && progreso.desbloqueada
      )) {
        throw new Error("CLASE_NO_DESBLOQUEADA");
      }

      const expedicionActiva = await tx.expedicionActiva.findUnique({
        where: { usuarioId: usuarioSesion.id },
        select: { id: true },
      });
      if (expedicionActiva) throw new Error("EXPEDICION_ACTIVA");

      const idsHabilidadesADesequipar = personaje.habilidades
        .filter((aprendida) => {
          if (!aprendida.slot) return false;
          const habilidad = obtenerHabilidadPorId(aprendida.habilidadId);
          return habilidad
            ? !puedeUsarHabilidadDeClase(claseId, habilidad.claseId)
            : true;
        })
        .map((aprendida) => aprendida.id);

      if (idsHabilidadesADesequipar.length > 0) {
        await tx.habilidadAprendida.updateMany({
          where: { id: { in: idsHabilidadesADesequipar } },
          data: { slot: null },
        });
      }

      const personajeActualizado = await tx.personaje.update({
        where: { id: personaje.id },
        data: {
          profesionActivaId: claseId,
          // Se conserva el campo legado hasta que se retiren los cálculos antiguos por clase.
          clase: "Novato",
        },
        select: {
          id: true,
          profesionActivaId: true,
          nivel: true,
          experiencia: true,
        },
      });

      return {
        personaje: personajeActualizado,
        habilidadesDesequipadas: idsHabilidadesADesequipar.length,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true,
      ...resultado,
      profesion: definicion,
      mensaje: `Ahora eres ${definicion.nombre}.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "PERSONAJE_NO_ENCONTRADO":
          return NextResponse.json({ error: "Necesitas un personaje." }, { status: 400 });
        case "CLASE_NO_DESBLOQUEADA":
          return NextResponse.json({ error: "Primero debes desbloquear esa profesión." }, { status: 403 });
        case "EXPEDICION_ACTIVA":
          return NextResponse.json({ error: "No puedes cambiar de profesión durante una expedición." }, { status: 409 });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2025", "P2034"].includes(error.code)
    ) {
      return NextResponse.json(
        { error: "El personaje ha cambiado durante la operación. Actualiza e inténtalo de nuevo." },
        { status: 409 }
      );
    }

    console.error("Error al cambiar de profesión:", error);
    return NextResponse.json({ error: "No se pudo cambiar de profesión." }, { status: 500 });
  }
}
