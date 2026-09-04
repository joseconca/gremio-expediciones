import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const usuario = await getAuthenticatedUser();
  if (!usuario) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  const mensajes = await prisma.mensajeChat.findMany({
    orderBy: { creado: "desc" },
    take: 50,
    select: {
      id: true,
      texto: true,
      creado: true,
      usuario: { select: { nombre: true } },
    },
  });
  return NextResponse.json({ mensajes: mensajes.reverse() });
}

export async function POST(request: Request) {
  try {
    const usuario = await getAuthenticatedUser();
    if (!usuario) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

    const body = await request.json();
    const texto = typeof body.texto === "string" ? body.texto.trim() : "";
    if (!texto || texto.length > 300) {
      return NextResponse.json({ error: "El mensaje debe tener entre 1 y 300 caracteres." }, { status: 400 });
    }

    const ultimoMensaje = await prisma.mensajeChat.findFirst({
      where: { usuarioId: usuario.id },
      orderBy: { creado: "desc" },
      select: { creado: true },
    });
    if (ultimoMensaje && Date.now() - ultimoMensaje.creado.getTime() < 1500) {
      return NextResponse.json({ error: "Espera un momento antes de enviar otro mensaje." }, { status: 429 });
    }

    const mensaje = await prisma.mensajeChat.create({
      data: { usuarioId: usuario.id, texto },
      select: { id: true, texto: true, creado: true, usuario: { select: { nombre: true } } },
    });
    return NextResponse.json({ mensaje }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el mensaje." }, { status: 500 });
  }
}