import { ejecutarRutaParty } from "@/server/services/party/http";
import { aceptarVisita } from "@/server/services/party/party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty((usuarioId, body) => aceptarVisita(usuarioId, body?.trasladoId), request);
}
