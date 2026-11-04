import { ejecutarRutaParty } from "@/server/services/party/http";
import { ejecutarTurnoEnemigoParty } from "@/server/services/party/turno-enemigo";

export async function POST(request: Request) {
  return ejecutarRutaParty(
    (usuarioId, body) => ejecutarTurnoEnemigoParty(usuarioId, body?.expedicionPartyId),
    request,
  );
}
