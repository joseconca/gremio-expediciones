import type { Prisma } from "@prisma/client";
import { obtenerObjetoPorId } from "./objetos";
import type { EquipoPersonaje, ObjetoInventario } from "./tiposJuego";

interface DatosObjetoInventario {
  id: string;
  objetoId: string;
  cantidad: number;
  nivelMejora: number;
}

interface DatosEquipoEquipado {
  arma: DatosObjetoInventario | null;
  armadura: DatosObjetoInventario | null;
  accesorio: DatosObjetoInventario | null;
}

interface DatosPersonajeConEquipo {
  inventario?: {
    objetos: DatosObjetoInventario[];
  } | null;
  equipoEquipado?: DatosEquipoEquipado | null;
}

export async function asegurarInventarioYEquipo(
  tx: Prisma.TransactionClient,
  personajeId: string
) {
  const inventario = await tx.inventario.upsert({
    where: {
      personajeId,
    },
    update: {},
    create: {
      personajeId,
    },
  });

  const equipoEquipado = await tx.equipoEquipado.upsert({
    where: {
      personajeId,
    },
    update: {},
    create: {
      personajeId,
    },
  });

  return {
    inventario,
    equipoEquipado,
  };
}

function construirObjetoInventario(
  datosObjeto: DatosObjetoInventario | null
): ObjetoInventario | null {
  if (!datosObjeto) {
    return null;
  }

  const objeto = obtenerObjetoPorId(datosObjeto.objetoId);

  if (!objeto) {
    console.warn(`Objeto no encontrado: ${datosObjeto.objetoId}`);
    return null;
  }

  return {
    id: datosObjeto.id,
    objetoId: datosObjeto.objetoId,
    cantidad: datosObjeto.cantidad,
    nivelMejora: datosObjeto.nivelMejora,
    objeto,
  };
}

export function obtenerEquipoDesdePersonaje(
  personaje: DatosPersonajeConEquipo
): EquipoPersonaje {
  return {
    arma: construirObjetoInventario(
      personaje.equipoEquipado?.arma ?? null
    ),
    armadura: construirObjetoInventario(
      personaje.equipoEquipado?.armadura ?? null
    ),
    accesorio: construirObjetoInventario(
      personaje.equipoEquipado?.accesorio ?? null
    ),
  };
}