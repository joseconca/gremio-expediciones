import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularDistanciaKm } from "@/lib/utils";
import {
  calcularFechaLlegadaTraslado,
  leerCoordenadasBase,
  puedeAceptarMiembro,
  obtenerEstadoFinalTraslado,
  type CoordenadasBase,
} from "@/lib/party/reglas";
import { ESTADOS_EXPEDICION_PARTY_ACTIVOS } from "@/lib/party/expedicion-reglas";

const AISLAMIENTO = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

const ESTADOS_ACTIVOS = ["en_viaje", "pendiente", "regresando"];

type UsuarioBase = {
  id: string;
  nombre: string;
  baseCoords: unknown;
  personaje: { id: string; estado: string } | null;
  expedicionActiva: { id: string } | null;
};

export class PartyServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 409, code = "PARTY_CONFLICT") {
    super(message);
    this.name = "PartyServiceError";
    this.status = status;
    this.code = code;
  }
}

function exigirId(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || valor.trim().length === 0 || valor.length > 100) {
    throw new PartyServiceError("El identificador de " + campo + " no es válido.", 400, "ID_INVALIDO");
  }
  return valor.trim();
}

function exigirCoordenadas(valor: unknown, contexto: string): CoordenadasBase {
  const coordenadas = leerCoordenadasBase(valor);
  if (!coordenadas) {
    throw new PartyServiceError(
      "No hay coordenadas válidas para " + contexto + ".",
      409,
      "COORDENADAS_NO_DISPONIBLES",
    );
  }
  return coordenadas;
}

function calcularLlegada(origen: CoordenadasBase, destino: CoordenadasBase, salida: Date): Date {
  const distancia = calcularDistanciaKm(origen.lat, origen.lng, destino.lat, destino.lng);
  if (!Number.isFinite(distancia) || distancia < 0) {
    throw new PartyServiceError("La distancia del traslado no es válida.", 400, "DISTANCIA_INVALIDA");
  }
  return calcularFechaLlegadaTraslado(distancia, salida);
}

async function obtenerUsuarioBase(tx: Prisma.TransactionClient, usuarioId: string) {
  return tx.usuario.findUnique({
    where: { id: usuarioId },
    select: {
      id: true,
      nombre: true,
      baseCoords: true,
      personaje: { select: { id: true, estado: true } },
      expedicionActiva: { select: { id: true } },
    },
  });
}

function exigirPersonajeDisponible(usuario: UsuarioBase | null, rol: string): asserts usuario is UsuarioBase {
  if (!usuario || !usuario.personaje) {
    throw new PartyServiceError("No se encontró el personaje de " + rol + ".", 404, "PERSONAJE_NO_ENCONTRADO");
  }
  if (usuario.expedicionActiva) {
    throw new PartyServiceError(rol + " tiene una expedición activa.", 409, "EXPEDICION_ACTIVA");
  }
  if (usuario.personaje.estado !== "ocioso") {
    throw new PartyServiceError("El personaje de " + rol + " no está disponible en su base.", 409, "PERSONAJE_NO_DISPONIBLE");
  }
}

async function exigirSinTrasladoActivo(tx: Prisma.TransactionClient, usuarioId: string) {
  const traslado = await tx.partyTransfer.findFirst({
    where: {
      visitanteUsuarioId: usuarioId,
      estado: { in: ESTADOS_ACTIVOS },
    },
    select: { id: true },
  });
  if (traslado) {
    throw new PartyServiceError("Ya tienes un traslado entre bases en curso.", 409, "TRASLADO_ACTIVO");
  }
}

