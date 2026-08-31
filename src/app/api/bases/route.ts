import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Coger bases de postgres
  const basesJugadores = [
    { id: "jugador_1", nombre: "Gremio de los Halcones", lat: 40.45, lng: -3.65, nivel: 3 },
    { id: "jugador_2", nombre: "La Taberna del Oso", lat: 40.38, lng: -3.75, nivel: 5 },
    { id: "jugador_3", nombre: "Refugio del Norte", lat: 40.50, lng: -3.80, nivel: 2 },
  ];

  return NextResponse.json({ bases: basesJugadores });
}