import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

if (!mision || typeof mision.lat !== 'number' || typeof mision.lng !== 'number') {
        return NextResponse.json(
        { exito: false, mensaje: 'Datos de la misión inválidos.' },
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
      include: { personaje: true, expedicionActiva: true },
    });
    if (!usuario?.personaje) {
      return NextResponse.json(
        { exito: false, mensaje: "Necesitas reclutar un personaje primero." },
        { status: 400 }
      );
    }
    if (usuario.expedicionActiva) {
      return NextResponse.json(
        { exito: false, mensaje: "Ya tienes una expedición activa." },
        { status: 409 }
      );
    }

    // Consultar el clima real en las coordenadas de la misión
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${mision.lat}&longitude=${mision.lng}&current_weather=true`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) throw new Error("Error al consultar Open-Meteo");
    
    const weatherData = await weatherResponse.json();
    const weatherCode = weatherData.current_weather.weathercode;

    // Sistema de Modificadores por Clima (WMO Weather interpretation codes)
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

    // Calcular la fecha y hora exacta de llegada
    const horasBase = tiempoHoras; 
    const horasReales = horasBase * multiplicadorTiempo;
    
    const ahora = Date.now();
    const fechaSalida = new Date(ahora);
    const tiempoViajeMs = horasReales * 60 * 60 * 1000;
    const fechaLlegada = new Date(ahora + tiempoViajeMs);

    await prisma.$transaction([
      prisma.expedicionActiva.create({
        data: {
          usuarioId: usuario.id,
          tipo: "expedicion",
          fase: "en_viaje",
          misionId: String(mision.id),
          nombre: mision.nombre || "Expedición",
          recompensa: typeof mision.recompensa === "number" ? mision.recompensa : 0,
          dificultad: typeof mision.dificultad === "number" ? mision.dificultad : 0,
          fechaLlegada,
          destinoCoords: { lat: mision.lat, lng: mision.lng },
        },
      }),
      prisma.personaje.update({
        where: { usuarioId: usuario.id },
        data: { estado: "de_viaje" },
      }),
    ]);

    return NextResponse.json({
      exito: true,
      clima: climaReporte,
      horasReales: horasReales.toFixed(1),
      fechaLlegada: fechaLlegada.toISOString(),
      fechaSalida: fechaSalida.toISOString(),
    });

  } catch {
    return NextResponse.json(
      { exito: false, mensaje: 'Error al planificar la expedición.' },
      { status: 500 }
    );
  }
}