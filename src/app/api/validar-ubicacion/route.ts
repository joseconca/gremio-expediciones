import { NextResponse } from "next/server";


function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

//Simular de bbdd
const basesExistentes = [
  { id: 1, nombre: "Gremio de Madrid", lat: 40.4168, lng: -3.7038 },
  { id: 2, nombre: "Gremio de Barcelona", lat: 41.3851, lng: 2.1734 }
];

export async function POST(request: Request) {
  try {
    const { lat, lng } = await request.json();

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({esValido: false, mensaje: "Coordenadas inválidas." }, { status: 400 });
    }

    for (const base of basesExistentes) {
      const distancia = calcularDistanciaKm(lat, lng, base.lat, base.lng);
      
      if (distancia < 5) {
        return NextResponse.json({esValido: false, mensaje: `Demasiado cerca. A ${distancia.toFixed(1)} km de "${base.nombre}".`});
      }
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;

    const response = await fetch(url, {
      headers: { "User-Agent": "GremioExpedicionesApp/1.0" },
    });

    if (!response.ok) throw new Error("Error en Nominatim");

    const data = await response.json();

    const esAgua = data.error || !data.address || (!data.address.country && !data.address.ocean);

    if (esAgua || data.address?.ocean) {
      return NextResponse.json({
        esValido: false,
        mensaje: "La ubicación está en el mar.",
      });
    }

    var region = "";
    if (data.address.town) {
      region += `${data.address.town}`;
      if (data.address.province) region += `, ${data.address.province}`;
    } else
      region =
        data.address.state + ", " + data.address.country || data.address.county || data.address.country;

    return NextResponse.json({
      esValido: true, mensaje: `Terreno firme localizado en ${region}. Base apta para ser construida.`,
      ubicacion: data.display_name,
    });
    
  } catch (error) {
    return NextResponse.json(
      { esValido: false, mensaje: "Error interno del servidor al procesar la ubicación." },
      { status: 500 }
    );
  }
}
