import type { Prisma } from "@prisma/client";
import { obtenerObjetoPorId } from "./objetos";
import type { EquipoPersonaje, ObjetoInventario } from "./tiposJuego";

export const LIMITE_INVENTARIO_OBJETOS = 30;
import { obtenerNombreObjetoConSufijo, sanitizarBonificacionesObjeto } from "./sufijosObjetos";

interface DatosObjetoInventario {
  id: string;
  objetoId: string;
  cantidad: number;
  nivelMejora: number;
  sufijoId?: string | null;
  bonificaciones?: unknown;
}

interface DatosEquipoEquipado {
  arma: DatosObjetoInventario | null;
  armadura: DatosObjetoInventario | null;
  accesorio: DatosObjetoInventario | null;
  manoSecundaria?: DatosObjetoInventario | null;
  casco?: DatosObjetoInventario | null;
  pantalones?: DatosObjetoInventario | null;
  botas?: DatosObjetoInventario | null;
  guantes?: DatosObjetoInventario | null;
  anillo1?: DatosObjetoInventario | null;
  anillo2?: DatosObjetoInventario | null;
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

  const sufijoId = datosObjeto.sufijoId ?? null;
  return {
    id: datosObjeto.id,
    objetoId: datosObjeto.objetoId,
    cantidad: datosObjeto.cantidad,
    nivelMejora: datosObjeto.nivelMejora,
    sufijoId,
    bonificaciones: sanitizarBonificacionesObjeto(datosObjeto.bonificaciones),
    objeto: {
      ...objeto,
      nombre: obtenerNombreObjetoConSufijo(objeto.nombre, sufijoId),
    },
  };
}

export function obtenerEquipoDesdePersonaje(
  personaje: DatosPersonajeConEquipo
): EquipoPersonaje {
  const equipo = personaje.equipoEquipado;
  return {
    arma: construirObjetoInventario(equipo?.arma ?? null),
    manoSecundaria: construirObjetoInventario(equipo?.manoSecundaria ?? null),
    casco: construirObjetoInventario(equipo?.casco ?? null),
    armadura: construirObjetoInventario(equipo?.armadura ?? null),
    pantalones: construirObjetoInventario(equipo?.pantalones ?? null),
    botas: construirObjetoInventario(equipo?.botas ?? null),
    guantes: construirObjetoInventario(equipo?.guantes ?? null),
    accesorio: construirObjetoInventario(equipo?.accesorio ?? null),
    anillo1: construirObjetoInventario(equipo?.anillo1 ?? null),
    anillo2: construirObjetoInventario(equipo?.anillo2 ?? null),
  };
}