import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const includeGameData = {
  personaje: true,
  expedicionActiva: true,
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
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const datosPublicos = Object.fromEntries(
      Object.entries(usuario).filter(([clave]) => clave !== "password")
    );
    return NextResponse.json(datosPublicos);
  } catch (error) {
    console.error("Error al cargar el jugador:", error);
    return NextResponse.json({ error: "Error al conectar con la base de datos." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();
    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body = await request.json();
    const { oro, edificios, personaje, baseCoords, expedicionActiva } = body;
    const dataToUpdate: Record<string, unknown> = {};

    if (typeof oro === "number" && oro >= 0) dataToUpdate.oro = oro;
    if (edificios && typeof edificios === "object") dataToUpdate.edificios = edificios;
    if (baseCoords !== undefined) dataToUpdate.baseCoords = baseCoords;

    if (personaje) {
      const datosPersonaje = {
        clase: personaje.clase,
        nombre: personaje.nombre,
        hpActual: personaje.hpActual,
        hpMaximo: personaje.hpMaximo,
        regeneracionDeVida: personaje.regeneracionDeVida,
        estado: personaje.estado,
        ataque: personaje.ataque,
        defensa: personaje.defensa,
        velocidad: personaje.velocidad,
        capacidadCarruaje: personaje.capacidadCarruaje,
      };
      dataToUpdate.personaje = {
        upsert: { create: datosPersonaje, update: datosPersonaje },
      };
    }

    if (expedicionActiva !== undefined) {
      if (expedicionActiva === null) {
        await prisma.expedicionActiva.deleteMany({
          where: { usuarioId: usuarioSesion.id },
        });
      } else {
        dataToUpdate.expedicionActiva = {
            upsert: {
              create: {
                tipo: "expedicion",
                fase: "en_viaje",
                misionId: String(expedicionActiva.idMision),
                nombre: expedicionActiva.nombre,
                recompensa: expedicionActiva.recompensa,
                dificultad: expedicionActiva.dificultad,
                fechaLlegada: new Date(expedicionActiva.fechaLlegada),
                destinoCoords: expedicionActiva.destinoCoords || {},
              },
              update: {
                tipo: "expedicion",
                fase: "en_viaje",
                misionId: String(expedicionActiva.idMision),
                nombre: expedicionActiva.nombre,
                recompensa: expedicionActiva.recompensa,
                dificultad: expedicionActiva.dificultad,
                fechaLlegada: new Date(expedicionActiva.fechaLlegada),
                destinoCoords: expedicionActiva.destinoCoords || {},
              },
            },
        };
      }
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioSesion.id },
      data: dataToUpdate,
      include: includeGameData,
    });
    const datosPublicos = Object.fromEntries(
      Object.entries(usuarioActualizado).filter(([clave]) => clave !== "password")
    );
    return NextResponse.json(datosPublicos);
  } catch (error) {
    console.error("Error al guardar el jugador:", error);
    return NextResponse.json({ error: "Error al actualizar el jugador." }, { status: 500 });
  }
}
