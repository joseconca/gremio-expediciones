import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { evaluarRequisitosAprendizaje, obtenerHabilidadesEnVenta } from "@/lib/tiendaHabilidades";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { CLASES, puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import { nivelMaximoHabilidad } from "@/lib/progresion/niveles-habilidad";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const incluirOtrasClasesRama = url.searchParams.get("incluirOtrasClasesRama") === "true";
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },
      select: {
        edificios: true,
        oro: true,
        personaje: {
          select: {
            id: true,
            profesionActivaId: true,
            progresosClase: {
              select: {
                claseId: true,
                nivelJob: true,
                puntosHabilidadDisponibles: true,
                desbloqueada: true,
                maestriaCompletada: true,
              },
            },
            habilidades: {
              select: {
                id: true,
                habilidadId: true,
                nivel: true,
                slot: true,
              },
              orderBy: {
                habilidadId: "asc",
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    if (!usuario.personaje) {
      return NextResponse.json(
        { error: "El usuario no tiene personaje." },
        { status: 400 }
      );
    }

    const edificios =
      usuario.edificios && typeof usuario.edificios === "object"
        ? (usuario.edificios as Record<string, unknown>)
        : {};

    const nivelEscuela =
      typeof edificios.escuelaCombate === "number"
        ? edificios.escuelaCombate
        : 0;

    const personaje = usuario.personaje;
    const progresosClase = personaje.progresosClase;
    const profesionActivaId = personaje.profesionActivaId || "novato";
    // Super Novato es una profesión generalista: siempre muestra las habilidades
    // de sus ramas de Tier 1, aunque el selector opcional esté desmarcado.
    const incluirOtrasClasesEfectivo =
      incluirOtrasClasesRama || profesionActivaId === "superNovato";
    const habilidadesEnVenta = obtenerHabilidadesEnVenta(profesionActivaId).filter((habilidad) =>
      incluirOtrasClasesEfectivo || (habilidad.claseId ?? profesionActivaId) === profesionActivaId
    );
    const progresoJob = progresosClase.find(
      (progreso) => progreso.claseId === profesionActivaId && progreso.desbloqueada
    );
    const enVenta = habilidadesEnVenta.map((habilidad) => {
      const clasePropietariaId = habilidad.claseId ?? profesionActivaId;
      return {
        ...habilidad,
        ...evaluarRequisitosAprendizaje(habilidad, progresosClase),
        nivelMaximo: nivelMaximoHabilidad(clasePropietariaId,habilidad),
        clasePropietariaId,
        clasePropietariaNombre: CLASES[clasePropietariaId]?.nombre ?? clasePropietariaId,
        modoAprendizaje: "job" as const,
      };
    });

    const habilidadesAprendidas = usuario.personaje.habilidades
      .map((habilidadAprendida) => {
        const habilidad = obtenerHabilidadPorId(habilidadAprendida.habilidadId);

        if (!habilidad) {
          return null;
        }

        const clasePropietariaId = habilidad.claseId ?? "novato";
        const progresoPropietario = progresosClase.find((progreso) => progreso.claseId === clasePropietariaId);
        return {
          id: habilidadAprendida.id,
          habilidadId: habilidadAprendida.habilidadId,
          nivel: habilidadAprendida.nivel,
          nivelMaximo: nivelMaximoHabilidad(clasePropietariaId,habilidad),
          slot: habilidadAprendida.slot,
          puntosHabilidadDisponiblesClase: progresoPropietario?.puntosHabilidadDisponibles ?? 0,
          nivelJobClase: progresoPropietario?.nivelJob ?? 0,
          progresoClaseDesbloqueada: Boolean(progresoPropietario?.desbloqueada),
          habilidad,
        };
      })
      .filter(
        (
          habilidadAprendida
        ): habilidadAprendida is NonNullable<typeof habilidadAprendida> =>
          habilidadAprendida !== null
      );

    return NextResponse.json({
      oro: usuario.oro,
      escuelaNivel: nivelEscuela,
      profesionActivaId,
      profesionNombre: CLASES[profesionActivaId]?.nombre ?? profesionActivaId,
      incluirOtrasClasesRama: incluirOtrasClasesEfectivo,
      progresoJob: progresoJob ?? null,
      enVenta,
      aprendidas: habilidadesAprendidas.map((aprendida) => ({
        ...aprendida,
        disponibleParaProfesion: puedeUsarHabilidadDeClase(
          profesionActivaId,
          aprendida.habilidad.claseId
        ),
      })),
    });
  } catch (error) {
    console.error("Error al obtener habilidades:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener las habilidades." },
      { status: 500 }
    );
  }
}
