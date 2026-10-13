import { llegarExpedicion } from "@/server/services/expediciones/llegar-expedicion";

export async function POST() {
  return llegarExpedicion();
}
