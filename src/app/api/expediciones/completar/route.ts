import { completarExpedicion } from "@/server/services/expediciones";

export async function POST() {
  return completarExpedicion();
}
