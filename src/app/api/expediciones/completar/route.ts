import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularDistanciaKm } from "@/lib/utils";
import { resolverComercio } from "@/lib/expediciones/comercio";

export async function POST() {
  try {
    const usuarioSesion = await getAuthenticatedUser();
    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: true,
        expedicionActiva: {
          include: {
            combateActivo: true,
          },
        },
      },
    });

    const expedicion = usuario?.expedicionActiva;

    if (!usuario?.personaje || !expedicion) {
      return NextResponse.json(
        { error: "No hay una expedición activa." },
        { status: 400 }
      );
    }

    // ============================================================
    // COMPROBAR QUE LA EXPEDICIÓN HAYA LLEGADO
    // ============================================================
    if (expedicion.fechaLlegada > new Date()) {
      return NextResponse.json(
        { error: "La expedición todavía está en curso." },
        { status: 409 }
      );
    }

    // ============================================================
    // RECIBIR AL AVENTURERO AL REGRESAR
    // ============================================================
    if (expedicion.fase === "regresando") {
      const oroGuardado = Math.max(0, expedicion.recompensa);
      const resultadoFinal = expedicion.resultadoFinal;
      if (!resultadoFinal) {
        return NextResponse.json(
          {
            error: "La expedición no tiene un resultado final registrado.",
          },
          { status: 409 }
        );
      }
      const exito = resultadoFinal === "exito";

      const combate = expedicion.combateActivo;

      let logRegreso: string[];

      let afinidadFinal: number | undefined;

      if (resultadoFinal === "exito") {
        logRegreso = [
          `🏠 ${usuario.personaje.nombre} regresa al gremio con el botín asegurado.`,
        ];

        if (oroGuardado > 0) {
          logRegreso.push(`💰 Recibes ${oroGuardado} 🪙 por la expedición.`);
        }
      } else if (resultadoFinal === "derrota") {
        logRegreso = [
          `💀 ${usuario.personaje.nombre} regresa al gremio tras ser derrotado.`,
        ];
      } else {
        logRegreso = [
          `↩️ ${usuario.personaje.nombre} regresa al gremio tras cancelar la expedición.`,
        ];
      }

      const actualizado = await prisma.$transaction(async (tx) => {
        await tx.expedicionActiva.delete({
          where: { id: expedicion.id },
        });

        await tx.personaje.update({
          where: { usuarioId: usuario.id },
          data: {
            estado: usuario.personaje!.hpActual > 0 ? "ocioso" : "descansando",
          },
        });

        if (expedicion.tipo === "comercio" && expedicion.objetivoId) {
          await tx.usuario.update({
            where: { id: expedicion.objetivoId },
            data: {
              oro: {
                increment: Math.floor(oroGuardado * 0.25),
              },
            },
          });

          const relacion = await tx.afinidadComercial.upsert({
            where: {
              jugador1Id_jugador2Id: {
                jugador1Id: usuario.id,
                jugador2Id: expedicion.objetivoId,
              },
            },
            create: {
              jugador1Id: usuario.id,
              jugador2Id: expedicion.objetivoId,
              intercambios: 1,
              afinidad: 1,
            },
            update: {
              intercambios: { increment: 1 },
              afinidad: { increment: 1 },
            },
          });
          afinidadFinal = relacion.afinidad;
        }

        return tx.usuario.update({
          where: { id: usuario.id },
          data: {
            oro: {
              increment: oroGuardado,
            },
          },
          include: {
            personaje: true,
            expedicionActiva: true,
          },
        });
      });

      const datosRegreso = Object.fromEntries(
        Object.entries(actualizado).filter(([clave]) => clave !== "password")
      );

      const logCombate =
        combate && Array.isArray(combate.log) ? (combate.log as string[]) : [];

      let reporte;

      if (expedicion.tipo === "comercio") {
        reporte = {
          exito,
          resultadoFinal,
          hpPerdido: expedicion.hpPerdido,
          oroGanado: oroGuardado,
          experienciaGanada: expedicion.experienciaGanada,
          tipo: "comercio" as const,
          afinidad: afinidadFinal ?? 0,
          logCombate: logRegreso,
        };
      } else if (resultadoFinal === "cancelada") {
        reporte = {
          exito,
          resultadoFinal,
          hpPerdido: expedicion.hpPerdido,
          oroGanado: oroGuardado,
          experienciaGanada: expedicion.experienciaGanada,
          tipo: "combate" as const,
          logCombate: logRegreso,
        };
      } else {
        reporte = {
          exito,
          resultadoFinal,
          hpPerdido: expedicion.hpPerdido,
          oroGanado: oroGuardado,
          experienciaGanada: expedicion.experienciaGanada,
          tipo: "combate" as const,
          enemigo: combate?.enemigoNombre ?? "Enemigo",
          enemigoId: combate?.enemigoId ?? "goblin",
          rondas: combate?.ronda ?? 0,
          poderHeroe: combate
            ? combate.jugadorAtaque + combate.jugadorDefensa
            : 0,
          logCombate: [...logCombate, ...logRegreso],
        };
      }

      return NextResponse.json({
        resultado: reporte,
        usuario: datosRegreso,
      });
    }

    // ============================================================
    // EL COMBATE POR SU API
    // ============================================================
    if (expedicion.fase === "combatiendo") {
      return NextResponse.json(
        {
          error: "La expedición se encuentra en combate.",
          combate: expedicion.combateActivo,
        },
        { status: 409 }
      );
    }

    if (expedicion.tipo !== "comercio") {
      return NextResponse.json(
        {
          error:
            "Las expediciones de combate deben iniciarse mediante el sistema de combate.",
        },
        { status: 409 }
      );
    }

    if (!expedicion.objetivoId) {
      return NextResponse.json(
        {
          error: "La expedición comercial no tiene un gremio de destino.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // OBTENER GREMIO DE DESTINO
    // ============================================================
    const objetivo = await prisma.usuario.findUnique({
      where: {
        id: expedicion.objetivoId,
      },
      select: {
        id: true,
        nombre: true,
        edificios: true,
      },
    });

    if (!objetivo) {
      return NextResponse.json(
        {
          error: "El gremio de destino ya no existe.",
        },
        { status: 404 }
      );
    }

    // ============================================================
    // VALIDAR COORDENADAS
    // ============================================================
    const origenCoords = usuario.baseCoords as {
      lat?: unknown;
      lng?: unknown;
    } | null;
    const destinoCoords = expedicion.destinoCoords as {
      lat?: unknown;
      lng?: unknown;
    };
    if (
      typeof origenCoords?.lat !== "number" ||
      typeof origenCoords.lng !== "number" ||
      typeof destinoCoords.lat !== "number" ||
      typeof destinoCoords.lng !== "number"
    ) {
      return NextResponse.json(
        { error: "La ruta comercial no tiene coordenadas válidas." },
        { status: 400 }
      );
    }

    // ============================================================
    // OBTENER AFINIDAD
    // ============================================================
    const afinidad = await prisma.afinidadComercial.findUnique({
      where: {
        jugador1Id_jugador2Id: {
          jugador1Id: usuario.id,
          jugador2Id: objetivo.id,
        },
      },
    });

    const afinidadActual = afinidad?.afinidad ?? 0;

    // ============================================================
    // NIVEL DEL MERCADO
    // ============================================================
    const mercado = objetivo.edificios as Record<string, unknown> | null;
    const nivelMercado =
      typeof mercado?.mercado === "number" ? mercado.mercado : 0;

    // ============================================================
    // RESOLVER COMERCIO
    // ============================================================

    const distanciaKm = calcularDistanciaKm(
      origenCoords.lat,
      origenCoords.lng,
      destinoCoords.lat,
      destinoCoords.lng
    );
    const resultado = resolverComercio(
      usuario.personaje,
      distanciaKm,
      nivelMercado,
      afinidadActual,
      objetivo.nombre
    );

    const oroGanado =
      typeof resultado.oroGanado === "number" &&
      Number.isFinite(resultado.oroGanado)
        ? Math.max(0, resultado.oroGanado)
        : 0;

    // ============================================================
    // CALCULAR REGRESO
    // ============================================================
    const duracionIda = Math.max(
      60_000,
      expedicion.fechaLlegada.getTime() - expedicion.fechaSalida.getTime()
    );
    // El regreso arranca en el momento real de llegada, no cuando el jugador pulsa "resolver".
    const fechaSalidaRegreso = expedicion.fechaLlegada;
    const fechaLlegadaRegreso = new Date(
      fechaSalidaRegreso.getTime() + duracionIda
    );

    // ============================================================
    // GUARDAR RESULTADO Y COMENZAR REGRESO
    // ============================================================
    const actualizado = await prisma.$transaction(async (tx) => {
      await tx.personaje.update({
        where: {
          usuarioId: usuario.id,
        },
        data: {
          hpActual: Math.max(
            1,
            usuario.personaje!.hpActual - resultado.hpPerdido
          ),
          estado: "de_viaje",
        },
      });

      await tx.expedicionActiva.update({
        where: { id: expedicion.id },
        data: {
          fase: "regresando",
          fechaSalida: fechaSalidaRegreso,
          fechaLlegada: fechaLlegadaRegreso,
          recompensa: oroGanado,
          resultadoFinal: resultado.exito ? "exito" : "derrota",
          hpPerdido: resultado.hpPerdido,
          experienciaGanada: resultado.experienciaGanada,
        },
      });

      await tx.registroAccion.create({
        data: {
          usuarioId: usuario.id,
          tipo: "EXPEDICION_TERMINADA",
          detalle: `${expedicion.nombre}: ${
            resultado.exito ? "éxito" : "fracaso"
          }`,
        },
      });

      return tx.usuario.update({
        where: { id: usuario.id },
        data: { oro: { increment: 0 } },
        include: { personaje: true, expedicionActiva: true },
      });
    });

    const datos = Object.fromEntries(
      Object.entries(actualizado).filter(([clave]) => clave !== "password")
    );

    return NextResponse.json({
      resultado: { ...resultado, oroGanado, afinidad },
      usuario: datos,
    });
  } catch (error) {
    console.error("Error al completar expedición:", error);
    return NextResponse.json(
      { error: "No se pudo completar la expedición." },
      { status: 500 }
    );
  }
}
