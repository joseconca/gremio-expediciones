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

    const sugerencias = await prisma.sugerencia.findMany({
      orderBy: {
        creado: "desc",
      },
      select: {
        id: true,
        titulo: true,
        texto: true,
        creado: true,
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
    });

    return NextResponse.json({ sugerencias });
  } catch (error) {
    console.error("Error obteniendo sugerencias:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las sugerencias." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAuthenticatedUser();

    if (!usuario) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const titulo =
      typeof body.titulo === "string" ? body.titulo.trim() : "";

    const texto =
      typeof body.texto === "string" ? body.texto.trim() : "";

    if (!titulo) {
      return NextResponse.json(
        { error: "El título es obligatorio." },
        { status: 400 }
      );
    }

    if (titulo.length > 150) {
      return NextResponse.json(
        { error: "El título no puede superar los 150 caracteres." },
        { status: 400 }
      );
    }

    if (!texto) {
      return NextResponse.json(
        { error: "El texto es obligatorio." },
        { status: 400 }
      );
    }

    if (texto.length > 2000) {
      return NextResponse.json(
        { error: "El texto no puede superar los 2000 caracteres." },
        { status: 400 }
      );
    }

    const sugerencia = await prisma.sugerencia.create({
      data: {
        usuarioId: usuario.id,
        titulo,
        texto,
      },
      select: {
        id: true,
        titulo: true,
        texto: true,
        creado: true,
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
    });

    return NextResponse.json(
      { sugerencia },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando sugerencia:", error);

    return NextResponse.json(
      { error: "No se pudo enviar la sugerencia." },
      { status: 500 }
    );
  }
}