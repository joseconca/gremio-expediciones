import { ejecutarRutaParty } from "@/server/services/party/http";
import { obtenerEstadoParty } from "@/server/services/party/party-service";

export async function GET() {
  return ejecutarRutaParty((usuarioId) => obtenerEstadoParty(usuarioId));
}
