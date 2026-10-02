import { NextResponse } from "next/server";
import { MundoError, readJson, requireUsuario } from "@/lib/mundo/http";
import { loadExpeditions, mutateExpeditions } from "@/lib/mundo/expeditions";
import type { ExpeditionResult, ExpeditionSnapshotDto } from "@/shared/expeditions";

export const dynamic = "force-dynamic";

async function respond(work: (usuarioId: string) => Promise<ExpeditionSnapshotDto>) {
  try {
    const usuario = await requireUsuario();
    const body: ExpeditionResult = { ok: true, snapshot: await work(usuario.id) };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof MundoError)) console.error("Error en expediciones del mundo:", error);
    const body: ExpeditionResult = {
      ok: false, code: error instanceof MundoError ? error.code : "internal",
      message: error instanceof MundoError ? error.message : "Error interno del servidor.",
    };
    return NextResponse.json(body, { status: error instanceof MundoError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}

export function GET() {
  return respond(loadExpeditions);
}

export function POST(request: Request) {
  return respond(async (usuarioId) => mutateExpeditions(usuarioId, await readJson(request)));
}