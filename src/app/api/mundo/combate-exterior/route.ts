import { NextResponse } from "next/server";
import { MundoError, readJson, requireUsuario } from "@/lib/mundo/http";
import { mutateWorldCombat } from "@/lib/mundo/worldCombat";
import type { WorldCombatResult, WorldCombatSnapshotDto } from "@/shared/worldCombat";

export const dynamic = "force-dynamic";

async function respond(work: (usuarioId: string) => Promise<WorldCombatSnapshotDto>) {
  try {
    const user = await requireUsuario();
    const body: WorldCombatResult = { ok: true, snapshot: await work(user.id) };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof MundoError)) console.error("Error en combate exterior:", error);
    const body: WorldCombatResult = {
      ok: false, code: error instanceof MundoError ? error.code : "internal",
      message: error instanceof MundoError ? error.message : "Error interno del servidor.",
    };
    return NextResponse.json(body, { status: error instanceof MundoError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}

export function GET() {
  return respond((usuarioId) => mutateWorldCombat(usuarioId, { action: "status" }));
}

export function POST(request: Request) {
  return respond(async (usuarioId) => mutateWorldCombat(usuarioId, await readJson(request)));
}
