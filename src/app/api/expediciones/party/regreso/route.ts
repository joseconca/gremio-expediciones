import { ejecutarRutaParty } from "@/server/services/party/http";
import { completarRegresoExpedicionParty } from "@/server/services/party/expedicion-party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty(
    (usuarioId, body) => completarRegresoExpedicionParty(usuarioId, body?.expedicionPartyId),
    request,
  );
}
