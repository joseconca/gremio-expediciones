import { iniciarExpedicion } from "@/server/services/expediciones";

export async function POST(request: Request) {
  return iniciarExpedicion(request);
}
