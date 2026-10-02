import { NextResponse } from "next/server";
import { handleMundoRoute, MundoError, readJson, requireJugador } from "@/lib/mundo/http";
import { invitePlayer, leaveParty, respondToInvitation } from "@/lib/mundo/party";

export function POST(request: Request) {
  return handleMundoRoute(async () => {
    const { jugador, base } = await requireJugador();
    const body = await readJson(request);

    switch (body.action) {
      case "invite":
        await invitePlayer(jugador, base, body.targetPlayerId);
        break;
      case "respond":
        await respondToInvitation(jugador, base, body.invitationId, body.accept);
        break;
      case "leave":
        await leaveParty(jugador);
        break;
      default:
        throw new MundoError(400, "invalid_action", "Acci\u00f3n desconocida.");
    }

    return NextResponse.json({ ok: true });
  });
}
