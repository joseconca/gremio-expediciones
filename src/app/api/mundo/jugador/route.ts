import { NextResponse } from "next/server";
import { handleMundoRoute, readJson, requireUsuario } from "@/newGame/server/mundo/http";
import { createPlayer, loadSession } from "@/newGame/server/mundo/jugador";
import { mutateMobility } from "@/newGame/server/mundo/travel";

export const dynamic = "force-dynamic";

export function GET() {
  return handleMundoRoute(async () => {
    const usuario = await requireUsuario();
    return NextResponse.json({ session: await loadSession(usuario.id) });
  });
}

export function POST(request: Request) {
  return handleMundoRoute(async () => {
    const usuario = await requireUsuario();
    const session = await createPlayer(usuario.id, await readJson(request));
    return NextResponse.json({ session });
  });
}

export function PATCH(request: Request) {
  return handleMundoRoute(async () => {
    const usuario = await requireUsuario();
    const mobility = await mutateMobility(usuario.id, await readJson(request));
    return NextResponse.json({ mobility });
  });
}
