import { ejecutarAccionPvp } from "@/server/services/combate";

export async function POST(request: Request) {
  return ejecutarAccionPvp(request);
}
