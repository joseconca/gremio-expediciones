import { NextResponse } from "next/server";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !nombre || password.length < 8) {
      return NextResponse.json(
        { error: "Email, nombre y una contraseña de al menos 8 caracteres son obligatorios." },
        { status: 400 }
      );
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: { OR: [{ email }, { nombre }] },
      select: { id: true },
    });
    if (usuarioExistente) {
      return NextResponse.json({ error: "El email o nombre ya está en uso." }, { status: 409 });
    }

    const usuario = await prisma.usuario.create({
      data: {
        email,
        nombre,
        password: await hashPassword(password),
      },
    });
    const session = await createSession(usuario.id);
    const response = NextResponse.json({ usuario: { id: usuario.id, email, nombre } }, { status: 201 });
    setSessionCookie(response, session.token, session.expira);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "El email o nombre ya está en uso." }, { status: 409 });
    }
    console.error("Error al registrar usuario:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }
}