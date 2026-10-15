import { ejecutarRutaParty } from "@/server/services/party/http";
import { volverDeVisita } from "@/server/services/party/party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty((usuarioId, body) => volverDeVisita(usuarioId, body?.trasladoId), request);
}
