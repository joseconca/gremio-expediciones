import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { procesarTurnoAutomaticoAsedio } from "@/lib/expediciones/procesarTurnoAsedio";

export async function GET() {
  try {
    const usuario = await getAuthenticatedUser();

    if (!usuario) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401 }
      );
    }

    const combate = await prisma.combateActivo.findFirst({
      where: {
        tipo: "pvp",
        OR: [
          {
            atacanteUsuarioId: usuario.id,
          },
          {
            defensorUsuarioId: usuario.id,
          },
        ],
      },
      orderBy: {
        actualizado: "desc",
      },
    });

    if (!combate) {
      return NextResponse.json({
        combate: null,
      });
    }

    /*
     * El procesamiento del turno automático está centralizado
     * en procesarTurnoAutomaticoAsedio().
     *
     * Si el turno todavía no ha expirado, simplemente devuelve
     * el combate actual.
     *
     * Si han pasado 2 minutos, procesa el ataque automático.
     */
    const resultado =
      await procesarTurnoAutomaticoAsedio(
        combate.id
      );

    return NextResponse.json({
      combate: resultado.combate,
      accion: resultado.accion ?? null,
      automatica: resultado.procesado,
      terminado: resultado.terminado ?? false,
      botin: resultado.botin ?? null,
    });
  } catch (error) {
    console.error(
      "Error obteniendo estado del combate:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo obtener el estado del combate.",
      },
      { status: 500 }
    );
  }
}