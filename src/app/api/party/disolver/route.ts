import { ejecutarRutaParty } from "@/server/services/party/http";
import { disolverParty } from "@/server/services/party/party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty((usuarioId) => disolverParty(usuarioId), request);
}
