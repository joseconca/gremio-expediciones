import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Los atributos ahora se calculan automáticamente según el arquetipo de la profesión y los niveles Base y Job. Ya no se asignan manualmente." },
    { status: 410 }
  );
}
