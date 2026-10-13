import { completarExpedicion } from "@/server/services/expediciones/completar-expedicion";

export async function POST() {
  return completarExpedicion();
}
