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
    return NextResponse.json(
      { error: "Error al conectar con la base de datos." },
      { status: 500 }
    );
  }
}
