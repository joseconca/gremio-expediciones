import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerObjetosEnVenta } from "@/lib/tiendaObjetos";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";

function construirInventario(personaje: {
  inventario?: {
    objetos: Array<{
      id: string;
      objetoId: string;
      cantidad: number;
      nivelMejora: number;
    }>;
  } | null;
}) {
  return (personaje.inventario?.objetos ?? []).flatMap((objetoInventario) => {
    const objeto = obtenerObjetoPorId(objetoInventario.objetoId);

    if (!objeto) {
      return [];
    }

    return [
      {
        id: objetoInventario.id,
        objetoId: objetoInventario.objetoId,
        cantidad: objetoInventario.cantidad,
        nivelMejora: objetoInventario.nivelMejora,
        objeto,
      },
    ];
  });
}

export async function GET() {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },
      include: {
        personaje: {
          include: {
            inventario: {
              include: {
                objetos: true,
              },
            },
            equipoEquipado: {
              include: {
                arma: true,
                armadura: true,
                accesorio: true,
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.personaje) {
      return NextResponse.json(
        { error: "No se encontró el personaje." },
        { status: 404 }
      );
    }

    const edificios =
      usuario.edificios &&
      typeof usuario.edificios === "object" &&
      !Array.isArray(usuario.edificios)
        ? (usuario.edificios as Record<string, unknown>)
        : {};

    const nivelArmeria =
      typeof edificios.armeria === "number" ? edificios.armeria : 0;

    const nivelHerreria =
      typeof edificios.herreria === "number" ? edificios.herreria : 0;

    const inventario = construirInventario(usuario.personaje);
    const equipo = obtenerEquipoDesdePersonaje(usuario.personaje);

    return NextResponse.json({
      armeriaNivel: nivelArmeria,
      herreriaNivel: nivelHerreria,
      enVenta: obtenerObjetosEnVenta(nivelArmeria),
      inventario,
      equipo,
      oro: usuario.oro,
    });
  } catch (error) {
    console.error("Error al obtener objetos:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los objetos." },
      { status: 500 }
    );
  }
}
