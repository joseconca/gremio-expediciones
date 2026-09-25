import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRECIOS_BASE = {
  madera: 100,
  piedra: 200,
  metal: 1000,
} as const;

type Recurso = keyof typeof PRECIOS_BASE;

function esRecursoValido(valor: unknown): valor is Recurso {
  return valor === "madera" || valor === "piedra" || valor === "metal";
}

function calcularPrecio(recurso: Recurso, nivelMercado: number) {
  const precioBase = PRECIOS_BASE[recurso];

  // 10% menos por cada nivel adicional del Mercado.
  const multiplicador = 1 - (nivelMercado - 1) * 0.1;

  return Math.max(1, Math.trunc(precioBase * multiplicador));
}

export async function POST(request: Request) {
  try {
    const usuario = await getAuthenticatedUser();

    if (!usuario) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { recurso, cantidad } = body;

    if (!esRecursoValido(recurso)) {
      return NextResponse.json({ error: "Recurso no válido" }, { status: 400 });
    }

    if (
      typeof cantidad !== "number" ||
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      return NextResponse.json(
        { error: "La cantidad debe ser un número entero mayor que 0" },
        { status: 400 }
      );
    }

    const edificios =
      typeof usuario.edificios === "object" && usuario.edificios !== null
        ? (usuario.edificios as Record<string, unknown>)
        : {};

    const nivelMercado =
      typeof edificios.mercado === "number" ? edificios.mercado : 0;

    if (nivelMercado <= 0) {
      return NextResponse.json(
        { error: "El Mercado no está construido" },
        { status: 403 }
      );
    }

    const precioUnitario = calcularPrecio(recurso, nivelMercado);
    const costeTotal = precioUnitario * cantidad;

    if (usuario.oro < costeTotal) {
      return NextResponse.json(
        {
          error: "No tienes suficiente oro",
          oroDisponible: usuario.oro,
          costeTotal,
        },
        { status: 400 }
      );
    }

    const datosRecurso = {
      [recurso]: {
        increment: cantidad,
      },
      oro: {
        decrement: costeTotal,
      },
    };

    const usuarioActualizado = await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: datosRecurso,
      select: {
        oro: true,
        madera: true,
        piedra: true,
        metal: true,
        baseCoords: true,
        edificios: true,
        personaje: true,
      },
    });

    return NextResponse.json({
      ok: true,
      usuario: usuarioActualizado,
      recurso,
      cantidad,
      precioUnitario,
      costeTotal,
    });
  } catch (error) {
    console.error("Error al comprar en el mercado:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
