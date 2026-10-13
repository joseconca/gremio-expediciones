import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const usuario = await getAuthenticatedUser();

    if (!usuario) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    // Este endpoint entrega combates iniciados, no expediciones que aún viajan.
    // El cliente puede abrir AsedioModal directamente con este contrato.
    const combates = await prisma.combateActivo.findMany({
      where: {
        tipo: "pvp",
        defensorUsuarioId: usuario.id,
        fase: "activo",
      },
      orderBy: { actualizado: "desc" },
      take: 1,
    });

    return NextResponse.json({
      combates: combates.map((combate) => ({
        ...combate,
        rolUsuario: "defensor" as const,
      })),
    });
  } catch (error) {
    console.error("Error obteniendo asedios entrantes:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los asedios entrantes." },
      { status: 500 }
    );
  }
}
