import { ejecutarRutaParty } from "@/server/services/party/http";
import { rechazarVisita } from "@/server/services/party/party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty((usuarioId, body) => rechazarVisita(usuarioId, body?.trasladoId), request);
}
