import { ejecutarAccionPve } from "@/server/services/combate/pve";

export async function POST(request: Request) {
  return ejecutarAccionPve(request);
}
