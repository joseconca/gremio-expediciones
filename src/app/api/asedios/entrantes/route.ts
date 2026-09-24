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

    const combates = await prisma.combateActivo.findMany({
      where: {
        tipo: "pvp",
        defensorUsuarioId: usuario.id,
        fase: "activo",
      },
      include: {
        expedicion: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: {
        creado: "desc",
      },
    });

    return NextResponse.json({ combates });
  } catch (error) {
    console.error("Error obteniendo asedios entrantes:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los asedios entrantes." },
      { status: 500 }
    );
  }
}