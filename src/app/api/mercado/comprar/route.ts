import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRECIOS_BASE = {
  madera: 100,
  piedra: 200,
  metal: 1000,
} as const;

type Recurso = keyof typeof PRECIOS_BASE;

const MAX_INT_POSTGRES = 2_147_483_647;
const MAX_CANTIDAD_COMPRA = 1_000_000;

function esRecursoValido(valor: unknown): valor is Recurso {
  return valor === "madera" || valor === "piedra" || valor === "metal";
}

function calcularPrecio(recurso: Recurso, nivelMercado: number) {
  const precioBase = PRECIOS_BASE[recurso];
  const multiplicador = 1 - (nivelMercado - 1) * 0.1;
  return Math.max(1, Math.trunc(precioBase * multiplicador));
}

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
    }

    const datos = body as Record<string, unknown>;
    const recurso = datos.recurso;
    const cantidad = datos.cantidad;

    if (!esRecursoValido(recurso)) {
      return NextResponse.json({ error: "Recurso no válido" }, { status: 400 });
    }

    if (
      typeof cantidad !== "number" ||
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0 ||
      cantidad > MAX_CANTIDAD_COMPRA
    ) {
      return NextResponse.json(
        { error: `La cantidad debe ser un entero entre 1 y ${MAX_CANTIDAD_COMPRA}.` },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      select: {
        id: true,
        oro: true,
        madera: true,
        piedra: true,
        metal: true,
        edificios: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const edificios =
      typeof usuario.edificios === "object" &&
      usuario.edificios !== null &&
      !Array.isArray(usuario.edificios)
        ? (usuario.edificios as Record<string, unknown>)
        : {};

    const nivelMercado =
      typeof edificios.mercado === "number" && Number.isFinite(edificios.mercado)
        ? edificios.mercado
        : 0;

    if (nivelMercado <= 0) {
      return NextResponse.json(
        { error: "El Mercado no está construido" },
        { status: 403 }
      );
    }

    const precioUnitario = calcularPrecio(recurso, nivelMercado);
    const costeTotal = precioUnitario * cantidad;

    if (
      !Number.isSafeInteger(costeTotal) ||
      costeTotal > MAX_INT_POSTGRES
    ) {
      return NextResponse.json(
        { error: "La compra supera el importe máximo permitido." },
        { status: 400 }
      );
    }

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

    // La deducción de oro y la entrega del recurso se realizan en un único
    // UPDATE condicional para que dos compras simultáneas no gasten el mismo oro.
    const actualizacion = await prisma.usuario.updateMany({
      where: {
        id: usuario.id,
        oro: { gte: costeTotal },
        [recurso]: { lte: MAX_INT_POSTGRES - cantidad },
      },
      data: {
        oro: { decrement: costeTotal },
        [recurso]: { increment: cantidad },
      },
    });

    if (actualizacion.count !== 1) {
      const estadoActual = await prisma.usuario.findUnique({
        where: { id: usuario.id },
        select: { oro: true, madera: true, piedra: true, metal: true },
      });

      if (!estadoActual) {
        return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
      }

      if (estadoActual.oro < costeTotal) {
        return NextResponse.json(
          {
            error: "No tienes suficiente oro",
            oroDisponible: estadoActual.oro,
            costeTotal,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "El almacén no puede contener más recursos de este tipo." },
        { status: 409 }
      );
    }

    const usuarioActualizado = await prisma.usuario.findUniqueOrThrow({
      where: { id: usuario.id },
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
