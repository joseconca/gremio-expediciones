import { ejecutarRutaParty } from "@/server/services/party/http";
import { llegarExpedicionParty, crearCombatePartySiProcede } from "@/server/services/party/expedicion-party-service";

export async function POST(request: Request) {
  return ejecutarRutaParty(
    async (usuarioId, body) => {
      const llegada = await llegarExpedicionParty(usuarioId, body?.expedicionPartyId);
      if (llegada.fase === "lista_para_combate") {
        const combate = await crearCombatePartySiProcede(String(body?.expedicionPartyId ?? ""));
        return { ...llegada, combate };
      }
      return llegada;
    },
    request,
  );
}
