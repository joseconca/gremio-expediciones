import { ejecutarRutaParty } from "@/server/services/party/http";
import { ejecutarAccionCombateParty } from "@/server/services/party/combate-party-actions";

export async function POST(request: Request) {
  return ejecutarRutaParty(
    (usuarioId, body) => ejecutarAccionCombateParty(usuarioId, body?.expedicionPartyId, body?.accion),
    request,
  );
}
