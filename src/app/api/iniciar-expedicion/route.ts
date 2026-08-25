import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { mision, tiempoHoras } = await request.json();

if (!mision || typeof mision.lat !== 'number' || typeof mision.lng !== 'number') {
        return NextResponse.json(
        { exito: false, mensaje: 'Datos de la misión inválidos.' },
        { status: 400 }
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
    const tiempoViajeMs = horasReales * 60 * 60 * 1000;
    const fechaLlegada = new Date(ahora + tiempoViajeMs);

    return NextResponse.json({
      exito: true,
      clima: climaReporte,
      horasReales: horasReales.toFixed(1),
      fechaLlegada: fechaLlegada.toISOString(),
    });

  } catch (error) {
    return NextResponse.json(
      { exito: false, mensaje: 'Error al planificar la expedición.' },
      { status: 500 }
    );
  }
}