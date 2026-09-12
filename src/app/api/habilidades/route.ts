import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { puedeAprenderHabilidad } from "@/lib/configuracionJuego";
import { obtenerHabilidadesEnVenta } from "@/lib/tiendaHabilidades";
import { obtenerHabilidadPorId } from "@/lib/habilidades";

export async function GET() {
  try {
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
        personaje: {
          select: {
            id: true,
            habilidades: {
              select: {
                id: true,
                habilidadId: true,
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

    const habilidadesEnVenta = obtenerHabilidadesEnVenta();

    const enVenta = habilidadesEnVenta.map((habilidad) => ({
      ...habilidad,
      puedeAprender: puedeAprenderHabilidad(habilidad.rareza, nivelEscuela),
    }));

    const habilidadesAprendidas = usuario.personaje.habilidades
      .map((habilidadAprendida) => {
        const habilidad = obtenerHabilidadPorId(habilidadAprendida.habilidadId);

        if (!habilidad) {
          return null;
        }

        return {
          id: habilidadAprendida.id,
          habilidadId: habilidadAprendida.habilidadId,
          slot: habilidadAprendida.slot,
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
      escuelaNivel: nivelEscuela,
      enVenta,
      aprendidas: habilidadesAprendidas,
    });
  } catch (error) {
    console.error("Error al obtener habilidades:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener las habilidades." },
      { status: 500 }
    );
  }
}
