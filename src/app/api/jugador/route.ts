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

    const expedicionesEntrantes = await prisma.expedicionActiva.findMany({
      where: { tipo: "comercio", objetivoId: usuario.id },
      select: { id: true, usuarioId: true, fechaSalida: true, fechaLlegada: true, dificultad: true },
    });
    const origenes = await prisma.usuario.findMany({
      where: { id: { in: expedicionesEntrantes.map((expedicion) => expedicion.usuarioId) } },
      select: { id: true, nombre: true },
    });
    const nombresOrigen = new Map(origenes.map((origen) => [origen.id, origen.nombre]));
    const caravanasEntrantes = expedicionesEntrantes.map((expedicion) => ({
      id: expedicion.id,
      gremioOrigen: nombresOrigen.get(expedicion.usuarioId) || "Gremio desconocido",
      fechaSalida: expedicion.fechaSalida,
      fechaLlegada: expedicion.fechaLlegada,
      dificultad: expedicion.dificultad,
    }));

    const datosPublicos = Object.fromEntries(
      Object.entries(usuario).filter(([clave]) => clave !== "password")
    );
    return NextResponse.json({ ...datosPublicos, caravanasEntrantes });
  } catch (error) {
    console.error("Error al cargar el jugador:", error);
    return NextResponse.json(
      { error: "Error al conectar con la base de datos." },
      { status: 500 }
    );
  }
}
