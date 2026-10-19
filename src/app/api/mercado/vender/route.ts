import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRECIOS_RECURSOS, calcularPrecioVentaRecurso } from "@/lib/economia";

type Recurso = keyof typeof PRECIOS_RECURSOS;

const MAX_INT_POSTGRES = 2_147_483_647;
const MAX_CANTIDAD_VENTA = 1_000_000;

function esRecursoValido(valor: unknown): valor is Recurso {
  return valor === "madera" || valor === "piedra" || valor === "metal";
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
      cantidad > MAX_CANTIDAD_VENTA
    ) {
      return NextResponse.json(
        { error: `La cantidad debe ser un entero entre 1 y ${MAX_CANTIDAD_VENTA}.` },
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

    if (usuario[recurso] < cantidad) {
      return NextResponse.json(
        { error: "No tienes suficientes recursos para completar la venta." },
        { status: 400 }
      );
    }

    // La venta usa el precio base de catálogo, sin los descuentos del Mercado.
    const precioBaseUnitario = PRECIOS_RECURSOS[recurso];
    const ingresoTotal = calcularPrecioVentaRecurso(recurso, cantidad);

    if (!Number.isSafeInteger(ingresoTotal) || ingresoTotal <= 0 || ingresoTotal > MAX_INT_POSTGRES) {
      return NextResponse.json(
        { error: "La venta supera el importe máximo permitido." },
        { status: 400 }
      );
    }

    if (usuario.oro > MAX_INT_POSTGRES - ingresoTotal) {
      return NextResponse.json(
        { error: "No puedes almacenar más oro." },
        { status: 409 }
      );
    }

    const actualizacion = await prisma.usuario.updateMany({
      where: {
        id: usuario.id,
        [recurso]: { gte: cantidad },
        oro: { lte: MAX_INT_POSTGRES - ingresoTotal },
      },
      data: {
        [recurso]: { decrement: cantidad },
        oro: { increment: ingresoTotal },
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

      if (estadoActual[recurso] < cantidad) {
        return NextResponse.json(
          { error: "No tienes suficientes recursos para completar la venta." },
          { status: 400 }
        );
      }

      if (estadoActual.oro > MAX_INT_POSTGRES - ingresoTotal) {
        return NextResponse.json(
          { error: "No puedes almacenar más oro." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "El inventario ha cambiado. Vuelve a revisar las existencias e inténtalo de nuevo." },
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
      precioBaseUnitario,
      ingresoTotal,
    });
  } catch (error) {
    console.error("Error al vender recursos en el mercado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
