import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import { nivelMaximoHabilidad } from "@/lib/progresion/niveles-habilidad";

export async function POST(request: Request) {
  try {
    const sesion = await getAuthenticatedUser();
    if (!sesion) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: "El cuerpo de la petición no contiene JSON válido." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof (body as Record<string, unknown>).habilidadId !== "string") {
      return NextResponse.json({ error: "La habilidad indicada no es válida." }, { status: 400 });
    }
    const habilidadId = ((body as Record<string, string>).habilidadId).trim();
    const definicion = obtenerHabilidadPorId(habilidadId);
    if (!definicion?.claseId) return NextResponse.json({ error: "La habilidad no existe o no pertenece a una profesión." }, { status: 404 });
    const clasePropietariaId = definicion.claseId;

    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id: sesion.id },
        select: {
          edificios: true,
          expedicionActiva: { select: { id: true } },
          personaje: {
            select: {
              id: true, estado: true, profesionActivaId: true,
              habilidades: { where: { habilidadId }, select: { id: true, nivel: true } },
            },
          },
        },
      });
      if (!usuario?.personaje) throw new Error("PERSONAJE_NO_ENCONTRADO");
      const edificios = usuario.edificios && typeof usuario.edificios === "object" ? usuario.edificios as Record<string, unknown> : {};
      if (typeof edificios.escuelaCombate !== "number" || edificios.escuelaCombate < 1) throw new Error("ESCUELA_NO_CONSTRUIDA");
      if (usuario.expedicionActiva || usuario.personaje.estado === "combatiendo") throw new Error("PROGRESO_BLOQUEADO");
      const profesionActiva = usuario.personaje.profesionActivaId || "novato";
      if (!puedeUsarHabilidadDeClase(profesionActiva, clasePropietariaId)) throw new Error("HABILIDAD_CLASE_INCOMPATIBLE");
      const aprendida = usuario.personaje.habilidades[0];
      if (!aprendida) throw new Error("HABILIDAD_NO_APRENDIDA");
      const maximo = nivelMaximoHabilidad(clasePropietariaId,definicion);
      if (aprendida.nivel >= maximo) throw new Error("NIVEL_MAXIMO");
      const progreso = await tx.progresoClase.findUnique({
        where: { personajeId_claseId: { personajeId: usuario.personaje.id, claseId: clasePropietariaId } },
      });
      if (!progreso?.desbloqueada) throw new Error("PROGRESO_JOB_NO_ENCONTRADO");
      const gastado = await tx.progresoClase.updateMany({
        where: { id: progreso.id, puntosHabilidadDisponibles: { gte: 1 } },
        data: { puntosHabilidadDisponibles: { decrement: 1 } },
      });
      if (gastado.count !== 1) throw new Error("PUNTOS_HABILIDAD_INSUFICIENTES");
      const actualizado = await tx.habilidadAprendida.updateMany({
        where: { id: aprendida.id, nivel: aprendida.nivel },
        data: { nivel: { increment: 1 } },
      });
      if (actualizado.count !== 1) throw new Error("HABILIDAD_MODIFICADA");
      return { nivel: aprendida.nivel + 1, nivelMaximo: maximo, puntosHabilidadDisponibles: progreso.puntosHabilidadDisponibles - 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ exito: true, ...resultado, mensaje: `${definicion.nombre} ha subido a nivel ${resultado.nivel}.` });
  } catch (error) {
    if (error instanceof Error) {
      const fallos: Record<string, { error: string; status: number }> = {
        PERSONAJE_NO_ENCONTRADO: { error: "No se encontró el personaje.", status: 404 },
        ESCUELA_NO_CONSTRUIDA: { error: "Necesitas construir la Escuela de Batalla.", status: 403 },
        PROGRESO_BLOQUEADO: { error: "No puedes modificar habilidades durante una expedición o combate.", status: 409 },
        HABILIDAD_CLASE_INCOMPATIBLE: { error: "Tu profesión no puede mejorar esa habilidad.", status: 403 },
        HABILIDAD_NO_APRENDIDA: { error: "Primero debes aprender esa habilidad.", status: 404 },
        NIVEL_MAXIMO: { error: "La habilidad ya está en su nivel máximo.", status: 409 },
        PROGRESO_JOB_NO_ENCONTRADO: { error: "No se encontró el progreso Job de la profesión propietaria.", status: 409 },
        PUNTOS_HABILIDAD_INSUFICIENTES: { error: "Necesitas un punto Job para mejorar la habilidad.", status: 400 },
        HABILIDAD_MODIFICADA: { error: "La habilidad cambió durante la operación; vuelve a intentarlo.", status: 409 },
      };
      const fallo = fallos[error.message];
      if (fallo) return NextResponse.json(fallo, { status: fallo.status });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "La operación entró en conflicto con otro cambio. Inténtalo de nuevo." }, { status: 409 });
    }
    console.error("Error al mejorar habilidad:", error);
    return NextResponse.json({ error: "No se pudo mejorar la habilidad." }, { status: 500 });
  }
}
