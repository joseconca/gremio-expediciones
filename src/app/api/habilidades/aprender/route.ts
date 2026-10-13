import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { evaluarRequisitosAprendizaje, obtenerHabilidadesEnVenta } from "@/lib/tiendaHabilidades";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    let bodyJson: unknown;

    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la petición no contiene JSON válido." },
        { status: 400 }
      );
    }

    if (!bodyJson || typeof bodyJson !== "object" || Array.isArray(bodyJson)) {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const body = bodyJson as Record<string, unknown>;
    const habilidadId = typeof body.habilidadId === "string" ? body.habilidadId.trim() : body.habilidadId;

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

    if (!habilidad.claseId) {
      return NextResponse.json(
        { error: "Las habilidades antiguas sin profesión ya no están disponibles. Aprende habilidades de tu clase en la Escuela de Batalla." },
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
          edificios: true,
          personaje: {
            select: {
              id: true,
              profesionActivaId: true,
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

      const edificios = usuario.edificios && typeof usuario.edificios === "object"
        ? usuario.edificios as Record<string, unknown>
        : {};
      const nivelEscuela = typeof edificios.escuelaCombate === "number" ? edificios.escuelaCombate : 0;
      if (nivelEscuela < 1) {
        throw new Error("ESCUELA_NO_CONSTRUIDA");
      }

      const profesionActivaId = usuario.personaje.profesionActivaId || "novato";
      const habilidadesEnVenta = obtenerHabilidadesEnVenta(profesionActivaId);
      if (!habilidadesEnVenta.some((habilidadVenta) => habilidadVenta.id === habilidad.id)) {
        throw new Error("HABILIDAD_NO_EN_VENTA");
      }

      if (usuario.personaje.habilidades.length !== 0) {
        throw new Error("HABILIDAD_YA_APRENDIDA");
      }

      if (habilidad.claseId) {
        if (!puedeUsarHabilidadDeClase(profesionActivaId, habilidad.claseId)) {
          throw new Error("HABILIDAD_CLASE_INCOMPATIBLE");
        }

        const clasePropietariaId = habilidad.claseId;
        const progresoJob = await tx.progresoClase.findUnique({
          where: {
            personajeId_claseId: {
              personajeId: usuario.personaje.id,
              claseId: clasePropietariaId,
            },
          },
        });

        if (!progresoJob || !progresoJob.desbloqueada) {
          throw new Error("PROGRESO_JOB_NO_ENCONTRADO");
        }

        const requisitosAprendizaje = evaluarRequisitosAprendizaje(habilidad, progresoJob);
        if (!requisitosAprendizaje.cumpleNivelJob) {
          throw new Error("NIVEL_JOB_INSUFICIENTE");
        }

        const costePuntos = requisitosAprendizaje.costePuntosHabilidad;
        const puntosGastados = await tx.progresoClase.updateMany({
          where: {
            id: progresoJob.id,
            puntosHabilidadDisponibles: { gte: costePuntos },
          },
          data: {
            puntosHabilidadDisponibles: { decrement: costePuntos },
          },
        });

        if (puntosGastados.count !== 1) {
          throw new Error("PUNTOS_HABILIDAD_INSUFICIENTES");
        }
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

        case "ESCUELA_NO_CONSTRUIDA":
          return NextResponse.json(
            { error: "Necesitas construir la Escuela de Batalla para aprender habilidades." },
            { status: 403 }
          );

        case "PERSONAJE_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "El usuario no tiene personaje." },
            { status: 400 }
          );

        case "HABILIDAD_YA_APRENDIDA":
          return NextResponse.json(
            { error: "Ya has aprendido esta habilidad." },
            { status: 409 }
          );

        case "HABILIDAD_NO_EN_VENTA":
          return NextResponse.json(
            { error: "Esta habilidad no pertenece a tu profesión activa ni a sus antecesoras." },
            { status: 403 }
          );

        case "HABILIDAD_CLASE_INCOMPATIBLE":
          return NextResponse.json(
            { error: "Esta profesión no puede aprender esa habilidad." },
            { status: 403 }
          );

        case "PROGRESO_JOB_NO_ENCONTRADO":
          return NextResponse.json(
            { error: "No se encontró el progreso Job de tu profesión." },
            { status: 409 }
          );

        case "NIVEL_JOB_INSUFICIENTE":
          return NextResponse.json(
            { error: "Tu nivel Job todavía no cumple los requisitos de esta habilidad." },
            { status: 403 }
          );

        case "PUNTOS_HABILIDAD_INSUFICIENTES":
          return NextResponse.json(
            { error: "No tienes puntos de habilidad Job suficientes." },
            { status: 400 }
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

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "La operación ha entrado en conflicto con otro cambio. Inténtalo de nuevo." },
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
