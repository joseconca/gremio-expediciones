import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sincronizarRegeneracion } from "@/lib/regeneracion";

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json(
        { exito: false, mensaje: "Sesión requerida." },
        { status: 401 }
      );
    }

    const { mision, tiempoHoras } = await request.json();

    if (
      !mision ||
      typeof mision.lat !== "number" ||
      typeof mision.lng !== "number"
    ) {
      return NextResponse.json(
        { exito: false, mensaje: "Datos de la misión inválidos." },
        { status: 400 }
      );
    }

    if (typeof tiempoHoras !== "number" || tiempoHoras <= 0) {
      return NextResponse.json(
        { exito: false, mensaje: "Duración de expedición inválida." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: true,
        expedicionActiva: true,
      },
    });

    if (!usuario?.personaje) {
      return NextResponse.json(
        {
          exito: false,
          mensaje: "Necesitas reclutar un personaje primero.",
        },
        { status: 400 }
      );
    }

    if (usuario.expedicionActiva) {
      return NextResponse.json(
        {
          exito: false,
          mensaje: "Ya tienes una expedición activa.",
        },
        { status: 409 }
      );
    }

    usuario.personaje = await sincronizarRegeneracion(usuario.personaje);

    if (usuario.personaje.hpActual <= 0) {
      return NextResponse.json(
        {
          exito: false,
          mensaje: "Tu aventurero necesita curarse antes de partir.",
        },
        { status: 400 }
      );
    }

    const esComercio =
      typeof mision.tipo === "string" && mision.tipo === "comercio";

    const esElite = typeof mision.tipo === "string" && mision.tipo === "elite";

    const esAsedio =
      typeof mision.tipo === "string" && mision.tipo === "asedio";

    const diaActual = new Date().toISOString().slice(0, 10);

    // ============================================================
    // MISIÓN ÉLITE
    // ============================================================

    if (esElite) {
      if (
        typeof mision.id !== "string" ||
        !mision.id.startsWith(`elite-${diaActual}-`)
      ) {
        return NextResponse.json(
          {
            exito: false,
            mensaje: "La misión de élite ya no está disponible.",
          },
          { status: 400 }
        );
      }

      const ultimaElite = usuario.ultimaMisionElite?.toISOString().slice(0, 10);

      if (ultimaElite === diaActual) {
        return NextResponse.json(
          {
            exito: false,
            mensaje: "Ya has completado la misión de élite de hoy.",
          },
          { status: 409 }
        );
      }
    }

    // ============================================================
    // OBJETIVO
    // ============================================================

    let objetivoId: string | undefined;

    if (esComercio) {
      const edificiosOrigen = usuario.edificios as Record<
        string,
        unknown
      > | null;

      if (edificiosOrigen?.embajada !== 1 && edificiosOrigen?.embajada !== 2) {
        return NextResponse.json(
          {
            exito: false,
            mensaje: "Construye la Embajada para abrir rutas comerciales.",
          },
          { status: 403 }
        );
      }

      const idObjetivo =
        typeof mision.id === "string" && mision.id.startsWith("comercio-")
          ? mision.id.slice("comercio-".length)
          : "";

      const objetivo = idObjetivo
        ? await prisma.usuario.findUnique({
            where: { id: idObjetivo },
            select: {
              id: true,
              nombre: true,
              baseCoords: true,
              edificios: true,
            },
          })
        : null;

      const edificiosDestino = objetivo?.edificios as Record<
        string,
        unknown
      > | null;

      if (
        !objetivo ||
        !objetivo.baseCoords ||
        (edificiosDestino?.embajada !== 1 && edificiosDestino?.embajada !== 2)
      ) {
        return NextResponse.json(
          {
            exito: false,
            mensaje: "El gremio de destino ya no está disponible.",
          },
          { status: 404 }
        );
      }

      objetivoId = objetivo.id;
    }

    // ============================================================
    // ASEDIO
    // ============================================================

    if (esAsedio) {
      const edificiosOrigen = usuario.edificios as Record<
        string,
        unknown
      > | null;

      if (edificiosOrigen?.embajada !== 1 && edificiosOrigen?.embajada !== 2) {
        return NextResponse.json(
          {
            exito: false,
            mensaje: "Construye la Embajada para poder asediar.",
          },
          { status: 403 }
        );
      }

      const idObjetivo =
        typeof mision.id === "string" && mision.id.startsWith("asedio-")
          ? mision.id.slice("asedio-".length)
          : "";

      const objetivo = idObjetivo
        ? await prisma.usuario.findUnique({
            where: { id: idObjetivo },
            select: {
              id: true,
              nombre: true,
              baseCoords: true,
              edificios: true,
            },
          })
        : null;

      const edificiosDestino = objetivo?.edificios as Record<
        string,
        unknown
      > | null;

      if (
        !objetivo ||
        !objetivo.baseCoords ||
        (edificiosDestino?.embajada !== 1 && edificiosDestino?.embajada !== 2)
      ) {
        return NextResponse.json(
          {
            exito: false,
            mensaje: "El gremio de destino ya no está disponible.",
          },
          { status: 404 }
        );
      }

      // Evitar atacarse a uno mismo.
      if (objetivo.id === usuario.id) {
        return NextResponse.json(
          {
            exito: false,
            mensaje: "No puedes asediar tu propio gremio.",
          },
          { status: 400 }
        );
      }

      objetivoId = objetivo.id;
    }

    // ============================================================
    // TIPO DE EXPEDICIÓN
    // ============================================================

    const tipoExpedicion = esComercio
      ? "comercio"
      : esElite
      ? "elite"
      : esAsedio
      ? "asedio"
      : "normal";

    console.log(
      `${usuario.personaje.nombre} inicia (${tipoExpedicion}) por ${Math.round(
        tiempoHoras * 60
      )} minutos`
    );

    // ============================================================
    // CLIMA
    // ============================================================

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${mision.lat}` +
      `&longitude=${mision.lng}` +
      `&current_weather=true`;

    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error("Error al consultar Open-Meteo");
    }

    const weatherData = await weatherResponse.json();
    const weatherCode = weatherData.current_weather.weathercode;

    let multiplicadorTiempo = 1.0;
    let climaReporte = "Despejado / Buen tiempo";

    if (weatherCode >= 51 && weatherCode <= 67) {
      multiplicadorTiempo = 1.2;
      climaReporte = "Lluvia y barro en los caminos";
    } else if (weatherCode >= 71 && weatherCode <= 77) {
      multiplicadorTiempo = 1.5;
      climaReporte = "Fuertes nevadas";
    } else if (weatherCode >= 95) {
      multiplicadorTiempo = 1.8;
      climaReporte = "Tormenta eléctrica peligrosa";
    }

    // ============================================================
    // FECHAS
    // ============================================================

    const horasBase = tiempoHoras;
    const horasReales = horasBase * multiplicadorTiempo;

    const ahora = Date.now();
    const fechaSalida = new Date(ahora);

    const tiempoViajeMs = (horasReales * 60 * 60 * 1000) / 2;

    const fechaLlegada = new Date(ahora + tiempoViajeMs);

    // ============================================================
    // CREAR EXPEDICIÓN
    // ============================================================

    await prisma.$transaction(async (tx) => {
      await tx.expedicionActiva.create({
        data: {
          usuarioId: usuario.id,
          tipo: tipoExpedicion,
          objetivoId,
          enemigoId: esElite ? mision.enemigoId : undefined,
          fase: "en_viaje",
          misionId: String(mision.id),
          nombre: mision.nombre || "Expedición",
          recompensa: mision.recompensa,
          dificultad:
            typeof mision.dificultad === "number" ? mision.dificultad : 0,
          fechaLlegada,
          destinoCoords: {
            lat: mision.lat,
            lng: mision.lng,
          },
        },
      });

      await tx.personaje.update({
        where: {
          usuarioId: usuario.id,
        },
        data: {
          estado: "de_viaje",
        },
      });

      // ============================================================
      // ASEDIO: -5 DE AFINIDAD
      // ============================================================

      if (esAsedio && objetivoId) {
        const afinidad = await tx.afinidadComercial.findUnique({
          where: {
            jugador1Id_jugador2Id: {
              jugador1Id: usuario.id,
              jugador2Id: objetivoId,
            },
          },
        });

        if (afinidad) {
          await tx.afinidadComercial.update({
            where: {
              jugador1Id_jugador2Id: {
                jugador1Id: usuario.id,
                jugador2Id: objetivoId,
              },
            },
            data: {
              afinidad: Math.max(0, afinidad.afinidad - 5),
            },
          });
        }
      }
    });

    return NextResponse.json({
      exito: true,
      clima: climaReporte,
      horasReales: horasReales.toFixed(1),
      fechaLlegada: fechaLlegada.toISOString(),
      fechaSalida: fechaSalida.toISOString(),
    });
  } catch (error) {
    console.error("Error al planificar la expedición:", error);

    return NextResponse.json(
      {
        exito: false,
        mensaje: "Error al planificar la expedición.",
      },
      { status: 500 }
    );
  }
}
