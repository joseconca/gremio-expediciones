import { NextResponse } from "next/server";
import { handleMundoRoute, readJson, requireJugador } from "@/lib/mundo/http";
import { syncProgress } from "@/lib/mundo/jugador";
import { getPartySnapshot } from "@/lib/mundo/party";
import { prisma } from "@/lib/prisma";

/** One round trip per tick: persist reported progress, return the party view. */
export function POST(request: Request) {
  return handleMundoRoute(async () => {
    const { jugador, base } = await requireJugador();
    await syncProgress(jugador, base, await readJson(request));

    const [freshPlayer, freshBase] = await Promise.all([
      prisma.jugador.findUniqueOrThrow({ where: { id: jugador.id } }),
      prisma.base.findUniqueOrThrow({ where: { id: base.id } }),
    ]);
    return NextResponse.json(await getPartySnapshot(freshPlayer, freshBase));
  });
}