async function crearRegreso(
  tx: Prisma.TransactionClient,
  datos: {
    visitanteUsuarioId: string;
    anfitrionUsuarioId: string;
    origen: CoordenadasBase;
    destino: CoordenadasBase;
    decision: string;
    salida: Date;
  },
) {
  const fechaLlegada = calcularLlegada(datos.origen, datos.destino, datos.salida);
  const creado = await tx.partyTransfer.create({
    data: {
      visitanteUsuarioId: datos.visitanteUsuarioId,
      anfitrionUsuarioId: datos.anfitrionUsuarioId,
      estado: "regresando",
      decision: datos.decision,
      fechaSalida: datos.salida,
      fechaLlegada,
      fechaResolucion: datos.salida,
      origenCoords: datos.origen as unknown as Prisma.InputJsonValue,
      destinoCoords: datos.destino as unknown as Prisma.InputJsonValue,
    },
  });

  const actualizado = await tx.personaje.updateMany({
    where: { usuarioId: datos.visitanteUsuarioId, estado: "ocioso" },
    data: { estado: "de_viaje" },
  });
  if (actualizado.count !== 1) {
    throw new PartyServiceError(
      "El personaje ya no está disponible para iniciar el regreso.",
      409,
      "PERSONAJE_MODIFICADO",
    );
  }
  return creado;
}

export async function solicitarVisita(visitanteUsuarioId: string, anfitrionIdDesconocido: unknown) {
  const anfitrionUsuarioId = exigirId(anfitrionIdDesconocido, "la base de destino");
  if (visitanteUsuarioId === anfitrionUsuarioId) {
    throw new PartyServiceError("No puedes enviar a tu aventurero a tu propia base.", 400, "DESTINO_PROPIO");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const visitante = await obtenerUsuarioBase(tx, visitanteUsuarioId);
      const anfitrion = await obtenerUsuarioBase(tx, anfitrionUsuarioId);
      exigirPersonajeDisponible(visitante, "tu personaje");
      exigirPersonajeDisponible(anfitrion, "el anfitrión");

      const membresiaVisitante = await tx.partyMember.findUnique({
        where: { usuarioId: visitanteUsuarioId },
        select: { id: true },
      });
      if (membresiaVisitante) {
        throw new PartyServiceError("Debes abandonar tu party actual antes de visitar otra base.", 409, "YA_EN_PARTY");
      }

      await exigirSinTrasladoActivo(tx, visitanteUsuarioId);

      const membresiaAnfitrion = await tx.partyMember.findUnique({
        where: { usuarioId: anfitrionUsuarioId },
        include: { party: { select: { id: true, liderUsuarioId: true } } },
      });
      if (membresiaAnfitrion && membresiaAnfitrion.party.liderUsuarioId !== anfitrionUsuarioId) {
        throw new PartyServiceError("El dueño de esa base está visitando otra base y no puede liderar allí.", 409, "ANFITRION_NO_DISPONIBLE");
      }

      const partyExistente = await tx.party.findUnique({
        where: { liderUsuarioId: anfitrionUsuarioId },
        include: { miembros: { select: { id: true, usuarioId: true } } },
      });
      const miembrosActuales = partyExistente ? partyExistente.miembros.length : 1;
      if (!puedeAceptarMiembro(miembrosActuales)) {
        throw new PartyServiceError("La party del anfitrión ya tiene el máximo de tres integrantes.", 409, "PARTY_LLENA");
      }

      const origen = exigirCoordenadas(visitante.baseCoords, "tu base");
      const destino = exigirCoordenadas(anfitrion.baseCoords, "la base de destino");
      const salida = new Date();
      const fechaLlegada = calcularLlegada(origen, destino, salida);

      const traslado = await tx.partyTransfer.create({
        data: {
          visitanteUsuarioId,
          anfitrionUsuarioId,
          estado: "en_viaje",
          fechaSalida: salida,
          fechaLlegada,
          origenCoords: origen as unknown as Prisma.InputJsonValue,
          destinoCoords: destino as unknown as Prisma.InputJsonValue,
        },
      });

      const actualizado = await tx.personaje.updateMany({
        where: { usuarioId: visitanteUsuarioId, estado: "ocioso" },
        data: { estado: "de_viaje" },
      });
      if (actualizado.count !== 1) {
        throw new PartyServiceError("El personaje ya no está disponible para viajar.", 409, "PERSONAJE_MODIFICADO");
      }

      return { traslado };
    }, AISLAMIENTO);
  } catch (error) {
    if (error instanceof PartyServiceError) throw error;
    throw error;
  }
}

