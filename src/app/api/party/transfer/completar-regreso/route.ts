import { ejecutarRutaParty } from "@/server/services/party/http";
import { completarRegreso } from "@/server/services/party/party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty((usuarioId, body) => completarRegreso(usuarioId, body?.trasladoId), request);
}
