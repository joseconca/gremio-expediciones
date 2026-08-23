import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { lat, lng } = await request.json();

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { esTierra: false, mensaje: "Coordenadas inválidas." },
        { status: 400 }
      );
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GremioExpedicionesApp/1.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { esTierra: false, mensaje: "Error al consultar el servicio de mapa." },
        { status: 500 }
      );
    }

    const data = await response.json();

    const esAgua =
      data.error ||
      !data.address ||
      (!data.address.country && !data.address.ocean);

    if (esAgua || data.address?.ocean) {
      return NextResponse.json({
        esTierra: false,
        mensaje:
          "🌊 La ubicación está en el mar. ¡Elige un lugar en tierra firme para tu base!",
      });
    }

    var region = "";
    if (data.address.town) {
      region += `${data.address.town}`;
      if (data.address.province) region += `, ${data.address.province}`;
    } else
      region =
        data.address.state + ", " + data.address.country || data.address.county || data.address.country;
    console.log(data.address);
    return NextResponse.json({
      esTierra: true,
      mensaje: `🏰 ¡Terreno firme localizado en ${region}! Base apta para ser construida.`,
      ubicacion: data.display_name,
    });
  } catch (error) {
    return NextResponse.json(
      { esTierra: false, mensaje: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
