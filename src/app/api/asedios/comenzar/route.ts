import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { procesarLlegadaAsedio } from "@/lib/expediciones/procesarLlegadaAsedio";

export async function POST() {
  try {
    const usuario = await getAuthenticatedUser();

    if (!usuario) {
      return NextResponse.json(
        { error: "NO_AUTENTICADO" },
        { status: 401 }
      );
    }

    const ahora = new Date();

    // Buscar un asedio entrante dirigido a este jugador.
    const asedio = await prisma.expedicionActiva.findFirst({
      where: {
        tipo: "asedio",
        objetivoId: usuario.id,
        fase: "en_viaje",
      },
      orderBy: {
        fechaLlegada: "asc",
      },
    });

    if (!asedio) {
      return NextResponse.json(
        { error: "NO_HAY_ASEDIO_ENTRANTE" },
        { status: 404 }
      );
    }

    // El asedio no puede comenzar antes de su fecha de llegada.
    if (asedio.fechaLlegada > ahora) {
      return NextResponse.json(
        {
          error: "ASEDIO_AUN_NO_HA_LLEGADO",
          fechaLlegada: asedio.fechaLlegada,
        },
        { status: 400 }
      );
    }

    const combate = await procesarLlegadaAsedio(asedio.id);

    return NextResponse.json({
      exito: true,
      tipo: "asedio",
      combate,
    });
  } catch (error) {
    console.error("Error al comenzar asedio:", error);

    const mensaje =
      error instanceof Error ? error.message : "ERROR_DESCONOCIDO";

    const erroresCliente = new Set([
      "NO_AUTENTICADO",
      "NO_HAY_ASEDIO_ENTRANTE",
      "ASEDIO_AUN_NO_HA_LLEGADO",
      "ASEDIO_YA_PROCESADO",
      "EXPEDICION_NO_ENCONTRADA",
      "PERSONAJE_ATACANTE_NO_ENCONTRADO",
      "PERSONAJE_DEFENSOR_NO_ENCONTRADO",
      "DEFENSOR_YA_COMBATIENDO",
      "DEFENSOR_TIENE_ASEDIO_ACTIVO",
      "DEFENSOR_TIENE_COMBATE_ACTIVO",
    ]);

    if (erroresCliente.has(mensaje)) {
      return NextResponse.json(
        { error: mensaje },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "ERROR_AL_COMENZAR_ASEDIO" },
      { status: 500 }
    );
  }
}