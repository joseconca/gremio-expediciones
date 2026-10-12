import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generarMisionesDisponibles } from "@/lib/generadorMisiones";
import { obtenerRangoMaximoDesbloqueado } from "../../../../lib/expediciones/dificultad";

export const dynamic = "force-dynamic";

interface Coordenadas {
  lat: number;
  lng: number;
}

function leerCoordenadas(valor: unknown): Coordenadas | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return null;
  }

  const registro = valor as Record<string, unknown>;
  const { lat, lng } = registro;

  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

export async function GET() {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      select: {
        baseCoords: true,
        ultimaMisionElite: true,
        personaje: {
          select: { nivel: true, rangosAmenazaCompletados: true },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const coordenadas = leerCoordenadas(usuario.baseCoords);

    if (!coordenadas || !usuario.personaje) {
      return NextResponse.json(
        { error: "Necesitas una base y un personaje válidos para consultar las misiones." },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const misiones = generarMisionesDisponibles({
      baseLat: coordenadas.lat,
      baseLng: coordenadas.lng,
      nivelPersonaje: usuario.personaje.nivel,
      rangosAmenazaCompletados: usuario.personaje.rangosAmenazaCompletados,
      ultimaMisionElite: usuario.ultimaMisionElite,
      ahora: new Date(),
    });

    return NextResponse.json(
      { misiones, progresoAmenaza: { rangoMaximo: obtenerRangoMaximoDesbloqueado(usuario.personaje.nivel, usuario.personaje.rangosAmenazaCompletados), rangosCompletados: usuario.personaje.rangosAmenazaCompletados } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error al generar las misiones disponibles:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las misiones." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
