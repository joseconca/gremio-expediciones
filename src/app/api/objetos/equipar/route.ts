import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId, obtenerRanuraObjeto } from "@/lib/objetos";
import { obtenerNombreObjetoConSufijo } from "@/lib/sufijosObjetos";

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

type RanuraEquipamiento = keyof typeof CAMPOS_RANURA;
type EquipoActual = Record<(typeof CAMPOS_RANURA)[RanuraEquipamiento], string | null>;

function esRanura(value: unknown): value is RanuraEquipamiento {
  return typeof value === "string" && Object.hasOwn(CAMPOS_RANURA, value);
}

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
    if (typeof body.objetoInventarioId !== "string" || !body.objetoInventarioId.trim()) {
      return NextResponse.json({ error: "Debes indicar el objeto que quieres equipar." }, { status: 400 });
    }

    const personaje = await prisma.personaje.findUnique({
      where: { usuarioId: usuarioSesion.id },
      include: { inventario: true, equipoEquipado: true },
    });
    if (!personaje) {
      return NextResponse.json({ error: "No se encontró el personaje." }, { status: 404 });
    }
    if (!personaje.inventario) {
      return NextResponse.json({ error: "El personaje no tiene inventario." }, { status: 409 });
    }

    const objetoInventario = await prisma.inventarioObjeto.findFirst({
      where: {
        id: body.objetoInventarioId.trim(),
        inventarioId: personaje.inventario.id,
      },
    });
    if (!objetoInventario) {
      return NextResponse.json({ error: "El objeto no pertenece a tu inventario." }, { status: 403 });
    }

    const objeto = obtenerObjetoPorId(objetoInventario.objetoId);
    if (!objeto) {
      return NextResponse.json({ error: "No se encontró la definición del objeto." }, { status: 404 });
    }

    const slotObjeto = obtenerRanuraObjeto(objeto);
    if (!slotObjeto) {
      return NextResponse.json({ error: "Este objeto no se puede equipar." }, { status: 400 });
    }

    const equipoInicial = personaje.equipoEquipado;
    let ranura: RanuraEquipamiento;
    if (slotObjeto === "arma" || slotObjeto === "armadura" || slotObjeto === "casco" ||
        slotObjeto === "pantalones" || slotObjeto === "botas" || slotObjeto === "guantes") {
      ranura = slotObjeto;
    } else if (slotObjeto === "mano_secundaria") {
      ranura = "manoSecundaria";
    } else if (slotObjeto === "collar") {
      ranura = "accesorio";
    } else if (slotObjeto === "anillo") {
      const solicitada = body.slot;
      if (solicitada === "anillo1" || solicitada === "anillo2") {
        ranura = solicitada;
      } else if (equipoInicial?.anillo1InventarioId === objetoInventario.id) {
        ranura = "anillo1";
      } else if (equipoInicial?.anillo2InventarioId === objetoInventario.id) {
        ranura = "anillo2";
      } else if (!equipoInicial?.anillo1InventarioId) {
        ranura = "anillo1";
      } else if (!equipoInicial?.anillo2InventarioId) {
        ranura = "anillo2";
      } else {
        return NextResponse.json({
          error: "Ya tienes los dos anillos equipados. Indica slot: anillo1 o anillo2 para sustituir uno.",
        }, { status: 409 });
      }
    } else {
      return NextResponse.json({ error: "Este objeto no tiene una ranura compatible." }, { status: 400 });
    }

    if (ranura === "arma" && objeto.manos === 2 && equipoInicial?.manoSecundariaInventarioId) {
      return NextResponse.json({
        error: "Esta arma requiere las dos manos. Desequipa primero el objeto de la mano secundaria.",
      }, { status: 409 });
    }

    if (ranura === "manoSecundaria" && equipoInicial?.armaInventarioId) {
      const armaActual = await prisma.inventarioObjeto.findFirst({
        where: { id: equipoInicial.armaInventarioId, inventarioId: personaje.inventario.id },
      });
      if (armaActual && obtenerObjetoPorId(armaActual.objetoId)?.manos === 2) {
        return NextResponse.json({
          error: "No puedes ocupar la mano secundaria mientras llevas un arma de dos manos.",
        }, { status: 409 });
      }
    }

    const field = CAMPOS_RANURA[ranura];
    const resultado = await prisma.$transaction(async (tx) => {
      const actual = await tx.equipoEquipado.findUnique({
        where: { personajeId: personaje.id },
      });
      const update: Record<string, string | null> = { [field]: objetoInventario.id };
      if (actual) {
        for (const [slot, idField] of Object.entries(CAMPOS_RANURA)) {
          if (slot !== ranura && actual[idField as keyof typeof actual] === objetoInventario.id) {
            update[idField] = null;
          }
        }
      }
      return tx.equipoEquipado.upsert({
        where: { personajeId: personaje.id },
        update,
        create: { personajeId: personaje.id, [field]: objetoInventario.id },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({
      exito: true,
      mensaje: `Has equipado ${obtenerNombreObjetoConSufijo(objeto.nombre, objetoInventario.sufijoId)} en ${ranura}.`,
      ranura,
      equipo: resultado,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2003", "P2025", "P2034"].includes(error.code)) {
      return NextResponse.json({
        error: "El equipo ha cambiado durante la operación. Actualiza el inventario e inténtalo de nuevo.",
      }, { status: 409 });
    }
    console.error("Error al equipar objeto:", error);
    return NextResponse.json({ error: "No se pudo equipar el objeto." }, { status: 500 });
  }
}
