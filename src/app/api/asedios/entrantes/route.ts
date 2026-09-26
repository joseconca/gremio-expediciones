import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const usuario = await getAuthenticatedUser();

    if (!usuario) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401 }
      );
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
      orderBy: {
        fechaSalida: "desc",
      },
    });

    const asedios = expediciones.map((expedicion) => {
      const origenCoords = expedicion.usuario.baseCoords as {
        lat: number;
        lng: number;
      } | null;

      return {
        id: expedicion.id,

        // Gremio atacante
        atacanteNombre: expedicion.usuario.nombre,

        // Aventurero atacante
        atacanteNombreAventurero:
          expedicion.usuario.personaje?.nombre ?? "Aventurero",

        atacanteClase:
          expedicion.usuario.personaje?.clase ?? null,

        atacanteSexo:
          expedicion.usuario.personaje?.sexo ?? null,

        fechaSalida: expedicion.fechaSalida.toISOString(),
        fechaLlegada: expedicion.fechaLlegada.toISOString(),

        // Base desde la que sale el atacante
        origenCoords,
      };
    });

    return NextResponse.json({ asedios });
  } catch (error) {
    console.error("Error obteniendo asedios entrantes:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los asedios entrantes." },
      { status: 500 }
    );
  }
}