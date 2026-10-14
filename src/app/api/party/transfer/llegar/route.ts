import { ejecutarRutaParty } from "@/server/services/party/http";
import { marcarLlegadaTraslado } from "@/server/services/party/party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty((usuarioId, body) => marcarLlegadaTraslado(usuarioId, body?.trasladoId), request);
}
