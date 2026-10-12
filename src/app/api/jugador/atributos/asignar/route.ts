import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CAMPOS_ATRIBUTO = {
  fuerza: "fuerza",
  agilidad: "agilidad",
  vitalidad: "vitalidad",
  inteligencia: "inteligencia",
  destreza: "destreza",
  suerte: "suerte",
} as const;

type Atributo = keyof typeof CAMPOS_ATRIBUTO;
const VALOR_MAXIMO_ATRIBUTO = 99;

function esAtributo(valor: unknown): valor is Atributo {
  return typeof valor === "string" &&
    Object.prototype.hasOwnProperty.call(CAMPOS_ATRIBUTO, valor);
}

export async function POST(request: Request) {
  try {
    const sesion = await getAuthenticatedUser();
    if (!sesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    let bodyValue: unknown;
    try {
      bodyValue = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la petición no contiene JSON válido." },
        { status: 400 }
      );
    }

    if (!bodyValue || typeof bodyValue !== "object" || Array.isArray(bodyValue)) {
      return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
    }

    const atributo = (bodyValue as Record<string, unknown>).atributo;
    if (!esAtributo(atributo)) {
      return NextResponse.json({ error: "Atributo RPG no válido." }, { status: 400 });
    }

    const campo = CAMPOS_ATRIBUTO[atributo];
    const resultado = await prisma.$transaction(async (tx) => {
      const personaje = await tx.personaje.findUnique({
        where: { usuarioId: sesion.id },
        select: {
          id: true,
          estado: true,
          [campo]: true,
          puntosAtributoDisponibles: true,
        },
      });

      if (!personaje) throw new Error("PERSONAJE_NO_ENCONTRADO");

      const expedicion = await tx.expedicionActiva.findUnique({
        where: { usuarioId: sesion.id },
        select: { id: true },
      });
      if (expedicion || personaje.estado === "de_viaje") {
        throw new Error("EXPEDICION_ACTIVA");
      }

      if (personaje.puntosAtributoDisponibles < 1) {
        throw new Error("PUNTOS_ATRIBUTO_INSUFICIENTES");
      }

      const valorActual = personaje[campo];
      if (valorActual >= VALOR_MAXIMO_ATRIBUTO) {
        throw new Error("ATRIBUTO_MAXIMO");
      }

      const actualizado = await tx.personaje.updateMany({
        where: {
          id: personaje.id,
          [campo]: valorActual,
          puntosAtributoDisponibles: { gte: 1 },
        },
        data: {
          [campo]: { increment: 1 },
          puntosAtributoDisponibles: { decrement: 1 },
        },
      });

      if (actualizado.count !== 1) throw new Error("PERSONAJE_MODIFICADO");

      return {
        atributo,
        valor: valorActual + 1,
        puntosAtributoDisponibles: personaje.puntosAtributoDisponibles - 1,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true,
      ...resultado,
      mensaje: `${atributo.charAt(0).toUpperCase() + atributo.slice(1)} ha aumentado a ${resultado.valor}.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "PERSONAJE_NO_ENCONTRADO":
          return NextResponse.json({ error: "Necesitas un personaje." }, { status: 400 });
        case "EXPEDICION_ACTIVA":
          return NextResponse.json({ error: "No puedes distribuir atributos durante una expedición." }, { status: 409 });
        case "PUNTOS_ATRIBUTO_INSUFICIENTES":
          return NextResponse.json({ error: "No tienes puntos de atributo disponibles." }, { status: 400 });
        case "ATRIBUTO_MAXIMO":
          return NextResponse.json({ error: `El atributo ya alcanzó el máximo de ${VALOR_MAXIMO_ATRIBUTO}.` }, { status: 400 });
        case "PERSONAJE_MODIFICADO":
          return NextResponse.json({ error: "El personaje ha cambiado. Actualiza los datos e inténtalo de nuevo." }, { status: 409 });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Otra acción ha actualizado al personaje al mismo tiempo. Inténtalo de nuevo." },
        { status: 409 }
      );
    }

    console.error("Error al asignar atributo RPG:", error);
    return NextResponse.json({ error: "No se pudo asignar el atributo." }, { status: 500 });
  }
}
