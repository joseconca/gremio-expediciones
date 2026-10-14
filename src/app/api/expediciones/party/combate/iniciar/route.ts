import { ejecutarRutaParty } from "@/server/services/party/http";
import { iniciarCombateParty } from "@/server/services/party/combate-party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty(
    (usuarioId, body) => iniciarCombateParty(usuarioId, body?.expedicionPartyId),
    request,
  );
}