export async function marcarLlegadaTraslado(visitanteUsuarioId: string, idDesconocido: unknown) {
  const trasladoId = exigirId(idDesconocido, "el traslado");
  return prisma.$transaction(async (tx) => {
    const traslado = await tx.partyTransfer.findUnique({ where: { id: trasladoId } });
    if (!traslado) throw new PartyServiceError("No se encontró el traslado.", 404, "TRASLADO_NO_ENCONTRADO");
    if (traslado.visitanteUsuarioId !== visitanteUsuarioId) {
      throw new PartyServiceError("No puedes resolver el traslado de otro aventurero.", 403, "TRASLADO_AJENO");
    }
    if (traslado.estado !== "en_viaje" || traslado.decision) {
      throw new PartyServiceError("El traslado ya no está en camino a la base de destino.", 409, "ESTADO_TRASLADO_INVALIDO");
    }
    if (traslado.fechaLlegada > new Date()) {
      throw new PartyServiceError("El aventurero todavía está de camino.", 409, "TRASLADO_NO_LLEGADO");
    }

    const actualizado = await tx.partyTransfer.updateMany({
      where: { id: trasladoId, estado: "en_viaje", decision: null },
      data: { estado: "pendiente" },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El traslado ya ha sido actualizado.", 409, "TRASLADO_MODIFICADO");
    }
    return { trasladoId, estado: "pendiente" };
  }, AISLAMIENTO);
}

export async function aceptarVisita(anfitrionUsuarioId: string, idDesconocido: unknown) {
  const trasladoId = exigirId(idDesconocido, "el traslado");
  return prisma.$transaction(async (tx) => {
    const traslado = await tx.partyTransfer.findUnique({ where: { id: trasladoId } });
    if (!traslado) throw new PartyServiceError("No se encontró la visita.", 404, "TRASLADO_NO_ENCONTRADO");
    if (traslado.anfitrionUsuarioId !== anfitrionUsuarioId) {
      throw new PartyServiceError("Solo el propietario de la base de destino puede aceptar esta visita.", 403, "NO_ES_ANFITRION");
    }
    if ((traslado.estado !== "pendiente" && traslado.estado !== "en_viaje") || traslado.decision) {
      throw new PartyServiceError("La visita no está pendiente de aceptación.", 409, "VISITA_NO_PENDIENTE");
    }
    const ahora = new Date();
    if (traslado.fechaLlegada > ahora) {
      throw new PartyServiceError("El aventurero todavía no ha llegado a la base.", 409, "TRASLADO_NO_LLEGADO");
    }
    // El anfitrión puede resolver una llegada aunque el visitante aún no haya
    // abierto el juego para confirmar manualmente que terminó el viaje.
    if (traslado.estado === "en_viaje") {
      const llegadaConfirmada = await tx.partyTransfer.updateMany({
        where: { id: trasladoId, estado: "en_viaje", decision: null, fechaLlegada: { lte: ahora } },
        data: { estado: "pendiente" },
      });
      if (llegadaConfirmada.count !== 1) {
        throw new PartyServiceError("La llegada ya ha sido procesada.", 409, "TRASLADO_MODIFICADO");
      }
    }

    const visitante = await obtenerUsuarioBase(tx, traslado.visitanteUsuarioId);
    const anfitrion = await obtenerUsuarioBase(tx, anfitrionUsuarioId);
    if (!visitante || !visitante.personaje) {
      throw new PartyServiceError("El aventurero visitante ya no está disponible.", 404, "PERSONAJE_NO_ENCONTRADO");
    }
    if (visitante.expedicionActiva || visitante.personaje.estado !== "de_viaje") {
      throw new PartyServiceError("El aventurero visitante ya no está disponible para incorporarse.", 409, "VISITANTE_NO_DISPONIBLE");
    }
    exigirPersonajeDisponible(anfitrion, "el anfitrión");

    const membresiaVisitante = await tx.partyMember.findUnique({
      where: { usuarioId: visitante.id },
      select: { id: true },
    });
    if (membresiaVisitante) {
      throw new PartyServiceError("El aventurero ya pertenece a otra party.", 409, "YA_EN_PARTY");
    }

    const membresiaAnfitrion = await tx.partyMember.findUnique({
      where: { usuarioId: anfitrionUsuarioId },
      include: { party: { select: { id: true, liderUsuarioId: true } } },
    });
    let partyId: string;

    if (membresiaAnfitrion) {
      if (membresiaAnfitrion.party.liderUsuarioId !== anfitrionUsuarioId) {
        throw new PartyServiceError("El dueño de la base debe ser el líder de la party.", 409, "ANFITRION_NO_DISPONIBLE");
      }
      const numeroMiembros = await tx.partyMember.count({
        where: { partyId: membresiaAnfitrion.partyId },
      });
      if (!puedeAceptarMiembro(numeroMiembros)) {
        throw new PartyServiceError("La party ya tiene el máximo de tres integrantes.", 409, "PARTY_LLENA");
      }
      partyId = membresiaAnfitrion.partyId;
    } else {
      const party = await tx.party.create({
        data: {
          liderUsuarioId: anfitrionUsuarioId,
          miembros: { create: { usuarioId: anfitrionUsuarioId } },
        },
      });
      partyId = party.id;
    }

    await tx.partyMember.create({
      data: { partyId, usuarioId: visitante.id },
    });

    const cambioTransferencia = await tx.partyTransfer.updateMany({
      where: { id: trasladoId, estado: "pendiente", decision: null },
      data: {
        estado: "aceptada",
        decision: "aceptada",
        fechaResolucion: new Date(),
      },
    });
    if (cambioTransferencia.count !== 1) {
      throw new PartyServiceError("La visita ya ha sido resuelta.", 409, "VISITA_RESUELTA");
    }

    await tx.personaje.update({
      where: { usuarioId: visitante.id },
      data: { estado: "ocioso" },
    });

    return { partyId, anfitrionUsuarioId, visitanteUsuarioId: visitante.id };
  }, AISLAMIENTO);
}

export async function rechazarVisita(anfitrionUsuarioId: string, idDesconocido: unknown) {
  const trasladoId = exigirId(idDesconocido, "el traslado");
  return prisma.$transaction(async (tx) => {
    const traslado = await tx.partyTransfer.findUnique({ where: { id: trasladoId } });
    if (!traslado) throw new PartyServiceError("No se encontró la visita.", 404, "TRASLADO_NO_ENCONTRADO");
    if (traslado.anfitrionUsuarioId !== anfitrionUsuarioId) {
      throw new PartyServiceError("Solo el propietario de la base de destino puede rechazar esta visita.", 403, "NO_ES_ANFITRION");
    }
    if ((traslado.estado !== "pendiente" && traslado.estado !== "en_viaje") || traslado.decision) {
      throw new PartyServiceError("La visita no está pendiente de resolución.", 409, "VISITA_NO_PENDIENTE");
    }
    const ahora = new Date();
    if (traslado.fechaLlegada > ahora) {
      throw new PartyServiceError("El aventurero todavía no ha llegado a la base.", 409, "TRASLADO_NO_LLEGADO");
    }
    if (traslado.estado === "en_viaje") {
      const llegadaConfirmada = await tx.partyTransfer.updateMany({
        where: { id: trasladoId, estado: "en_viaje", decision: null, fechaLlegada: { lte: ahora } },
        data: { estado: "pendiente" },
      });
      if (llegadaConfirmada.count !== 1) {
        throw new PartyServiceError("La llegada ya ha sido procesada.", 409, "TRASLADO_MODIFICADO");
      }
    }

    const origen = exigirCoordenadas(traslado.destinoCoords, "la base actual");
    const destino = exigirCoordenadas(traslado.origenCoords, "la base de origen");
    const salida = new Date();
    const fechaLlegada = calcularLlegada(origen, destino, salida);
    const actualizado = await tx.partyTransfer.updateMany({
      where: { id: trasladoId, estado: "pendiente", decision: null },
      data: {
        estado: "regresando",
        decision: "rechazada",
        fechaSalida: salida,
        fechaLlegada,
        fechaResolucion: salida,
        origenCoords: origen as unknown as Prisma.InputJsonValue,
        destinoCoords: destino as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("La visita ya ha sido resuelta.", 409, "VISITA_RESUELTA");
    }

    return { trasladoId, estado: "regresando", decision: "rechazada", fechaLlegada };
  }, AISLAMIENTO);
}

export async function completarRegreso(visitanteUsuarioId: string, idDesconocido: unknown) {
  const trasladoId = exigirId(idDesconocido, "el traslado");
  return prisma.$transaction(async (tx) => {
    const traslado = await tx.partyTransfer.findUnique({ where: { id: trasladoId } });
    if (!traslado) throw new PartyServiceError("No se encontró el traslado.", 404, "TRASLADO_NO_ENCONTRADO");
    if (traslado.visitanteUsuarioId !== visitanteUsuarioId) {
      throw new PartyServiceError("No puedes completar el regreso de otro aventurero.", 403, "TRASLADO_AJENO");
    }
    if (traslado.estado !== "regresando") {
      throw new PartyServiceError("No hay un regreso pendiente para este traslado.", 409, "REGRESO_NO_PENDIENTE");
    }
    if (traslado.fechaLlegada > new Date()) {
      throw new PartyServiceError("El aventurero todavía está de camino a su base.", 409, "REGRESO_NO_LLEGADO");
    }

    const estadoFinal = obtenerEstadoFinalTraslado(traslado.decision);
    const actualizado = await tx.partyTransfer.updateMany({
      where: { id: trasladoId, estado: "regresando" },
      data: { estado: estadoFinal },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El regreso ya ha sido completado.", 409, "REGRESO_RESUELTO");
    }

    await tx.personaje.update({
      where: { usuarioId: visitanteUsuarioId },
      data: { estado: "ocioso" },
    });
    return { trasladoId, estado: estadoFinal };
  }, AISLAMIENTO);
}

export async function abandonarParty(usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const membresia = await tx.partyMember.findUnique({
      where: { usuarioId },
      include: {
        party: {
          include: {
            liderUsuario: { select: { id: true, baseCoords: true } },
            miembros: { select: { id: true, usuarioId: true } },
          },
        },
      },
    });
    if (!membresia) throw new PartyServiceError("No perteneces a ninguna party.", 409, "SIN_PARTY");
    if (membresia.party.liderUsuarioId === usuarioId) {
      throw new PartyServiceError("El líder debe disolver la party para que todos regresen a sus bases.", 409, "LIDER_DEBE_DISOLVER");
    }

    const visitante = await obtenerUsuarioBase(tx, usuarioId);
    exigirPersonajeDisponible(visitante, "tu personaje");
    await exigirSinTrasladoActivo(tx, usuarioId);

    const origen = exigirCoordenadas(membresia.party.liderUsuario.baseCoords, "la base del líder");
    const destino = exigirCoordenadas(visitante.baseCoords, "tu base de origen");
    const salida = new Date();

    const transferencia = await crearRegreso(tx, {
      visitanteUsuarioId: usuarioId,
      anfitrionUsuarioId: membresia.party.liderUsuarioId,
      origen,
      destino,
      decision: "salida_voluntaria",
      salida,
    });

    await tx.partyMember.delete({ where: { usuarioId } });
    if (membresia.party.miembros.length <= 2) {
      await tx.party.delete({ where: { id: membresia.partyId } });
    }

    return { traslado: transferencia, partyDisuelta: membresia.party.miembros.length <= 2 };
  }, AISLAMIENTO);
}

export async function disolverParty(liderUsuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const party = await tx.party.findUnique({
      where: { liderUsuarioId },
      include: {
        liderUsuario: {
          select: {
            id: true,
            baseCoords: true,
            personaje: { select: { id: true, estado: true } },
          },
        },
        miembros: {
          include: {
            usuario: {
              select: {
                id: true,
                baseCoords: true,
                personaje: { select: { id: true, estado: true } },
                expedicionActiva: { select: { id: true } },
              },
            },
          },
        },
      },
    });
    if (!party) throw new PartyServiceError("No lideras ninguna party activa.", 409, "SIN_PARTY_LIDERADA");
    if (!party.liderUsuario.personaje || party.liderUsuario.personaje.estado !== "ocioso") {
      throw new PartyServiceError("El personaje líder no está disponible en su base.", 409, "LIDER_NO_DISPONIBLE");
    }

    const origen = exigirCoordenadas(party.liderUsuario.baseCoords, "la base del líder");
    const invitados = party.miembros.filter((miembro) => miembro.usuarioId !== liderUsuarioId);
    const regresos = invitados.map((miembro) => {
      if (!miembro.usuario.personaje || miembro.usuario.personaje.estado !== "ocioso" || miembro.usuario.expedicionActiva) {
        throw new PartyServiceError("Uno de los integrantes no está disponible para regresar.", 409, "MIEMBRO_NO_DISPONIBLE");
      }
      return {
        usuarioId: miembro.usuarioId,
        destino: exigirCoordenadas(miembro.usuario.baseCoords, "la base de un integrante"),
      };
    });

    for (const regreso of regresos) {
      await exigirSinTrasladoActivo(tx, regreso.usuarioId);
      await crearRegreso(tx, {
        visitanteUsuarioId: regreso.usuarioId,
        anfitrionUsuarioId: liderUsuarioId,
        origen,
        destino: regreso.destino,
        decision: "lider_disuelve",
        salida: new Date(),
      });
    }

    await tx.party.delete({ where: { id: party.id } });
    return { partyDisuelta: true, integrantesEnRegreso: regresos.length };
  }, AISLAMIENTO);
}

