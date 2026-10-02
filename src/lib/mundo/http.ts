import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WorldApiError } from "@/shared/world";

export class MundoError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export async function handleMundoRoute(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof MundoError) {
      const body: WorldApiError = { code: error.code, message: error.message };
      return NextResponse.json(body, { status: error.status });
    }
    console.error("Error en la API del mundo:", error);
    const body: WorldApiError = {
      code: "internal",
      message: "Error interno del servidor.",
    };
    return NextResponse.json(body, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // Falls through to the validation error below.
  }
  throw new MundoError(400, "invalid_body", "Cuerpo de la petici\u00f3n inv\u00e1lido.");
}

export async function requireUsuario() {
  const usuario = await getAuthenticatedUser();
  if (!usuario) {
    throw new MundoError(401, "unauthenticated", "Inicia sesi\u00f3n para jugar.");
  }
  return usuario;
}

export async function requireJugador() {
  const usuario = await requireUsuario();
  const jugador = await prisma.jugador.findUnique({
    where: { usuarioId: usuario.id },
    include: { usuario: { include: { base: true } } },
  });
  if (!jugador?.usuario.base) {
    throw new MundoError(404, "no_player", "Todav\u00eda no has creado tu jugador.");
  }
  return { jugador, base: jugador.usuario.base };
}

const WORLD_LOCK_KEY = 7301;

/** Serializes world mutations (distance checks, party capacity) across requests. */
export function withWorldLock<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WORLD_LOCK_KEY})`;
    return work(tx);
  });
}
