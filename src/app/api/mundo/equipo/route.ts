import { NextResponse } from "next/server";
import { equipmentAction } from "@/lib/mundo/equipment";
import { handleMundoRoute, readJson, requireUsuario } from "@/lib/mundo/http";

export const dynamic = "force-dynamic";
export function GET() {
  return handleMundoRoute(async () => {
    const user = await requireUsuario();
    return NextResponse.json({ ok: true, snapshot: await equipmentAction(user.id, { action: "status" }) }, { headers: { "Cache-Control": "no-store" } });
  });
}
export function POST(request: Request) {
  return handleMundoRoute(async () => {
    const user = await requireUsuario();
    return NextResponse.json({ ok: true, snapshot: await equipmentAction(user.id, await readJson(request)) }, { headers: { "Cache-Control": "no-store" } });
  });
}