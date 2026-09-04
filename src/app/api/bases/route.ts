import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Coordenadas = { lat: number; lng: number };

function leerCoordenadas(valor: unknown): Coordenadas | null {
  if (!valor || typeof valor !== "object") return null;
  const coords = valor as Record<string, unknown>;
  if (typeof coords.lat !== "number" || typeof coords.lng !== "number") return null;
  return { lat: coords.lat, lng: coords.lng };
}

export async function GET(request: Request) {
  try {
    const usuario = await getAuthenticatedUser();
    if (!usuario) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const soloConEmbajada = searchParams.get("todas") !== "1";

    const usuarios = await prisma.usuario.findMany({
      where: { id: { not: usuario.id }, baseCoords: { not: Prisma.JsonNull } },
      select: { id: true, nombre: true, baseCoords: true, edificios: true },
      orderBy: { nombre: "asc" },
    });

    const bases = usuarios.flatMap((otroUsuario) => {
      const coords = leerCoordenadas(otroUsuario.baseCoords);
      if (!coords) return [];
      const edificios = otroUsuario.edificios as Record<string, unknown> | null;
      if (soloConEmbajada && edificios?.embajada !== 1 && edificios?.embajada !== 2) return [];
      const niveles = Object.values(edificios || {}).filter(
        (nivel): nivel is number => typeof nivel === "number"
      );
      return [{
        id: otroUsuario.id,
        nombre: otroUsuario.nombre,
        lat: coords.lat,
        lng: coords.lng,
        nivel: niveles.length ? Math.max(...niveles) : 1,
      }];
    });

    return NextResponse.json({ bases });
  } catch (error) {
    console.error("Error al cargar las bases:", error);
    return NextResponse.json({ error: "No se pudieron cargar las bases." }, { status: 500 });
  }
}
