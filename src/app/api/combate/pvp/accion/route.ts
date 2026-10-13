import { ejecutarAccionPvp } from "@/server/services/combate/pvp";

export async function POST(request: Request) {
  return ejecutarAccionPvp(request);
}
