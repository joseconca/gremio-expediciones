import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


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

export async function POST(request: Request) {
  try {
    const usuario = await getAuthenticatedUser();
    if (!usuario) {
      return NextResponse.json({ esValido: false, mensaje: "Sesión requerida." }, { status: 401 });
    }

    const { lat, lng } = await request.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({esValido: false, mensaje: "Coordenadas inválidas." }, { status: 400 });
    }

    const usuarios = await prisma.usuario.findMany({
      where: { id: { not: usuario.id }, baseCoords: { not: Prisma.JsonNull } },
      select: { nombre: true, baseCoords: true },
    });

    for (const otroUsuario of usuarios) {
      const coords = otroUsuario.baseCoords as { lat?: unknown; lng?: unknown } | null;
      if (typeof coords?.lat !== "number" || typeof coords.lng !== "number") continue;
      const distancia = calcularDistanciaKm(lat, lng, coords.lat, coords.lng);
      
      if (distancia < 5) {
        return NextResponse.json({esValido: false, mensaje: `Demasiado cerca. A ${distancia.toFixed(1)} km de "${otroUsuario.nombre}".`});
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

    let region = "";
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
    
  } catch {
    return NextResponse.json(
      { esValido: false, mensaje: "Error interno del servidor al procesar la ubicación." },
      { status: 500 }
    );
  }
}
