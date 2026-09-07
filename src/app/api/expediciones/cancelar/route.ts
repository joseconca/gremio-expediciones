import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: true,
        expedicionActiva: true,
      },
    });

    if (!usuario?.personaje || !usuario.expedicionActiva) {
      return NextResponse.json(
        { error: "No tienes ninguna expedición activa." },
        { status: 400 }
      );
    }

    const expedicion = usuario.expedicionActiva;

    // Solo se puede cancelar mientras todavía está yendo al destino.
    if (expedicion.fase !== "en_viaje") {
      return NextResponse.json(
        { error: "Esta expedición ya está regresando." },
        { status: 409 }
      );
    }

    const ahora = new Date();

    // Si ya ha llegado al destino, ya no se puede cancelar.
    if (expedicion.fechaLlegada <= ahora) {
      return NextResponse.json(
        { error: "El aventurero ya ha llegado a su destino." },
        { status: 409 }
      );
    }

    
    const tiempoTranscurrido = Math.max(
      60_000,
      ahora.getTime() - expedicion.fechaSalida.getTime()
    );

    const fechaSalidaRegreso = ahora;
    const fechaLlegadaRegreso = new Date(
      ahora.getTime() + tiempoTranscurrido
    );

    const actualizado = await prisma.$transaction(async (tx) => {
      await tx.expedicionActiva.update({
        where: { id: expedicion.id },
        data: {
          fase: "regresando",
          fechaSalida: fechaSalidaRegreso,
          fechaLlegada: fechaLlegadaRegreso,
          recompensa: 0,
        },
      });

      await tx.personaje.update({
        where: { usuarioId: usuario.id },
        data: {
          hpActual: 1,
          estado: "de_viaje",
        },
      });

      return tx.usuario.findUnique({
        where: { id: usuario.id },
        include: {
          personaje: true,
          expedicionActiva: true,
        },
      });
    });

    if (!actualizado) {
      return NextResponse.json(
        { error: "No se pudo actualizar la expedición." },
        { status: 500 }
      );
    }

    const datosUsuario = Object.fromEntries(
      Object.entries(actualizado).filter(
        ([clave]) => clave !== "password"
      )
    );

    return NextResponse.json({
      exito: true,
      fechaSalida: fechaSalidaRegreso.toISOString(),
      fechaLlegada: fechaLlegadaRegreso.toISOString(),
      usuario: datosUsuario,
    });
  } catch (error) {
    console.error("Error al cancelar expedición:", error);

    return NextResponse.json(
      { error: "No se pudo iniciar el regreso." },
      { status: 500 }
    );
  }
}