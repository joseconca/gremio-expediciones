import { ejecutarRutaParty } from "@/server/services/party/http";
import { solicitarVisita } from "@/server/services/party/party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty((usuarioId, body) => solicitarVisita(usuarioId, body?.anfitrionUsuarioId), request);
}
