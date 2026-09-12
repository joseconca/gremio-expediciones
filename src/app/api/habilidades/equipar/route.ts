import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import type { SlotHabilidad } from "@/lib/tiposJuego";

const SLOTS_ACTIVAS: SlotHabilidad[] = ["activa_1", "activa_2", "activa_3"];

const SLOTS_PASIVAS: SlotHabilidad[] = ["pasiva_1", "pasiva_2"];

function esSlotHabilidad(valor: unknown): valor is SlotHabilidad {
  return (
    typeof valor === "string" &&
    [...SLOTS_ACTIVAS, ...SLOTS_PASIVAS].includes(valor as SlotHabilidad)
  );
}

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body = await request.json();

    const habilidadId = body.habilidadId;
    const slot = body.slot;

    if (typeof habilidadId !== "string" || habilidadId.trim() === "") {
      return NextResponse.json(
        { error: "La habilidad indicada no es válida." },
        { status: 400 }
      );
    }

    if (!esSlotHabilidad(slot)) {
      return NextResponse.json(
        { error: "El slot indicado no es válido." },
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

    const esActiva = SLOTS_ACTIVAS.includes(slot);
    const habilidadEsActiva = habilidad.tipo === "activa";

    if (esActiva !== habilidadEsActiva) {
      return NextResponse.json(
        {
          error: habilidadEsActiva
            ? "Las habilidades activas solo pueden equiparse en slots activos."
            : "Las habilidades pasivas solo pueden equiparse en slots pasivos.",
        },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const personaje = await tx.personaje.findUnique({
        where: {
          usuarioId: usuarioSesion.id,
        },
        select: {
          id: true,
          habilidades: {
            where: {
              habilidadId,
            },
            select: {
              id: true,
              habilidadId: true,
              slot: true,
            },
          },
        },
      });

      if (!personaje) {
        throw new Error("PERSONAJE_NO_ENCONTRADO");
      }

      const habilidadAprendida = personaje.habilidades[0];

      if (!habilidadAprendida) {
        throw new Error("HABILIDAD_NO_APRENDIDA");
      }

      /*
       * Liberamos primero el slot.
       *
       * Así podemos sustituir directamente una habilidad que ya
       * esté equipada en ese slot.
       */
      await tx.habilidadAprendida.updateMany({
        where: {
          personajeId: personaje.id,
          slot,
        },
        data: {
          slot: null,
        },
      });

      const actualizada = await tx.habilidadAprendida.update({
        where: {
          id: habilidadAprendida.id,
        },
        data: {
          slot,
        },
      });

      return actualizada;
    });

    return NextResponse.json({
      exito: true,
      habilidad: {
        id: resultado.id,
        habilidadId: resultado.habilidadId,
        slot: resultado.slot,
        definicion: habilidad,
      },
      mensaje: `${habilidad.nombre} equipada en ${slot}.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "PERSONAJE_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "No se encontró el personaje." },
            { status: 404 }
          );

        case "HABILIDAD_NO_APRENDIDA":
          return NextResponse.json(
            { error: "No has aprendido esta habilidad." },
            { status: 403 }
          );
      }
    }

    console.error("Error al equipar habilidad:", error);

    return NextResponse.json(
      { error: "No se pudo equipar la habilidad." },
      { status: 500 }
    );
  }
}
