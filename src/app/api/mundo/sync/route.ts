import { NextResponse } from "next/server";
import { handleMundoRoute, readJson, requireJugador, withWorldLock } from "@/lib/mundo/http";
import { syncProgress } from "@/lib/mundo/jugador";
import { getPartySnapshot } from "@/lib/mundo/party";

/** One round trip per tick: persist reported progress, return the party view. */
export function POST(request: Request) {
  return handleMundoRoute(async () => {
    const { jugador, base } = await requireJugador();
    const body = await readJson(request);
    const savedToken = await syncProgress(jugador, base, body);

    const [freshPlayer, freshBase] = await withWorldLock(async (tx) => Promise.all([
      tx.jugador.findUniqueOrThrow({ where: { id: jugador.id } }),
      tx.base.findUniqueOrThrow({ where: { id: base.id } }),
    ]));
    const snapshot = await getPartySnapshot(freshPlayer, freshBase);
    const profileReset = (snapshot.rewardRevision ?? 0) > (body.rewardRevision as number | undefined ?? 0);
    // A different writer may commit after ours; acknowledge only our own save.
    return NextResponse.json({
      ...snapshot,
      profileReset,
      progressToken: profileReset ? snapshot.progressToken : savedToken,
    });
  });
}
