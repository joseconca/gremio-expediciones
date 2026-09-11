import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const usuarioSesion = await getAuthenticatedUser();
    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      select: { edificios: true },
    });
    const edificiosPropios = usuario?.edificios as Record<string, unknown> | null;
    if (edificiosPropios?.embajada !== 2) {
      return NextResponse.json({ error: "Necesitas la Embajada de nivel 2 para ver el ranking." }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      where: { personaje: { isNot: null } },
      select: {
        nombre: true,
        edificios: true,
        personaje: { select: { nombre: true, clase: true, sexo: true, nivel: true, experiencia: true } },
      },
    });

    const ranking = usuarios
      .filter((u) => {
        const edificios = u.edificios as Record<string, unknown> | null;
        return edificios?.embajada === 2 && u.personaje;
      })
      .map((u) => ({
        nombreBase: u.nombre,
        nombreHeroe: u.personaje!.nombre,
        clase: u.personaje!.clase,
        sexo: u.personaje!.sexo,
        nivel: u.personaje!.nivel,
        experiencia: u.personaje!.experiencia,
      }))
      .sort((a, b) => b.nivel - a.nivel || b.experiencia - a.experiencia);

    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("Error al cargar el ranking:", error);
    return NextResponse.json({ error: "No se pudo cargar el ranking." }, { status: 500 });
  }
}
