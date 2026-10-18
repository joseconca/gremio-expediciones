import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularEstadisticasPersonaje, calcularModificadoresEquipo } from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { calcularDistanciaKm } from "@/lib/utils";
import {
  calcularFechaLlegadaTraslado,
  leerCoordenadasBase,
  puedeAceptarMiembro,
  obtenerEstadoFinalTraslado,
  type CoordenadasBase,
} from "@/lib/party/reglas";
import { ESTADOS_EXPEDICION_PARTY_ACTIVOS } from "@/lib/party/expedicion-reglas";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { leerEnemigosEnCombate } from "@/lib/expediciones/enemigos-combate";

const AISLAMIENTO = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

const incluirEquipoRecursosParty = {
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

const incluirPersonajeRecursosParty = {
  habilidades: true,
  progresosClase: true,
  inventario: { include: { objetos: true } },
  equipoEquipado: { include: incluirEquipoRecursosParty },
} satisfies Prisma.PersonajeInclude;

type PersonajeRecursosParty = Prisma.PersonajeGetPayload<{
  include: typeof incluirPersonajeRecursosParty;
}>;

function obtenerRecursosCombatePersona(personaje: PersonajeRecursosParty | null | undefined) {
  if (!personaje) {
    return {
      profesionActivaId: "novato",
      jugadorEnergiaActual: 0,
      jugadorEnergiaMaxima: 20,
      jugadorManaActual: 0,
      jugadorManaMaximo: 10,
    };
  }

  const equipo = obtenerEquipoDesdePersonaje(personaje);
  const modificadoresEquipo = calcularModificadoresEquipo(equipo, personaje.profesionActivaId);
  const estadisticas = calcularEstadisticasPersonaje(
    personaje,
    personaje.habilidades
      .filter((habilidad) => habilidad.slot !== null)
      .map((habilidad) => ({ habilidadId: habilidad.habilidadId, nivel: habilidad.nivel })),
    modificadoresEquipo,
  );

  return {
    profesionActivaId: personaje.profesionActivaId || "novato",
    jugadorEnergiaActual: personaje.energiaActual,
    jugadorEnergiaMaxima: Math.max(0, Math.floor(estadisticas.total.energiaMaxima ?? 20)),
    jugadorManaActual: personaje.manaActual,
    jugadorManaMaximo: Math.max(0, Math.floor(estadisticas.total.manaMaximo ?? 10)),
  };
}

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

function obtenerPosicionActualExpedicion(
  expedicion: { fechaSalida: Date; fechaLlegada: Date; origenCoords: unknown; destinoCoords: unknown },
  ahora: Date,
): CoordenadasBase {
  const origen = exigirCoordenadas(expedicion.origenCoords, "el origen de la expedición");
  const destino = exigirCoordenadas(expedicion.destinoCoords, "el destino de la expedición");
  const inicio = expedicion.fechaSalida.getTime();
  const fin = expedicion.fechaLlegada.getTime();
  const progreso = fin > inicio
    ? Math.max(0, Math.min(1, (ahora.getTime() - inicio) / (fin - inicio)))
    : 1;
  return {
    lat: origen.lat + (destino.lat - origen.lat) * progreso,
    lng: origen.lng + (destino.lng - origen.lng) * progreso,
  };
}

async function crearRegresoDesdeExpedicion(
  tx: Prisma.TransactionClient,
  datos: {
    visitanteUsuarioId: string;
    anfitrionUsuarioId: string;
    origen: CoordenadasBase;
    destino: CoordenadasBase;
    salida: Date;
  },
) {
  await exigirSinTrasladoActivo(tx, datos.visitanteUsuarioId);
  const fechaLlegada = calcularLlegada(datos.origen, datos.destino, datos.salida);
  const traslado = await tx.partyTransfer.create({
    data: {
      visitanteUsuarioId: datos.visitanteUsuarioId,
      anfitrionUsuarioId: datos.anfitrionUsuarioId,
      estado: "regresando",
      decision: "lider_disuelve",
      fechaSalida: datos.salida,
      fechaLlegada,
      fechaResolucion: datos.salida,
      origenCoords: datos.origen as unknown as Prisma.InputJsonValue,
      destinoCoords: datos.destino as unknown as Prisma.InputJsonValue,
    },
  });
  const personajeActualizado = await tx.personaje.updateMany({
    where: { usuarioId: datos.visitanteUsuarioId, estado: "de_viaje" },
    data: { estado: "de_viaje" },
  });
  if (personajeActualizado.count !== 1) {
    throw new PartyServiceError(
      "El personaje ya no está en el viaje compartido y no puede regresar.",
      409,
      "PERSONAJE_MODIFICADO",
    );
  }
  return traslado;
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
      const miembrosActuales = partyExistente?.estado === "disuelta" ? 1 : (partyExistente ? partyExistente.miembros.length : 1);
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
      const partyExistente = await tx.party.findUnique({ where: { liderUsuarioId: anfitrionUsuarioId } });
      if (partyExistente?.estado === "disuelta") {
        await tx.party.update({ where: { id: partyExistente.id }, data: { estado: "activa" } });
        await tx.partyMember.create({ data: { partyId: partyExistente.id, usuarioId: anfitrionUsuarioId } });
        partyId = partyExistente.id;
      } else if (partyExistente) {
        throw new PartyServiceError("La party del anfitrión no está disponible para nuevas incorporaciones.", 409, "PARTY_NO_DISPONIBLE");
      } else {
        const party = await tx.party.create({
          data: {
            liderUsuarioId: anfitrionUsuarioId,
            estado: "activa",
            miembros: { create: { usuarioId: anfitrionUsuarioId } },
          },
        });
        partyId = party.id;
      }
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

/**
 * Permite que un visitante cancele la espera de aceptación y vuelva a su base.
 * Solo se admite cuando ya llegó y el traslado está pendiente sin decisión.
 */
export async function volverDeVisita(visitanteUsuarioId: string, idDesconocido: unknown) {
  const trasladoId = exigirId(idDesconocido, "el traslado");
  return prisma.$transaction(async (tx) => {
    const traslado = await tx.partyTransfer.findUnique({ where: { id: trasladoId } });
    if (!traslado) throw new PartyServiceError("No se encontró la visita.", 404, "TRASLADO_NO_ENCONTRADO");
    if (traslado.visitanteUsuarioId !== visitanteUsuarioId) {
      throw new PartyServiceError("No puedes cancelar la visita de otro aventurero.", 403, "TRASLADO_AJENO");
    }
    if (traslado.estado !== "pendiente" || traslado.decision !== null) {
      throw new PartyServiceError("Solo puedes volver cuando ya has llegado y la visita sigue pendiente de aceptación.", 409, "VISITA_NO_PENDIENTE");
    }

    const ahora = new Date();
    if (traslado.fechaLlegada > ahora) {
      throw new PartyServiceError("Todavía estás de camino a la base de destino.", 409, "TRASLADO_NO_LLEGADO");
    }

    const visitante = await obtenerUsuarioBase(tx, visitanteUsuarioId);
    if (!visitante || !visitante.personaje || visitante.expedicionActiva || visitante.personaje.estado !== "de_viaje") {
      throw new PartyServiceError("Tu personaje ya no está disponible para volver desde esta visita.", 409, "VISITANTE_NO_DISPONIBLE");
    }

    const origen = exigirCoordenadas(traslado.destinoCoords, "la base actual");
    const destino = exigirCoordenadas(traslado.origenCoords, "tu base de origen");
    const fechaLlegada = calcularLlegada(origen, destino, ahora);
    const actualizado = await tx.partyTransfer.updateMany({
      where: {
        id: trasladoId,
        visitanteUsuarioId,
        estado: "pendiente",
        decision: null,
      },
      data: {
        estado: "regresando",
        decision: "visitante_volver",
        fechaSalida: ahora,
        fechaLlegada,
        fechaResolucion: ahora,
        origenCoords: origen as unknown as Prisma.InputJsonValue,
        destinoCoords: destino as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("La visita acaba de ser aceptada o rechazada; actualiza el estado antes de continuar.", 409, "VISITA_RESUELTA");
    }

    return { trasladoId, estado: "regresando", decision: "visitante_volver", fechaLlegada };
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
    if (!membresia || membresia.party.estado !== "activa") {
      throw new PartyServiceError("No perteneces a ninguna party activa.", 409, "SIN_PARTY");
    }
    if (membresia.party.liderUsuarioId === usuarioId) {
      throw new PartyServiceError("El líder debe disolver la party para que todos regresen a sus bases.", 409, "LIDER_DEBE_DISOLVER");
    }

    // Huir del combate no implica abandonar la party. La salida social solo se
    // puede confirmar desde fuera de una expedición activa, con el personaje en base.
    const expedicionActiva = await tx.expedicionParty.findFirst({
      where: { partyId: membresia.partyId, fase: { in: [...ESTADOS_EXPEDICION_PARTY_ACTIVOS] } },
      select: { id: true },
    });
    if (expedicionActiva) {
      throw new PartyServiceError(
        "Primero debe terminar la expedición compartida. Huir del combate no te expulsa de la party.",
        409,
        "PARTY_EXPEDICION_ACTIVA",
      );
    }

    const visitante = await obtenerUsuarioBase(tx, usuarioId);
    exigirPersonajeDisponible(visitante, "tu personaje");
    await exigirSinTrasladoActivo(tx, usuarioId);

    const origen = exigirCoordenadas(membresia.party.liderUsuario.baseCoords, "la base del líder");
    const destino = exigirCoordenadas(visitante.baseCoords, "tu base de origen");
    const transferencia = await crearRegreso(tx, {
      visitanteUsuarioId: usuarioId,
      anfitrionUsuarioId: membresia.party.liderUsuarioId,
      origen,
      destino,
      decision: "salida_voluntaria",
      salida: new Date(),
    });

    await tx.partyMember.delete({ where: { usuarioId } });
    const partyDisuelta = membresia.party.miembros.length <= 2;
    if (partyDisuelta) {
      await tx.partyMember.deleteMany({ where: { partyId: membresia.partyId } });
      await tx.party.update({ where: { id: membresia.partyId }, data: { estado: "disuelta" } });
    }

    return { traslado: transferencia, partyDisuelta };
  }, AISLAMIENTO);
}

export async function disolverParty(liderUsuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const party = await tx.party.findUnique({
      where: { liderUsuarioId },
      include: {
        liderUsuario: { select: { id: true, baseCoords: true, personaje: { select: { id: true, estado: true } } } },
        miembros: {
          include: {
            usuario: { select: { id: true, baseCoords: true, personaje: { select: { id: true, estado: true } }, expedicionActiva: { select: { id: true } } } },
          },
        },
      },
    });
    if (!party || party.estado !== "activa") {
      throw new PartyServiceError("No lideras ninguna party activa.", 409, "SIN_PARTY_LIDERADA");
    }

    const expedicion = await tx.expedicionParty.findFirst({
      where: { partyId: party.id, fase: { in: [...ESTADOS_EXPEDICION_PARTY_ACTIVOS] } },
      orderBy: { creado: "desc" },
      include: {
        participantes: { orderBy: { creado: "asc" }, select: { usuarioId: true, estado: true } },
        combate: { select: { id: true, fase: true } },
      },
    });

    const ahora = new Date();
    let integrantesEnRegreso = 0;
    let expedicionPartyId: string | null = null;

    if (expedicion) {
      // Solo se permite la disolución mientras la party viaja hacia el contrato.
      // Desde la llegada/preparación del combate y durante el combate o retorno,
      // el grupo debe completar el ciclo compartido.
      if (expedicion.fase !== "en_viaje" || expedicion.combate) {
        throw new PartyServiceError(
          "Solo puedes disolver la compañía durante el viaje hacia el contrato, antes de que empiece el combate.",
          409,
          "PARTY_EXPEDICION_ACTIVA",
        );
      }

      const miembrosIds = new Set(party.miembros.map((miembro) => miembro.usuarioId));
      const participantesIds = new Set(expedicion.participantes.filter((p) => p.estado === "en_viaje").map((p) => p.usuarioId));
      if (miembrosIds.size !== participantesIds.size || [...miembrosIds].some((id) => !participantesIds.has(id))) {
        throw new PartyServiceError(
          "La composición de la party ya no coincide con los participantes del viaje.",
          409,
          "PARTY_PARTICIPANTS_MISMATCH",
        );
      }

      const origenCompartido = obtenerPosicionActualExpedicion(expedicion, ahora);
      for (const miembro of party.miembros) {
        if (!miembro.usuario.personaje || miembro.usuario.personaje.estado !== "de_viaje" || miembro.usuario.expedicionActiva) {
          throw new PartyServiceError(
            "Todos los integrantes deben seguir en el viaje compartido para ordenar el regreso.",
            409,
            "MIEMBRO_NO_DISPONIBLE",
          );
        }
        await crearRegresoDesdeExpedicion(tx, {
          visitanteUsuarioId: miembro.usuarioId,
          anfitrionUsuarioId: liderUsuarioId,
          origen: origenCompartido,
          destino: exigirCoordenadas(miembro.usuario.baseCoords, "la base de un integrante"),
          salida: ahora,
        });
        integrantesEnRegreso += 1;
      }

      const participantesRetirados = await tx.expedicionPartyParticipante.updateMany({
        where: { expedicionPartyId: expedicion.id, estado: "en_viaje" },
        data: { estado: "retirado" },
      });
      if (participantesRetirados.count !== party.miembros.length) {
        throw new PartyServiceError("No se pudo retirar a todos los integrantes de la expedición.", 409, "EXPEDICION_PARTY_MODIFICADA");
      }
      const expedicionCancelada = await tx.expedicionParty.updateMany({
        where: { id: expedicion.id, fase: "en_viaje" },
        data: { fase: "cancelada", resultadoFinal: "cancelada" },
      });
      if (expedicionCancelada.count !== 1) {
        throw new PartyServiceError("La expedición acaba de cambiar de fase y no se puede disolver.", 409, "EXPEDICION_PARTY_MODIFICADA");
      }
      expedicionPartyId = expedicion.id;
    } else {
      if (!party.liderUsuario.personaje || party.liderUsuario.personaje.estado !== "ocioso") {
        throw new PartyServiceError("El personaje líder no está disponible en su base.", 409, "LIDER_NO_DISPONIBLE");
      }

      const origen = exigirCoordenadas(party.liderUsuario.baseCoords, "la base del líder");
      const invitados = party.miembros.filter((miembro) => miembro.usuarioId !== liderUsuarioId);
      for (const miembro of invitados) {
        if (!miembro.usuario.personaje || miembro.usuario.personaje.estado !== "ocioso" || miembro.usuario.expedicionActiva) {
          throw new PartyServiceError("Uno de los integrantes no está disponible para regresar.", 409, "MIEMBRO_NO_DISPONIBLE");
        }
        await exigirSinTrasladoActivo(tx, miembro.usuarioId);
        await crearRegreso(tx, {
          visitanteUsuarioId: miembro.usuarioId,
          anfitrionUsuarioId: liderUsuarioId,
          origen,
          destino: exigirCoordenadas(miembro.usuario.baseCoords, "la base de un integrante"),
          decision: "lider_disuelve",
          salida: ahora,
        });
        integrantesEnRegreso += 1;
      }
    }

    await tx.partyMember.deleteMany({ where: { partyId: party.id } });
    await tx.party.update({ where: { id: party.id }, data: { estado: "disuelta" } });
    return { partyDisuelta: true, integrantesEnRegreso, expedicionPartyId };
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
                personaje: { select: { nombre: true, nivel: true, estado: true, clase: true, sexo: true, profesionActivaId: true } },
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
                    personaje: { select: { nombre: true, nivel: true, estado: true, clase: true, sexo: true, profesionActivaId: true } },
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
            personaje: { select: { nombre: true, nivel: true, estado: true, clase: true, sexo: true, profesionActivaId: true } },
          },
        },
        anfitrion: {
          select: {
            id: true,
            nombre: true,
            personaje: { select: { nombre: true, nivel: true, estado: true, clase: true, sexo: true, profesionActivaId: true } },
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
                  personaje: { select: { nombre: true, nivel: true, estado: true, clase: true, sexo: true, profesionActivaId: true } },
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
                      personaje: { select: { nombre: true, nivel: true, estado: true, clase: true, sexo: true, profesionActivaId: true } },
                    },
                  },
                  personaje: { include: incluirPersonajeRecursosParty },
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
              enemigoAtaque: expedicionActivaRaw.combate.enemigoAtaque,
              enemigoDefensa: expedicionActivaRaw.combate.enemigoDefensa,
              enemigoVelocidad: expedicionActivaRaw.combate.enemigoVelocidad,
              enemigoProbCritico: expedicionActivaRaw.combate.enemigoProbCritico,
              enemigoDanoCritico: expedicionActivaRaw.combate.enemigoDanoCritico,
              enemigoNivel: expedicionActivaRaw.combate.enemigoNivel,
              enemigos: expedicionActivaRaw.combate.enemigos,
              efectosEnemigo: expedicionActivaRaw.combate.efectosEnemigo,
              log: expedicionActivaRaw.combate.log,
              ultimaAccion: expedicionActivaRaw.combate.ultimaAccion,
              recompensasResultado: expedicionActivaRaw.combate.recompensasResultado,
              participantes: expedicionActivaRaw.combate.participantes.map((p) => ({
                id: p.id,
                usuarioId: p.usuarioId,
                estado: p.estado,
                ordenTurno: p.ordenTurno,
                jugadorPosicion: p.jugadorPosicion,
                jugadorHp: p.jugadorHp,
                jugadorHpMaximo: p.jugadorHpMaximo,
                jugadorAtaque: p.jugadorAtaque,
                jugadorAtaqueMagico: p.jugadorAtaqueMagico,
                jugadorDefensa: p.jugadorDefensa,
                jugadorDefensaMagica: p.jugadorDefensaMagica,
                jugadorVelocidad: p.jugadorVelocidad,
                jugadorProbCritico: p.jugadorProbCritico,
                jugadorDanoCritico: p.jugadorDanoCritico,
                jugadorPrecision: p.jugadorPrecision,
                jugadorEvasion: p.jugadorEvasion,
                jugadorNivel: p.jugadorNivel,
                ...obtenerRecursosCombatePersona(p.personaje),
                cooldowns: p.cooldowns,
                efectos: p.efectos,
                usuario: p.usuario,
              })),
            }
          : null,
      }
    : null;

  const ultimaExpedicionConResultadoRaw = !expedicionActivaRaw
    ? await prisma.expedicionParty.findFirst({
        where: {
          participantes: { some: { usuarioId } },
          combate: { is: { fase: { in: ["victoria", "derrota", "huida"] } } },
        },
        orderBy: { creado: "desc" },
        select: {
          id: true,
          tipo: true,
          nombre: true,
          dificultad: true,
          modoDificultad: true,
          fechaSalida: true,
          fechaLlegada: true,
          combate: { select: { fase: true, recompensasResultado: true, log: true, enemigos: true, enemigoNombre: true } },
          participantes: {
            orderBy: { creado: "asc" },
            include: {
              usuario: {
                select: {
                  id: true,
                  nombre: true,
                  personaje: { select: { nombre: true, nivel: true, estado: true, clase: true, sexo: true, profesionActivaId: true } },
                },
              },
            },
          },
        },
      })
    : null;
  const ultimoResultadoExpedicion =
    ultimaExpedicionConResultadoRaw?.combate &&
    (ultimaExpedicionConResultadoRaw.combate.fase === "victoria" ||
      ultimaExpedicionConResultadoRaw.combate.fase === "derrota" ||
      ultimaExpedicionConResultadoRaw.combate.fase === "huida")
      ? {
          expedicionPartyId: ultimaExpedicionConResultadoRaw.id,
          fase: ultimaExpedicionConResultadoRaw.combate.fase,
          tipo: ultimaExpedicionConResultadoRaw.tipo,
          nombre: ultimaExpedicionConResultadoRaw.nombre,
          dificultad: ultimaExpedicionConResultadoRaw.dificultad,
          modoDificultad: ultimaExpedicionConResultadoRaw.modoDificultad,
          duracionSegundos: ultimaExpedicionConResultadoRaw.fechaSalida instanceof Date &&
            ultimaExpedicionConResultadoRaw.fechaLlegada instanceof Date
            ? Math.max(0, Math.round((ultimaExpedicionConResultadoRaw.fechaLlegada.getTime() - ultimaExpedicionConResultadoRaw.fechaSalida.getTime()) * 2 / 1000))
            : undefined,
          enemigosDerrotados: [
            ...leerEnemigosEnCombate(ultimaExpedicionConResultadoRaw.combate.enemigos)
              .filter((enemigo) => enemigo.hp <= 0)
              .map((enemigo) => enemigo.nombre),
            ...(ultimaExpedicionConResultadoRaw.combate.fase === "victoria" &&
              leerEnemigosEnCombate(ultimaExpedicionConResultadoRaw.combate.enemigos).filter((enemigo) => enemigo.hp <= 0).length === 0
              ? [ultimaExpedicionConResultadoRaw.combate.enemigoNombre]
              : []),
          ],
          logCombate: Array.isArray(ultimaExpedicionConResultadoRaw.combate.log)
            ? ultimaExpedicionConResultadoRaw.combate.log.filter((linea): linea is string => typeof linea === "string")
            : [],
          recompensas: ultimaExpedicionConResultadoRaw.combate.recompensasResultado,
          participantes: ultimaExpedicionConResultadoRaw.participantes.map((participante) => ({
            usuarioId: participante.usuarioId,
            usuario: participante.usuario,
          })),
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

  // La habilitación de Aceptar/Rechazar debe basarse en el reloj del servidor,
  // no en el reloj local de cada navegador.
  const ahoraServidor = new Date();
  const prepararTrasladoVista = <T extends { fechaLlegada: Date }>(traslado: T) => ({
    ...traslado,
    haLlegadoEnServidor: traslado.fechaLlegada <= ahoraServidor,
  });
  const trasladosPropios = traslados
    .filter((traslado) => traslado.visitanteUsuarioId === usuarioId)
    .map(prepararTrasladoVista);
  const visitasEntrantes = traslados
    .filter(
      (traslado) =>
        traslado.anfitrionUsuarioId === usuarioId &&
        (traslado.estado === "en_viaje" || traslado.estado === "pendiente") &&
        traslado.decision === null,
    )
    .map(prepararTrasladoVista);

  return {
    usuarioId,
    party,
    personajeAcciones: personajeAccionesVista,
    expedicionActiva,
    ultimoResultadoExpedicion,
    trasladosPropios,
    visitasEntrantes,
  };
}
