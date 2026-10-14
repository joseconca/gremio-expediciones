import { ejecutarRutaParty } from "@/server/services/party/http";
import { abandonarParty } from "@/server/services/party/party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty((usuarioId) => abandonarParty(usuarioId), request);
}
