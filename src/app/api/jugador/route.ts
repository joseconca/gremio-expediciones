import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sincronizarRegeneracion } from "@/lib/regeneracion";
import { calcularEstadisticasPersonaje } from "@/lib/estadisticasPersonaje";

export const dynamic = "force-dynamic";

const includeGameData = {
  personaje: {
    include: {
      habilidades: true,
    },
  },
  expedicionActiva: { include: { combateActivo: true } },
} as const;

export async function GET() {
  try {
    const usuarioSesion = await getAuthenticatedUser();
    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: includeGameData,
    });
    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        ultimaActividad: new Date(),
      },
    });

    if (usuario.personaje) {
      usuario.personaje = await sincronizarRegeneracion(usuario.personaje);
    }

    const expedicionesEntrantes = await prisma.expedicionActiva.findMany({
      where: { tipo: "comercio", objetivoId: usuario.id },
      select: {
        id: true,
        usuarioId: true,
        fechaSalida: true,
        fechaLlegada: true,
        dificultad: true,
      },
    });

    const origenes = await prisma.usuario.findMany({
      where: {
        id: {
          in: expedicionesEntrantes.map((expedicion) => expedicion.usuarioId),
        },
      },
      select: {
        id: true,
        nombre: true,
        baseCoords: true,
        personaje: {
          select: {
            nombre: true,
            clase: true,
            sexo: true,
            hpActual: true,
            nivel: true,
            velocidadMejoras: true,
            capacidadCarruajeMejoras: true,
            habilidades: {
              select: {
                habilidadId: true,
              },
            },
          },
        },
      },
    });
    const nombresOrigen = new Map(
      origenes.map((origen) => [origen.id, origen.nombre])
    );

    const caravanasEntrantes = expedicionesEntrantes.map((expedicion) => {
      const origen = origenes.find(
        (origen) => origen.id === expedicion.usuarioId
      );

      const personaje = origen?.personaje;

      const estadisticas = personaje
        ? calcularEstadisticasPersonaje(
            personaje,
            personaje.habilidades.map((habilidad) => habilidad.habilidadId)
          )
        : null;

      return {
        id: expedicion.id,
        gremioOrigen: origen?.nombre || "Gremio desconocido",
        origenCoords: origen?.baseCoords,
        nombreAventurero: personaje?.nombre || "Aventurero",
        claseAventurero: personaje?.clase,
        sexoAventurero: personaje?.sexo,
        hpAventurero: personaje?.hpActual || 0,
        hpMaximoAventurero: estadisticas?.total.hpMaximo || 100,
        fechaSalida: expedicion.fechaSalida,
        fechaLlegada: expedicion.fechaLlegada,
        dificultad: expedicion.dificultad,
      };
    });

    const datosPublicos = Object.fromEntries(
      Object.entries(usuario).filter(([clave]) => clave !== "password")
    );

    return NextResponse.json(
      { ...datosPublicos, caravanasEntrantes },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error al cargar el jugador:", error);
    return NextResponse.json(
      { error: "Error al conectar con la base de datos." },
      { status: 500 }
    );
  }
}
