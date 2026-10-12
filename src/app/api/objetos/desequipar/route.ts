import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CAMPOS_RANURA = {
  arma: "armaInventarioId",
  manoSecundaria: "manoSecundariaInventarioId",
  casco: "cascoInventarioId",
  armadura: "armaduraInventarioId",
  pantalones: "pantalonesInventarioId",
  botas: "botasInventarioId",
  guantes: "guantesInventarioId",
  accesorio: "accesorioInventarioId",
  anillo1: "anillo1InventarioId",
  anillo2: "anillo2InventarioId",
} as const;

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();
    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const bodyJson: unknown = await request.json().catch(() => null);
    if (!bodyJson || typeof bodyJson !== "object" || Array.isArray(bodyJson)) {
      return NextResponse.json({ error: "El cuerpo de la petición no es válido." }, { status: 400 });
    }

    const body = bodyJson as Record<string, unknown>;
    let slot = body.slot;
    // Compatibilidad temporal con clientes que enviaban solo el tipo antiguo.
    if (slot === undefined) slot = body.tipo;
    if (slot === "mano_secundaria") slot = "manoSecundaria";
    if (slot === "collar") slot = "accesorio";
    if (slot !== "arma" && slot !== "manoSecundaria" && slot !== "casco" &&
        slot !== "armadura" && slot !== "pantalones" && slot !== "botas" &&
        slot !== "guantes" && slot !== "accesorio" && slot !== "anillo1" && slot !== "anillo2") {
      return NextResponse.json({ error: "Ranura de equipamiento no válida." }, { status: 400 });
    }

    const field = CAMPOS_RANURA[slot as keyof typeof CAMPOS_RANURA];
    const personaje = await prisma.personaje.findUnique({
      where: { usuarioId: usuarioSesion.id },
      include: { equipoEquipado: true },
    });
    if (!personaje) {
      return NextResponse.json({ error: "No se encontró el personaje." }, { status: 404 });
    }
    if (!personaje.equipoEquipado || !personaje.equipoEquipado[field]) {
      return NextResponse.json({ error: "Esa ranura ya está vacía." }, { status: 409 });
    }

    const equipo = await prisma.equipoEquipado.update({
      where: { personajeId: personaje.id },
      data: { [field]: null } as Prisma.EquipoEquipadoUncheckedUpdateInput,
    });

    return NextResponse.json({
      exito: true,
      mensaje: "Objeto desequipado correctamente.",
      ranura: slot,
      equipo,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2034"].includes(error.code)) {
      return NextResponse.json({
        error: "El equipo ha cambiado durante la operación. Actualiza el inventario e inténtalo de nuevo.",
      }, { status: 409 });
    }
    console.error("Error al desequipar objeto:", error);
    return NextResponse.json({ error: "No se pudo desequipar el objeto." }, { status: 500 });
  }
}
