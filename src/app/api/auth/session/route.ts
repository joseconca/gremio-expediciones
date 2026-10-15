import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const usuario = await getAuthenticatedUser();
    return NextResponse.json(
      { autenticado: Boolean(usuario) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error al comprobar la sesión:", error);
    return NextResponse.json(
      { error: "No se pudo comprobar la sesión." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
