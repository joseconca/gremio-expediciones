import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sincronizarRegeneracion } from "@/lib/regeneracion";
import {
  calcularEstadisticasPersonaje,
  calcularModificadoresEquipo,
} from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { calcularDistanciaKm } from "@/lib/utils";
import { calcularOroBaseComercio } from "@/lib/expediciones/comercio";
import { generarMisionesDisponibles } from "@/lib/generadorMisiones";
import { obtenerDefinicionClase } from "@/lib/progresion/clases";
import type { DefinicionMision, RecompensaMision } from "@/lib/tiposJuego";

interface Coordenadas {
  lat: number;
  lng: number;
}

function leerCoordenadas(valor: unknown): Coordenadas | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return null;
  }

  const registro = valor as Record<string, unknown>;
  const { lat, lng } = registro;

  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

function leerEdificios(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return {};
  }

  return valor as Record<string, unknown>;
}

function tieneEmbajada(valor: unknown): boolean {
  const nivel = leerEdificios(valor).embajada;
  return nivel === 1 || nivel === 2;
}

function respuestaError(mensaje: string, status: number) {
  return NextResponse.json({ exito: false, mensaje }, { status });
}

function esErrorPrisma(error: unknown, codigo: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === codigo
  );
}

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return respuestaError("Sesión requerida.", 401);
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respuestaError(
        "La petición debe contener un identificador de misión válido.",
        400
      );
    }

    const misionId = (body as Record<string, unknown>).misionId;
    if (
      typeof misionId !== "string" ||
      misionId.trim().length === 0 ||
      misionId.length > 200
    ) {
      return respuestaError("Debes indicar una misión válida.", 400);
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: {
          include: {
            habilidades: true,
            inventario: { include: { objetos: true } },
            equipoEquipado: {
              include: { arma: true, armadura: true, accesorio: true },
            },
          },
        },
        expedicionActiva: true,
      },
    });

    if (!usuario || !usuario.personaje) {
      return respuestaError("Necesitas reclutar un personaje primero.", 400);
    }

    if (usuario.expedicionActiva) {
      return respuestaError("Ya tienes una expedición activa.", 409);
    }

    const coordenadasOrigen = leerCoordenadas(usuario.baseCoords);
    if (!coordenadasOrigen) {
      return respuestaError(
        "Debes configurar una base con coordenadas válidas antes de partir.",
        400
      );
    }

    const equipo = obtenerEquipoDesdePersonaje(usuario.personaje);
    const modificadoresEquipo = calcularModificadoresEquipo(
      equipo,
      usuario.personaje!.profesionActivaId
    );
    const personaje = await sincronizarRegeneracion(
      usuario.personaje,
      modificadoresEquipo
    );

    if (personaje.hpActual <= 0) {
      return respuestaError(
        "Tu aventurero necesita curarse antes de partir.",
        400
      );
    }

    const ahora = new Date();
    let mision: DefinicionMision | null = null;
    let objetivoId: string | undefined;

    // Las misiones normales y de élite se validan contra el catálogo
    // generado desde el estado persistido del jugador.
    if (misionId.startsWith("mision-") || misionId.startsWith("elite-")) {
      const misionesDisponibles = generarMisionesDisponibles({
        baseLat: coordenadasOrigen.lat,
        baseLng: coordenadasOrigen.lng,
        nivelPersonaje: personaje.nivel,
        ultimaMisionElite: usuario.ultimaMisionElite,
        ahora,
      });

      mision =
        misionesDisponibles.find((candidata) => candidata.id === misionId) ??
        null;

      if (!mision) {
        return respuestaError(
          "La misión ya no está disponible. Actualiza el mapa e inténtalo de nuevo.",
          409
        );
      }
    } else if (
      misionId.startsWith("comercio-") ||
      misionId.startsWith("asedio-")
    ) {
      const esComercio = misionId.startsWith("comercio-");
      const prefijo = esComercio ? "comercio-" : "asedio-";
      const idObjetivo = misionId.slice(prefijo.length);

      if (!idObjetivo || idObjetivo === usuario.id) {
        return respuestaError("El gremio de destino no es válido.", 400);
      }

      const objetivo = await prisma.usuario.findUnique({
        where: { id: idObjetivo },
        select: {
          id: true,
          nombre: true,
          baseCoords: true,
          edificios: true,
          personaje: { select: { nivel: true } },
        },
      });

      const coordenadasDestino = leerCoordenadas(objetivo?.baseCoords);
      if (
        !objetivo ||
        !coordenadasDestino ||
        !tieneEmbajada(objetivo.edificios)
      ) {
        return respuestaError(
          "El gremio de destino ya no está disponible.",
          404
        );
      }

      if (!tieneEmbajada(usuario.edificios)) {
        return respuestaError(
          esComercio
            ? "Construye la Embajada para abrir rutas comerciales."
            : "Construye la Embajada para poder asediar.",
          403
        );
      }

      objetivoId = objetivo.id;
      const distanciaDestino = calcularDistanciaKm(
        coordenadasOrigen.lat,
        coordenadasOrigen.lng,
        coordenadasDestino.lat,
        coordenadasDestino.lng
      );

      if (!Number.isFinite(distanciaDestino) || distanciaDestino < 0) {
        return respuestaError(
          "La distancia de la expedición no es válida.",
          400
        );
      }

      const recompensa: RecompensaMision = {
        oro: esComercio ? calcularOroBaseComercio(distanciaDestino) : 0,
        madera: 0,
        piedra: 0,
        metal: 0,
      };

      mision = {
        id: misionId,
        tipo: esComercio ? "comercio" : "asedio",
        nombre: esComercio
          ? `Comerciar: ${objetivo.nombre}`
          : `Asediar: ${objetivo.nombre}`,
        descripcion: esComercio
          ? `Envía a tu personaje a intercambiar bienes con el gremio de ${objetivo.nombre}.`
          : `Envía a tu personaje a atacar la base del gremio de ${objetivo.nombre}.`,
        dificultad: esComercio
          ? 0
          : Math.max(
              0,
              (objetivo.personaje?.nivel ?? 1) + 1 - personaje.nivel
            ),
        recompensa,
        duracionObjetivoHoras: 0,
        lat: coordenadasDestino.lat,
        lng: coordenadasDestino.lng,
        objetivoId: objetivo.id,
      };
    } else {
      return respuestaError("El identificador de misión no es válido.", 400);
    }

    if (!mision) {
      return respuestaError("No se pudo validar la misión.", 400);
    }

    const esElite = mision.tipo === "elite";
    const esAsedio = mision.tipo === "asedio";
    const tipoExpedicion = mision.tipo;

    if (
      tipoExpedicion !== "normal" &&
      tipoExpedicion !== "elite" &&
      tipoExpedicion !== "comercio" &&
      tipoExpedicion !== "asedio"
    ) {
      return respuestaError("Tipo de expedición no válido.", 400);
    }

    if (esElite && !mision.enemigoId) {
      return respuestaError("La misión de élite no tiene un jefe válido.", 409);
    }

    const estadisticas = calcularEstadisticasPersonaje(
      personaje,
      personaje.habilidades.map((habilidad) => habilidad.habilidadId),
      modificadoresEquipo
    );

    let velocidadKmh = 6 + (estadisticas.total.velocidad - 1) / 15;
    const profesionActivaId = personaje.profesionActivaId || "novato";
    const bonusVelocidadExpedicion =
      obtenerDefinicionClase(profesionActivaId)?.bonusVelocidadExpedicion ??
      (profesionActivaId === "novato" && personaje.clase === "Explorador" ? 0.25 : 0);
    velocidadKmh *= 1 + bonusVelocidadExpedicion;
    velocidadKmh = Math.max(1, velocidadKmh);

    const distanciaKm = calcularDistanciaKm(
      coordenadasOrigen.lat,
      coordenadasOrigen.lng,
      mision.lat,
      mision.lng
    );

    if (!Number.isFinite(distanciaKm) || distanciaKm < 0) {
      return respuestaError("La distancia de la expedición no es válida.", 400);
    }

    const tiempoHoras = Math.max(1 / 60, distanciaKm / velocidadKmh);

    let multiplicadorTiempo = 1;
    let climaReporte = "Despejado / Buen tiempo";

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${mision.lat}` +
      `&longitude=${mision.lng}&current_weather=true`;

    try {
      const weatherResponse = await fetch(weatherUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });

      if (weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        const weatherCode = weatherData?.current_weather?.weathercode;

        if (typeof weatherCode === "number") {
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
        }
      } else {
        climaReporte = "No se pudo consultar el clima";
      }
    } catch {
      // La disponibilidad del proveedor meteorológico no debe bloquear el juego.
      climaReporte = "No se pudo consultar el clima";
    }

    const horasReales = tiempoHoras * multiplicadorTiempo;
    const fechaSalida = new Date();
    const fechaLlegada = new Date(
      fechaSalida.getTime() + (horasReales * 60 * 60 * 1000) / 2
    );

    await prisma.$transaction(async (tx) => {
      const expedicionExistente = await tx.expedicionActiva.findUnique({
        where: { usuarioId: usuario.id },
        select: { id: true },
      });

      if (expedicionExistente) {
        throw new Error("EXPEDICION_ACTIVA_EXISTENTE");
      }

      const personajeActual = await tx.personaje.findUnique({
        where: { usuarioId: usuario.id },
        select: { nivel: true, hpActual: true },
      });

      if (!personajeActual) {
        throw new Error("PERSONAJE_NO_ENCONTRADO");
      }
      if (personajeActual.hpActual <= 0) {
        throw new Error("SIN_VIDA");
      }
      if (personajeActual.nivel !== personaje.nivel) {
        throw new Error("PERSONAJE_CAMBIO");
      }

      if (esElite) {
        const usuarioActual = await tx.usuario.findUnique({
          where: { id: usuario.id },
          select: { ultimaMisionElite: true },
        });
        const ultimaEliteActual = usuarioActual?.ultimaMisionElite
          ?.toISOString()
          .slice(0, 10);

        if (ultimaEliteActual === ahora.toISOString().slice(0, 10)) {
          throw new Error("ELITE_YA_COMPLETADA");
        }
      }

      const recompensaJson: Prisma.InputJsonObject = {
        oro: mision.recompensa.oro,
        madera: mision.recompensa.madera,
        piedra: mision.recompensa.piedra,
        metal: mision.recompensa.metal,
        ...(mision.recompensa.objetos
          ? {
              objetos: mision.recompensa.objetos.map((objeto) => ({
                objetoId: objeto.objetoId,
                cantidad: objeto.cantidad,
              })),
            }
          : {}),
      };

      await tx.expedicionActiva.create({
        data: {
          usuarioId: usuario.id,
          tipo: tipoExpedicion,
          objetivoId,
          enemigoId: esElite ? mision.enemigoId : undefined,
          fase: "en_viaje",
          misionId: mision.id,
          nombre: mision.nombre,
          recompensa: recompensaJson,
          dificultad: mision.dificultad,
          fechaSalida,
          fechaLlegada,
          destinoCoords: {
            lat: mision.lat,
            lng: mision.lng,
          },
        },
      });

      await tx.personaje.update({
        where: { usuarioId: usuario.id },
        data: { estado: "de_viaje" },
      });

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
            data: { afinidad: Math.max(0, afinidad.afinidad - 5) },
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
    if (error instanceof Error) {
      if (
        error.message === "EXPEDICION_ACTIVA_EXISTENTE" ||
        error.message === "ELITE_YA_COMPLETADA"
      ) {
        return respuestaError(
          error.message === "ELITE_YA_COMPLETADA"
            ? "Ya has completado la misión de élite de hoy."
            : "Ya tienes una expedición activa.",
          409
        );
      }
      if (error.message === "PERSONAJE_NO_ENCONTRADO") {
        return respuestaError("No se encontró el personaje.", 404);
      }
      if (error.message === "SIN_VIDA") {
        return respuestaError(
          "Tu aventurero necesita curarse antes de partir.",
          400
        );
      }
      if (error.message === "PERSONAJE_CAMBIO") {
        return respuestaError(
          "El personaje ha cambiado mientras se iniciaba la expedición. Actualiza el estado e inténtalo de nuevo.",
          409
        );
      }
    }

    if (esErrorPrisma(error, "P2002")) {
      return respuestaError("Ya tienes una expedición activa.", 409);
    }

    console.error("Error al planificar la expedición:", error);
    return respuestaError("No se pudo planificar la expedición.", 500);
  }
}
