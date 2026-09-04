import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularDistanciaKm } from "@/lib/utils";
import { resolverComercio, resolverExpedicion } from "@/lib/resolucionCombate";

export async function POST() {
  try {
    const usuarioSesion = await getAuthenticatedUser();
    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: { personaje: true, expedicionActiva: true },
    });
    const expedicion = usuario?.expedicionActiva;
    if (!usuario?.personaje || !expedicion) {
      return NextResponse.json({ error: "No hay una expedición activa." }, { status: 400 });
    }
    if (expedicion.fechaLlegada > new Date()) {
      return NextResponse.json({ error: "La expedición todavía está en curso." }, { status: 409 });
    }

    let resultado;
    let oroReceptor = 0;
    let objetivoId: string | null = null;
    if (expedicion.tipo === "comercio" && expedicion.objetivoId) {
      const objetivo = await prisma.usuario.findUnique({
        where: { id: expedicion.objetivoId },
        select: { id: true, nombre: true, edificios: true },
      });
      if (!objetivo) return NextResponse.json({ error: "El gremio de destino ya no existe." }, { status: 404 });
      const origenCoords = usuario.baseCoords as { lat?: unknown; lng?: unknown } | null;
      const destinoCoords = expedicion.destinoCoords as { lat?: unknown; lng?: unknown };
      if (typeof origenCoords?.lat !== "number" || typeof origenCoords.lng !== "number" || typeof destinoCoords.lat !== "number" || typeof destinoCoords.lng !== "number") {
        return NextResponse.json({ error: "La ruta comercial no tiene coordenadas válidas." }, { status: 400 });
      }
      const afinidad = await prisma.afinidadComercial.findUnique({
        where: { jugador1Id_jugador2Id: { jugador1Id: usuario.id, jugador2Id: objetivo.id } },
      });
      const mercado = objetivo.edificios as Record<string, unknown> | null;
      const nivelMercado = typeof mercado?.mercado === "number" ? mercado.mercado : 0;
      resultado = resolverComercio(
        usuario.personaje,
        calcularDistanciaKm(origenCoords.lat, origenCoords.lng, destinoCoords.lat, destinoCoords.lng),
        nivelMercado,
        afinidad?.intercambios || 0,
        objetivo.nombre,
      );
      oroReceptor = resultado.exito ? Math.floor(resultado.oroGanado * 0.25) : 0;
      objetivoId = objetivo.id;
    } else {
      resultado = resolverExpedicion(usuario.personaje, {
        id: expedicion.misionId,
        nombre: expedicion.nombre,
        dificultad: expedicion.dificultad,
        recompensa: expedicion.recompensa,
      });
    }
    const oroGanado = typeof resultado.oroGanado === "number" && Number.isFinite(resultado.oroGanado)
      ? Math.max(0, resultado.oroGanado)
      : 0;
    const experienciaGanada = expedicion.tipo === "comercio"
      ? 0
      : resultado.experienciaGanada;
    const experienciaActual = usuario.personaje.experiencia || 0;
    const nivelActual = usuario.personaje.nivel || 1;
    const experienciaTotal = experienciaActual + experienciaGanada;
    const experienciaNecesaria = nivelActual * 100;
    const subeNivel = experienciaTotal >= experienciaNecesaria;
    const nuevoNivel = nivelActual + (subeNivel ? 1 : 0);
    const experienciaNueva = subeNivel ? experienciaTotal - experienciaNecesaria : experienciaTotal;
    const hpActual = Math.max(0, usuario.personaje.hpActual - resultado.hpPerdido);
    const actualizado = await prisma.$transaction(async (tx) => {
      await tx.personaje.update({
        where: { usuarioId: usuario.id },
        data: {
          hpActual,
          estado: hpActual > 0 ? "ocioso" : "descansando",
          nivel: nuevoNivel,
          experiencia: experienciaNueva,
          ...(subeNivel ? { hpMaximo: { increment: 10 }, ataque: { increment: 1 }, defensa: { increment: 1 } } : {}),
        },
      });
      await tx.expedicionActiva.delete({ where: { id: expedicion.id } });
      if (objetivoId && resultado.exito) {
        await tx.usuario.update({ where: { id: objetivoId }, data: { oro: { increment: oroReceptor } } });
        await tx.afinidadComercial.upsert({
          where: { jugador1Id_jugador2Id: { jugador1Id: usuario.id, jugador2Id: objetivoId } },
          create: { jugador1Id: usuario.id, jugador2Id: objetivoId, intercambios: 1, afinidad: 1 },
          update: { intercambios: { increment: 1 }, afinidad: { increment: 1 } },
        });
      }
      await tx.registroAccion.create({
        data: {
          usuarioId: usuario.id,
          tipo: "EXPEDICION_TERMINADA",
          detalle: `${expedicion.nombre}: ${resultado.exito ? "éxito" : "fracaso"}`,
        },
      });
      return tx.usuario.update({
        where: { id: usuario.id },
        data: { oro: { increment: oroGanado } },
        include: { personaje: true, expedicionActiva: true },
      });
    });

    const datos = Object.fromEntries(
      Object.entries(actualizado).filter(([clave]) => clave !== "password")
    );
    return NextResponse.json({
      resultado: { ...resultado, experienciaGanada },
      usuario: datos,
    });
  } catch (error) {
    console.error("Error al completar expedición:", error);
    return NextResponse.json({ error: "No se pudo completar la expedición." }, { status: 500 });
  }
}