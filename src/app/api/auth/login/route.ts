import { NextResponse } from "next/server";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario || !(await verifyPassword(password, usuario.password))) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
    }

    const session = await createSession(usuario.id);
    const response = NextResponse.json({ usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre } });
    setSessionCookie(response, session.token, session.expira);
    return response;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}