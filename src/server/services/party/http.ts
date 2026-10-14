import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { PartyServiceError } from "@/server/services/party/party-service";

type Body = Record<string, unknown> | null;
type PartyHandler = (usuarioId: string, body: Body) => Promise<Record<string, unknown>>;

export async function ejecutarRutaParty(handler: PartyHandler, request?: Request) {
  try {
    const usuario = await getAuthenticatedUser();
    if (!usuario) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    let body: Body = null;
    if (request) {
      const recibido: unknown = await request.json().catch(() => null);
      if (!recibido || typeof recibido !== "object" || Array.isArray(recibido)) {
        return NextResponse.json({ error: "El cuerpo de la petición no es válido." }, { status: 400 });
      }
      body = recibido as Record<string, unknown>;
    }

    const resultado = await handler(usuario.id, body);
    return NextResponse.json(
      { exito: true, ...resultado },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PartyServiceError) {
      return NextResponse.json(
        { error: error.message, codigo: error.code },
        { status: error.status },
      );
    }

    const codigo = typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : null;
    if (codigo === "P2002" || codigo === "P2034") {
      return NextResponse.json(
        { error: "La party o el traslado han cambiado por otra operación. Actualiza el estado e inténtalo de nuevo.", codigo: "CONFLICTO_CONCURRENTE" },
        { status: 409 },
      );
    }

    console.error("Error al gestionar el sistema de party:", error);
    return NextResponse.json({ error: "No se pudo completar la operación de party." }, { status: 500 });
  }
}
