import type { Prisma } from "@prisma/client";

/** Carga compartida de datos del personaje para membresía, expediciones y combate. */
const incluirEquipoParty = {
  arma: true,
  armadura: true,
  accesorio: true,
  manoSecundaria: true,
  casco: true,
  pantalones: true,
  botas: true,
  guantes: true,
  anillo1: true,
  anillo2: true,
} satisfies Prisma.EquipoEquipadoInclude;

export const incluirPersonajeParty = {
  habilidades: true,
  progresosClase: true,
  inventario: { include: { objetos: true } },
  equipoEquipado: { include: incluirEquipoParty },
} satisfies Prisma.PersonajeInclude;

