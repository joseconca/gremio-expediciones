import { ejecutarRutaParty } from "@/server/services/party/http";
import { iniciarExpedicionParty } from "@/server/services/party/expedicion-party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty(
    (usuarioId, body) => iniciarExpedicionParty(usuarioId, body?.misionId, body?.modoDificultad),
    request,
  );
}