export async function obtenerEstadoParty(usuarioId: string) {
  const [membresia, traslados] = await Promise.all([
    prisma.partyMember.findUnique({
      where: { usuarioId },
      include: {
        party: {
          include: {
            liderUsuario: {
              select: {
                id: true,
                nombre: true,
                baseCoords: true,
                personaje: { select: { nombre: true, nivel: true, estado: true } },
              },
            },
            miembros: {
              orderBy: { unidoEn: "asc" },
              include: {
                usuario: {
                  select: {
                    id: true,
                    nombre: true,
                    baseCoords: true,
                    personaje: { select: { nombre: true, nivel: true, estado: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.partyTransfer.findMany({
      where: {
        OR: [
          { visitanteUsuarioId: usuarioId, estado: { in: ESTADOS_ACTIVOS } },
          { anfitrionUsuarioId: usuarioId, estado: { in: ["en_viaje", "pendiente"] } },
        ],
      },
      orderBy: { fechaLlegada: "asc" },
      include: {
        visitante: {
          select: {
            id: true,
            nombre: true,
            personaje: { select: { nombre: true, nivel: true, estado: true } },
          },
        },
        anfitrion: {
          select: {
            id: true,
            nombre: true,
            personaje: { select: { nombre: true, nivel: true, estado: true } },
          },
        },
      },
    }),
  ]);

  const party = membresia
    ? {
        id: membresia.party.id,
        liderUsuarioId: membresia.party.liderUsuarioId,
        lider: membresia.party.liderUsuario,
        miembros: membresia.party.miembros.map((miembro) => ({
          usuarioId: miembro.usuarioId,
          unidoEn: miembro.unidoEn,
          esLider: miembro.usuarioId === membresia.party.liderUsuarioId,
          usuario: miembro.usuario,
        })),
      }
    : null;

  const expedicionActivaRaw = membresia
    ? await prisma.expedicionParty.findFirst({
        where: {
          partyId: membresia.partyId,
          fase: { in: [...ESTADOS_EXPEDICION_PARTY_ACTIVOS] },
        },
        orderBy: { creado: "desc" },
        include: {
          participantes: {
            orderBy: { creado: "asc" },
            include: {
              usuario: {
                select: {
                  id: true,
                  nombre: true,
                  personaje: { select: { nombre: true, nivel: true, estado: true } },
                },
              },
            },
          },
          combate: {
            include: {
              participantes: {
                orderBy: { ordenTurno: "asc" },
                include: {
                  usuario: {
                    select: {
                      id: true,
                      nombre: true,
                      personaje: { select: { nombre: true, nivel: true, estado: true } },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  const expedicionActiva = expedicionActivaRaw
    ? {
        ...expedicionActivaRaw,
        combate: expedicionActivaRaw.combate
          ? {
              id: expedicionActivaRaw.combate.id,
              version: expedicionActivaRaw.combate.version,
              fase: expedicionActivaRaw.combate.fase,
              ronda: expedicionActivaRaw.combate.ronda,
              faseTurno: expedicionActivaRaw.combate.faseTurno,
              turnoActualUsuarioId: expedicionActivaRaw.combate.turnoActualUsuarioId,
              enemigoId: expedicionActivaRaw.combate.enemigoId,
              enemigoNombre: expedicionActivaRaw.combate.enemigoNombre,
              enemigoHp: expedicionActivaRaw.combate.enemigoHp,
              enemigoHpMaximo: expedicionActivaRaw.combate.enemigoHpMaximo,
              log: expedicionActivaRaw.combate.log,
              ultimaAccion: expedicionActivaRaw.combate.ultimaAccion,
              participantes: expedicionActivaRaw.combate.participantes.map((p) => ({
                id: p.id,
                usuarioId: p.usuarioId,
                estado: p.estado,
                ordenTurno: p.ordenTurno,
                jugadorHp: p.jugadorHp,
                jugadorHpMaximo: p.jugadorHpMaximo,
                usuario: p.usuario,
              })),
            }
          : null,
      }
    : null;

  const personajeAcciones = await prisma.personaje.findUnique({
    where: { usuarioId },
    select: {
      profesionActivaId: true,
      energiaActual: true,
      manaActual: true,
      habilidades: {
        where: { slot: { in: ["activa_1", "activa_2", "activa_3"] } },
        select: { habilidadId: true, nivel: true, slot: true },
      },
      inventario: {
        select: {
          objetos: {
            where: { cantidad: { gt: 0 } },
            select: { id: true, objetoId: true, cantidad: true },
          },
        },
      },
    },
  });

  const personajeAccionesVista = {
    profesionActivaId: personajeAcciones?.profesionActivaId ?? "novato",
    energiaActual: personajeAcciones?.energiaActual ?? 0,
    manaActual: personajeAcciones?.manaActual ?? 0,
    habilidades: (personajeAcciones?.habilidades ?? []).flatMap((h) => {
      const definicion = obtenerHabilidadPorId(h.habilidadId);
      return definicion?.tipo === "activa"
        ? [{ habilidadId: h.habilidadId, nombre: definicion.nombre, descripcion: definicion.descripcion, costeEnergia: definicion.costeEnergia ?? 0, costeMana: definicion.costeMana ?? 0, cooldownTurnos: definicion.cooldownTurnos ?? 0, nivel: h.nivel, slot: h.slot }]
        : [];
    }),
    objetos: (personajeAcciones?.inventario?.objetos ?? []).flatMap((objeto) => {
      const definicion = obtenerObjetoPorId(objeto.objetoId);
      return definicion?.tipo === "consumible" && (definicion.curacion ?? 0) > 0
        ? [{ inventarioObjetoId: objeto.id, objetoId: objeto.objetoId, nombre: definicion.nombre, curacion: definicion.curacion ?? 0, cantidad: objeto.cantidad }]
        : [];
    }),
  };

  return {
    usuarioId,
    party,
    personajeAcciones: personajeAccionesVista,
    expedicionActiva,
    trasladosPropios: traslados.filter((traslado) => traslado.visitanteUsuarioId === usuarioId),
    visitasEntrantes: traslados.filter(
      (traslado) =>
        traslado.anfitrionUsuarioId === usuarioId &&
        (traslado.estado === "en_viaje" || traslado.estado === "pendiente") &&
        traslado.decision === null,
    ),
  };
}
