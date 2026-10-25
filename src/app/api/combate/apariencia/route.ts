import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Public visual fields only, restricted to the two participants of this siege. */
export async function GET(request: Request) {
  const usuario = await getAuthenticatedUser();
  if (!usuario) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Combate requerido." }, { status: 400 });
  const combate = await prisma.combateActivo.findFirst({
    where: { id, tipo: "pvp", OR: [{ atacanteUsuarioId: usuario.id }, { defensorUsuarioId: usuario.id }] },
    select: { atacanteUsuarioId: true, defensorUsuarioId: true },
  });
  if (!combate) return NextResponse.json({ error: "Combate no encontrado." }, { status: 404 });
  const personajes = await prisma.personaje.findMany({
    where: { usuarioId: { in: [combate.atacanteUsuarioId, combate.defensorUsuarioId].filter((id): id is string => Boolean(id)) } },
    select: { usuarioId: true, clase: true, sexo: true, profesionActivaId: true,
      equipoEquipado: { select: { arma: { select: { objetoId: true } }, manoSecundaria: { select: { objetoId: true } } } } },
  });
  return NextResponse.json({ apariencias: Object.fromEntries(personajes.map(p => [p.usuarioId, {
    clase: p.clase, sexo: p.sexo, profesionActivaId: p.profesionActivaId,
    armaSpriteId: p.equipoEquipado?.arma?.objetoId ?? null, escudoSpriteId: p.equipoEquipado?.manoSecundaria?.objetoId ?? null,
  }])) }, { headers: { "Cache-Control": "private, no-store" } });
}
