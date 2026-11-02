import { ejecutarAccionPve } from "@/server/services/combate";

export async function POST(request: Request) {
  return ejecutarAccionPve(request);
}
