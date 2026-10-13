import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POSICIONES_COMBATE, type PosicionCombate } from "@/lib/expediciones/posicion-combate";

export async function POST(request: Request) {
  try {
    const usuario = await getAuthenticatedUser();
    if (!usuario) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "La posición enviada no es válida." }, { status: 400 });
    }

    const posicion = (body as Record<string, unknown>).posicion;
    if (typeof posicion !== "string" || !POSICIONES_COMBATE.includes(posicion as PosicionCombate)) {
      return NextResponse.json({ error: "Selecciona Melé, Centro o Retaguardia." }, { status: 400 });
    }

    const actualizado = await prisma.personaje.updateMany({
      where: { usuarioId: usuario.id },
      data: { posicionCombate: posicion },
    });
    if (actualizado.count !== 1) {
      return NextResponse.json({ error: "No se encontró el personaje." }, { status: 404 });
    }

    return NextResponse.json({ exito: true, posicionCombate: posicion });
  } catch (error) {
    console.error("Error guardando la posición táctica:", error);
    return NextResponse.json({ error: "No se pudo guardar la posición táctica." }, { status: 500 });
  }
}
