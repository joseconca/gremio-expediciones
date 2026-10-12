import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  evaluarDesbloqueoClase,
  obtenerClasesVisibles,
  obtenerDefinicionClase,
} from "@/lib/progresion/clases";

export async function GET() {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const personaje = await prisma.personaje.findUnique({
      where: { usuarioId: usuarioSesion.id },
      select: {
        id: true,
        nivel: true,
        experiencia: true,
        profesionActivaId: true,
        progresosClase: {
          orderBy: { creado: "asc" },
          select: {
            claseId: true,
            nivelJob: true,
            experienciaJob: true,
            puntosHabilidadDisponibles: true,
            desbloqueada: true,
            maestriaCompletada: true,
          },
        },
      },
    });

    if (!personaje) {
      return NextResponse.json(
        { error: "Necesitas un personaje para consultar las profesiones." },
        { status: 400 }
      );
    }

    const progresoActual = personaje.progresosClase.find(
      (progreso) => progreso.claseId === personaje.profesionActivaId
    );
    const clases = obtenerClasesVisibles(personaje.profesionActivaId, personaje.progresosClase).map((clase) => {
      const progreso = personaje.progresosClase.find(
        (actual) => actual.claseId === clase.id
      );
      const desbloqueo = evaluarDesbloqueoClase(
        clase.id,
        personaje.progresosClase
      );

      return {
        ...clase,
        progreso: progreso ?? null,
        yaDesbloqueada: desbloqueo.yaDesbloqueada,
        puedeDesbloquear: desbloqueo.puedeDesbloquear,
        requisitosPendientes: desbloqueo.requisitosPendientes,
        esActiva: clase.id === personaje.profesionActivaId,
      };
    });

    return NextResponse.json(
      {
        profesionActiva: obtenerDefinicionClase(personaje.profesionActivaId),
        profesionActivaId: personaje.profesionActivaId,
        progresoActivo: progresoActual ?? null,
        nivelBase: personaje.nivel,
        experienciaBase: personaje.experiencia,
        clases,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error al consultar profesiones:", error);
    return NextResponse.json(
      { error: "No se pudieron consultar las profesiones." },
      { status: 500 }
    );
  }
}
