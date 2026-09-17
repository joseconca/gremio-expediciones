import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";

type TipoEquipamiento = "arma" | "armadura" | "accesorio";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json(
        { error: "Sesión requerida." },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (
      typeof body.objetoInventarioId !== "string" ||
      body.objetoInventarioId.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Debes indicar el objeto que quieres equipar." },
        { status: 400 }
      );
    }

    const objetoInventarioId = body.objetoInventarioId;

    const personaje = await prisma.personaje.findUnique({
      where: {
        usuarioId: usuarioSesion.id,
      },
      include: {
        inventario: true,
        equipoEquipado: true,
      },
    });

    if (!personaje) {
      return NextResponse.json(
        { error: "No se encontró el personaje." },
        { status: 404 }
      );
    }

    if (!personaje.inventario) {
      return NextResponse.json(
        { error: "El personaje no tiene inventario." },
        { status: 409 }
      );
    }

    const objetoInventario = await prisma.inventarioObjeto.findFirst({
      where: {
        id: objetoInventarioId,
        inventarioId: personaje.inventario.id,
      },
    });

    if (!objetoInventario) {
      return NextResponse.json(
        { error: "El objeto no pertenece a tu inventario." },
        { status: 403 }
      );
    }

    const objeto = obtenerObjetoPorId(objetoInventario.objetoId);

    if (!objeto) {
      return NextResponse.json(
        { error: "No se encontró la definición del objeto." },
        { status: 404 }
      );
    }

    const tipo = objeto.tipo as TipoEquipamiento;

    if (
      tipo !== "arma" &&
      tipo !== "armadura" &&
      tipo !== "accesorio"
    ) {
      return NextResponse.json(
        { error: "Este objeto no se puede equipar." },
        { status: 400 }
      );
    }

    const equipo = await prisma.equipoEquipado.upsert({
      where: {
        personajeId: personaje.id,
      },
      update:
        tipo === "arma"
          ? { armaInventarioId: objetoInventario.id }
          : tipo === "armadura"
            ? { armaduraInventarioId: objetoInventario.id }
            : { accesorioInventarioId: objetoInventario.id },
      create:
        tipo === "arma"
          ? {
              personajeId: personaje.id,
              armaInventarioId: objetoInventario.id,
            }
          : tipo === "armadura"
            ? {
                personajeId: personaje.id,
                armaduraInventarioId: objetoInventario.id,
              }
            : {
                personajeId: personaje.id,
                accesorioInventarioId: objetoInventario.id,
              },
    });

    return NextResponse.json({
      exito: true,
      mensaje: `Has equipado ${objeto.nombre}.`,
      equipo,
    });
  } catch (error) {
    console.error("Error al equipar objeto:", error);

    return NextResponse.json(
      { error: "No se pudo equipar el objeto." },
      { status: 500 }
    );
  }
}