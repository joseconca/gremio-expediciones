import { ejecutarRutaParty } from "@/server/services/party/http";
import { llegarExpedicionParty } from "@/server/services/party/expedicion-party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty(
    (usuarioId, body) => llegarExpedicionParty(usuarioId, body?.expedicionPartyId),
    request,
  );
}
