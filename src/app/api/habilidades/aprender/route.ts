import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { puedeAprenderHabilidad } from "@/lib/configuracionJuego";
import { obtenerHabilidadesEnVenta } from "@/lib/tiendaHabilidades";
import { obtenerHabilidadPorId } from "@/lib/habilidades";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const body = await request.json();
    const habilidadId = body.habilidadId;

    if (typeof habilidadId !== "string" || habilidadId.trim() === "") {
      return NextResponse.json(
        { error: "La habilidad indicada no es válida." },
        { status: 400 }
      );
    }

    const habilidad = obtenerHabilidadPorId(habilidadId);

    if (!habilidad) {
      return NextResponse.json(
        { error: "La habilidad no existe." },
        { status: 404 }
      );
    }

    if (habilidad.rareza === "legendario") {
      return NextResponse.json(
        { error: "Las habilidades legendarias no se pueden comprar." },
        { status: 403 }
      );
    }

    const habilidadesEnVenta = obtenerHabilidadesEnVenta();

    const estaEnVenta = habilidadesEnVenta.some(
      (habilidadVenta) => habilidadVenta.id === habilidad.id
    );

    if (!estaEnVenta) {
      return NextResponse.json(
        {
          error: "Esta habilidad no está disponible en la Escuela hoy.",
        },
        { status: 403 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: {
          id: usuarioSesion.id,
        },
        select: {
          id: true,
          oro: true,
          edificios: true,
          personaje: {
            select: {
              id: true,
              habilidades: {
                where: {
                  habilidadId: habilidad.id,
                },
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!usuario) {
        throw new Error("USUARIO_NO_ENCONTRADO");
      }

      if (!usuario.personaje) {
        throw new Error("PERSONAJE_NO_ENCONTRADO");
      }

      const edificios =
        usuario.edificios && typeof usuario.edificios === "object"
          ? (usuario.edificios as Record<string, unknown>)
          : {};

      const nivelEscuela =
        typeof edificios.escuelaCombate === "number"
          ? edificios.escuelaCombate
          : 0;

      if (!puedeAprenderHabilidad(habilidad.rareza, nivelEscuela)) {
        throw new Error("NIVEL_ESCUELA_INSUFICIENTE");
      }

      if (usuario.personaje.habilidades.length > 0) {
        throw new Error("HABILIDAD_YA_APRENDIDA");
      }

      const descuento = await tx.usuario.updateMany({
        where: {
          id: usuario.id,
          oro: {
            gte: habilidad.precio,
          },
        },
        data: {
          oro: {
            decrement: habilidad.precio,
          },
        },
      });

      if (descuento.count !== 1) {
        throw new Error("ORO_INSUFICIENTE");
      }

      const aprendida = await tx.habilidadAprendida.create({
        data: {
          personajeId: usuario.personaje.id,
          habilidadId: habilidad.id,
          slot: null,
        },
      });

      return aprendida;
    });

    return NextResponse.json({
      exito: true,
      habilidad: {
        id: resultado.id,
        habilidadId: resultado.habilidadId,
        slot: resultado.slot,
        definicion: habilidad,
      },
      mensaje: `Has aprendido ${habilidad.nombre}.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "USUARIO_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "Usuario no encontrado." },
            { status: 404 }
          );

        case "PERSONAJE_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "El usuario no tiene personaje." },
            { status: 400 }
          );

        case "NIVEL_ESCUELA_INSUFICIENTE":
          return NextResponse.json(
            {
              error: "El nivel de la Escuela de Combate no es suficiente.",
            },
            { status: 403 }
          );

        case "HABILIDAD_YA_APRENDIDA":
          return NextResponse.json(
            { error: "Ya has aprendido esta habilidad." },
            { status: 409 }
          );

        case "ORO_INSUFICIENTE":
          return NextResponse.json(
            { error: "No tienes suficiente oro." },
            { status: 400 }
          );
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya has aprendido esta habilidad." },
        { status: 409 }
      );
    }

    console.error("Error al aprender habilidad:", error);

    return NextResponse.json(
      { error: "No se pudo aprender la habilidad." },
      { status: 500 }
    );
  }
}
