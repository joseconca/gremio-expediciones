import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Devuelve expediciones de asedio que todavía viajan hacia el usuario.
 * Los combates PvP ya iniciados se recuperan exclusivamente por
 * /api/combate/estado, para que cada endpoint tenga un contrato inequívoco.
 */
export async function GET() {
  try {
    const usuario = await getAuthenticatedUser();
    if (!usuario) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const expediciones = await prisma.expedicionActiva.findMany({
      where: {
        tipo: "asedio",
        objetivoId: usuario.id,
        fase: "en_viaje",
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            baseCoords: true,
            personaje: {
              select: {
                nombre: true,
                clase: true,
                sexo: true,
              },
            },
          },
        },
      },
      orderBy: { fechaLlegada: "asc" },
    });

    return NextResponse.json({
      asediosEntrantes: expediciones.map((expedicion) => ({
        id: expedicion.id,
        atacanteUsuarioId: expedicion.usuario.id,
        atacanteNombre: expedicion.usuario.nombre,
        atacanteNombreAventurero: expedicion.usuario.personaje?.nombre ?? "Aventurero",
        atacanteClase: expedicion.usuario.personaje?.clase ?? null,
        atacanteSexo: expedicion.usuario.personaje?.sexo ?? null,
        fechaSalida: expedicion.fechaSalida,
        fechaLlegada: expedicion.fechaLlegada,
        origenCoords: expedicion.usuario.baseCoords,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error obteniendo expediciones de asedio entrantes:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener las expediciones de asedio entrantes." },
      { status: 500 }
    );
  }
}
