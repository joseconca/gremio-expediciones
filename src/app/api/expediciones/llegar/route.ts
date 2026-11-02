import { llegarExpedicion } from "@/server/services/expediciones";

export async function POST() {
  return llegarExpedicion();
}
