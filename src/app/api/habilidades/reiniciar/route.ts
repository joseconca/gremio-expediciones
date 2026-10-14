import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { HABILIDADES } from "@/lib/habilidades";
import { CLASES } from "@/lib/progresion/clases";
import { costeReinicioHabilidades } from "@/lib/progresion/niveles-habilidad";

export async function POST() {
  try {
    const sesion = await getAuthenticatedUser();
    if (!sesion) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

    const resultado = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id: sesion.id },
        select: {
          id: true, oro: true, edificios: true,
          expedicionActiva: { select: { id: true } },
          personaje: {
            select: {
              id: true, estado: true, profesionActivaId: true,
              habilidades: { select: { id: true, habilidadId: true, nivel: true } },
            },
          },
        },
      });
      if (!usuario?.personaje) throw new Error("PERSONAJE_NO_ENCONTRADO");
      const edificios = usuario.edificios && typeof usuario.edificios === "object" ? usuario.edificios as Record<string, unknown> : {};
      if (typeof edificios.escuelaCombate !== "number" || edificios.escuelaCombate < 1) throw new Error("ESCUELA_NO_CONSTRUIDA");
      if (usuario.expedicionActiva || usuario.personaje.estado === "combatiendo") throw new Error("PROGRESO_BLOQUEADO");

      const claseId = usuario.personaje.profesionActivaId || "novato";
      const clase = CLASES[claseId];
      if (!clase) throw new Error("CLASE_NO_VALIDA");
      const progreso = await tx.progresoClase.findUnique({
        where: { personajeId_claseId: { personajeId: usuario.personaje.id, claseId } },
      });
      if (!progreso?.desbloqueada) throw new Error("PROGRESO_JOB_NO_ENCONTRADO");

      const habilidadesClase = HABILIDADES.filter((habilidad) => habilidad.claseId === claseId);
      const idsHabilidadesClase = new Set(habilidadesClase.map((habilidad) => habilidad.id));
      const aprendidas = usuario.personaje.habilidades.filter((habilidad) => idsHabilidadesClase.has(habilidad.habilidadId));
      if (aprendidas.length === 0) throw new Error("SIN_HABILIDADES_PROPIAS");

      const coste = costeReinicioHabilidades(progreso.nivelJob);
      const pago = await tx.usuario.updateMany({
        where: { id: usuario.id, oro: { gte: coste } },
        data: { oro: { decrement: coste } },
      });
      if (pago.count !== 1) throw new Error("ORO_INSUFICIENTE");

      const puntosDevueltos = aprendidas.reduce((total, aprendida) => {
        const definicion = HABILIDADES.find((habilidad) => habilidad.id === aprendida.habilidadId);
        const costeInicial = Math.max(1, Math.floor(definicion?.costePuntosHabilidad ?? 1));
        return total + costeInicial + Math.max(0, aprendida.nivel - 1);
      }, 0);
      await tx.habilidadAprendida.deleteMany({
        where: { personajeId: usuario.personaje.id, habilidadId: { in: [...idsHabilidadesClase] } },
      });
      await tx.progresoClase.update({
        where: { id: progreso.id },
        data: { puntosHabilidadDisponibles: { increment: puntosDevueltos } },
      });
      return { coste, puntosDevueltos, nivelJob: progreso.nivelJob, oroRestante: usuario.oro - coste, claseNombre: clase.nombre };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true, ...resultado,
      mensaje: `Has reiniciado las habilidades de ${resultado.claseNombre}. Se devuelven ${resultado.puntosDevueltos} puntos Job; tu nivel Job no cambia.`,
    });
  } catch (error) {
    if (error instanceof Error) {
      const fallos: Record<string, { error: string; status: number }> = {
        PERSONAJE_NO_ENCONTRADO: { error: "No se encontró el personaje.", status: 404 },
        ESCUELA_NO_CONSTRUIDA: { error: "Necesitas construir la Escuela de Batalla.", status: 403 },
        PROGRESO_BLOQUEADO: { error: "No puedes reiniciar habilidades durante una expedición o combate.", status: 409 },
        CLASE_NO_VALIDA: { error: "La profesión activa no es válida.", status: 400 },
        PROGRESO_JOB_NO_ENCONTRADO: { error: "No se encontró el progreso Job de la profesión activa.", status: 409 },
        SIN_HABILIDADES_PROPIAS: { error: "No tienes habilidades propias de esta profesión para reiniciar.", status: 400 },
        ORO_INSUFICIENTE: { error: "No tienes suficiente oro para reiniciar las habilidades.", status: 400 },
      };
      const fallo = fallos[error.message];
      if (fallo) return NextResponse.json(fallo, { status: fallo.status });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "La operación entró en conflicto con otro cambio. Inténtalo de nuevo." }, { status: 409 });
    }
    console.error("Error al reiniciar habilidades:", error);
    return NextResponse.json({ error: "No se pudieron reiniciar las habilidades." }, { status: 500 });
  }
}
