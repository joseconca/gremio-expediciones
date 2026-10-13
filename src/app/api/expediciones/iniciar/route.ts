import { iniciarExpedicion } from "@/server/services/expediciones/iniciar-expedicion";

export async function POST(request: Request) {
  return iniciarExpedicion(request);
}
