import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resolverAtaqueEnemigo,
  resolverAtaqueJugador,
  resolverHabilidadJugador,
  type AccionAnimadaCombate,
} from "@/lib/expediciones/combate";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/niveles-habilidad";
import { puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "@/lib/tiposJuego";
import {
  calcularAtaqueModificado,
  calcularEvasionModificada,
  calcularPrecisionModificada,
  leerEfectosCombate,
  procesarTicksPeriodicos,
  avanzarEfectosCombate,
} from "@/lib/expediciones/estados-combate";
import {
  calcularSiguienteTurnoParty,
  obtenerParticipantesVivos,
  resolverResultadoCombateParty,
  type ParticipanteTurnoParty,
} from "@/lib/party/combate-reglas";
import { PartyServiceError } from "@/server/services/party/party-service";
import { reducirCooldowns, obtenerCooldowns } from "@/server/services/combate/accion-combate";
import { calcularFechaLlegadaParty } from "@/lib/party/expedicion-reglas";
import { calcularDistanciaKm } from "@/lib/utils";
import { leerCoordenadasBase } from "@/lib/party/reglas";

const AISLAMIENTO = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;

function validarExpedicionId(valor: unknown): string {
  if (typeof valor !== "string" || !valor.trim() || valor.length > 100) {
    throw new PartyServiceError("El identificador de expedición no es válido.", 400, "EXPEDICION_ID_INVALIDO");
  }
  return valor.trim();
}

function obtenerLog(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((entrada): entrada is string => typeof entrada === "string").slice(-120)
    : [];
}

function obtenerEfectos(valor: unknown) {
  return leerEfectosCombate(valor);
}

function obtenerEstadoParticipantes(
  participantes: Array<{ usuarioId: string; ordenTurno: number; jugadorHp: number; estado: string }>,
): ParticipanteTurnoParty[] {
  return participantes.map((participante) => ({
    usuarioId: participante.usuarioId,
    ordenTurno: participante.ordenTurno,
    jugadorHp: participante.jugadorHp,
    estado: participante.estado,
  }));
}

async function cargarCombateParty(tx: Prisma.TransactionClient, expedicionPartyId: string) {
  const combate = await tx.combateParty.findUnique({
    where: { expedicionPartyId },
    include: { participantes: { orderBy: { ordenTurno: "asc" } } },
  });
  if (!combate) {
    throw new PartyServiceError("La expedición todavía no tiene un combate inicializado.", 409, "COMBATE_PARTY_NO_INICIADO");
  }
  const expedicion = await tx.expedicionParty.findUnique({
    where: { id: expedicionPartyId },
    select: { fase: true },
  });
  if (!expedicion || expedicion.fase !== "combatiendo") {
    throw new PartyServiceError("La expedición ya no está en fase de combate.", 409, "EXPEDICION_PARTY_NO_COMBATIENDO");
  }
  return combate;
}

function registrarResultadoTerminal(
  enemigoHp: number,
  participantes: ParticipanteTurnoParty[],
): "activo" | "victoria" | "derrota" {
  return resolverResultadoCombateParty(enemigoHp, participantes);
}

function prepararSiguienteTurno(
  combate: {
    fase: string;
    faseTurno: string;
    turnoActualUsuarioId: string | null;
    ronda: number;
    turnoInicialEnemigo: boolean;
  },
  participantes: ParticipanteTurnoParty[],
) {
  return calcularSiguienteTurnoParty({
    faseCombate: "activo",
    faseTurno: combate.faseTurno as "jugador" | "enemigo",
    turnoActualUsuarioId: combate.turnoActualUsuarioId,
    ronda: combate.ronda,
    turnoInicialEnemigo: combate.turnoInicialEnemigo,
  }, participantes);
}

async function iniciarRegresoParty(
  tx: Prisma.TransactionClient,
  expedicionPartyId: string,
  resultadoFinal: "exito" | "derrota",
) {
  const expedicion = await tx.expedicionParty.findUnique({
    where: { id: expedicionPartyId },
    include: {
      participantes: {
        orderBy: { creado: "asc" },
        include: { usuario: { select: { id: true, baseCoords: true, personaje: { select: { estado: true } } } } },
      },
    },
  });
  if (!expedicion) {
    throw new PartyServiceError("No se encontró la expedición para iniciar el regreso.", 404, "EXPEDICION_PARTY_NO_ENCONTRADA");
  }
  if (expedicion.fase === "regresando" && expedicion.resultadoFinal === resultadoFinal) {
    return { fase: "regresando", regresoYaIniciado: true, fechaLlegada: expedicion.fechaLlegada };
  }
  if (expedicion.fase !== "combatiendo") {
    throw new PartyServiceError("La expedición no está disponible para iniciar el regreso.", 409, "EXPEDICION_PARTY_NO_COMBATIENDO");
  }
  const origenRaw = leerCoordenadasBase(expedicion.destinoCoords);
  const destinoRaw = leerCoordenadasBase(expedicion.origenCoords);
  if (!origenRaw || !destinoRaw) {
    throw new PartyServiceError("La expedición no tiene coordenadas de origen y destino válidas para regresar.", 409, "COORDENADAS_REGRESO_NO_DISPONIBLES");
  }

  const participantes = expedicion.participantes;
  if (participantes.length < 2 || participantes.length > 3) {
    throw new PartyServiceError("La expedición no tiene una composición válida para regresar.", 409, "NUMERO_MIEMBROS_INVALIDO");
  }
  const velocidades = participantes.map((participante) => participante.velocidadViajeKmh);
  if (velocidades.some((velocidad) => !Number.isFinite(velocidad) || velocidad <= 0)) {
    throw new PartyServiceError("La expedición no conserva velocidades válidas para calcular el regreso.", 409, "VELOCIDAD_REGRESO_NO_DISPONIBLE");
  }
  const velocidadRegreso = Math.min(...velocidades);
  const distanciaRegreso = calcularDistanciaKm(origenRaw.lat, origenRaw.lng, destinoRaw.lat, destinoRaw.lng);
  const salida = new Date();
  const fechaLlegada = calcularFechaLlegadaParty(distanciaRegreso, velocidades, 1, salida);
  const actualizado = await tx.expedicionParty.updateMany({
    where: { id: expedicionPartyId, fase: "combatiendo" },
    data: {
      fase: "regresando",
      resultadoFinal,
      fechaSalida: salida,
      fechaLlegada,
    },
  });
  if (actualizado.count !== 1) {
    throw new PartyServiceError("El resultado de combate ya se está procesando.", 409, "EXPEDICION_PARTY_MODIFICADA");
  }

  await tx.expedicionPartyParticipante.updateMany({
    where: { expedicionPartyId, estado: { in: ["activo", "caido", "en_destino"] } },
    data: { estado: "regresando" },
  });
  for (const participante of participantes) {
    const personaje = await tx.personaje.updateMany({
      where: { id: participante.personajeId, usuarioId: participante.usuarioId, estado: "combatiendo" },
      data: { estado: "de_viaje" },
    });
    if (personaje.count !== 1) {
      throw new PartyServiceError("El estado de un personaje cambió al comenzar el regreso.", 409, "PERSONAJE_MODIFICADO");
    }
  }
  return {
    fase: "regresando",
    resultadoFinal,
    fechaSalida: salida.toISOString(),
    fechaLlegada: fechaLlegada.toISOString(),
    velocidadRegreso,
  };
}

type PersonajeAccionParty = {
  id: string;
  profesionActivaId: string;
  energiaActual: number;
  manaActual: number;
  habilidades: { habilidadId: string; nivel: number; slot: string | null }[];
  inventario: { id: string; objetos: { id: string; objetoId: string; cantidad: number }[] } | null;
};

async function cargarPersonajeAccionParty(tx: Prisma.TransactionClient, usuarioId: string): Promise<PersonajeAccionParty> {
  const personaje = await tx.personaje.findUnique({
    where: { usuarioId },
    select: {
      id: true,
      profesionActivaId: true,
      energiaActual: true,
      manaActual: true,
      habilidades: { select: { habilidadId: true, nivel: true, slot: true } },
      inventario: { select: { id: true, objetos: { select: { id: true, objetoId: true, cantidad: true } } } },
    },
  });
  if (!personaje) {
    throw new PartyServiceError("No se encontró tu personaje.", 404, "PERSONAJE_NO_ENCONTRADO");
  }
  return personaje;
}

function convertirEfectos(valor: unknown): EstadoEfectoHabilidad[] {
  return obtenerEfectos(valor) as EstadoEfectoHabilidad[];
}

function validarCostesHabilidad(personaje: PersonajeAccionParty, habilidad: DefinicionHabilidad) {
  const costeEnergia = Math.max(0, Math.floor(habilidad.costeEnergia ?? 0));
  const costeMana = Math.max(0, Math.floor(habilidad.costeMana ?? 0));
  if (personaje.energiaActual < costeEnergia) {
    throw new PartyServiceError(`No tienes Energía suficiente. Necesitas ${costeEnergia}.`, 409, "ENERGIA_INSUFICIENTE");
  }
  if (personaje.manaActual < costeMana) {
    throw new PartyServiceError(`No tienes Maná suficiente. Necesitas ${costeMana}.`, 409, "MANA_INSUFICIENTE");
  }
}

async function gastarCostesHabilidad(
  tx: Prisma.TransactionClient,
  personaje: PersonajeAccionParty,
  habilidad: DefinicionHabilidad,
) {
  const costeEnergia = Math.max(0, Math.floor(habilidad.costeEnergia ?? 0));
  const costeMana = Math.max(0, Math.floor(habilidad.costeMana ?? 0));
  if (costeEnergia === 0 && costeMana === 0) return;
  const resultado = await tx.personaje.updateMany({
    where: {
      id: personaje.id,
      energiaActual: { gte: costeEnergia },
      manaActual: { gte: costeMana },
    },
    data: {
      energiaActual: { decrement: costeEnergia },
      manaActual: { decrement: costeMana },
    },
  });
  if (resultado.count !== 1) {
    throw new PartyServiceError("Los recursos cambiaron antes de ejecutar la habilidad.", 409, "RECURSOS_COMBATE_MODIFICADOS");
  }
}

export async function ejecutarAccionCombateParty(
  usuarioId: string,
  idDesconocido: unknown,
  accionDesconocida: unknown,
  payload?: { habilidadId?: unknown; objetoInventarioId?: unknown },
) {
  const expedicionPartyId = validarExpedicionId(idDesconocido);
  if (accionDesconocida !== "atacar" && accionDesconocida !== "usar_habilidad" && accionDesconocida !== "usar_objeto") {
    throw new PartyServiceError("Acción de combate no válida.", 400, "ACCION_PARTY_NO_DISPONIBLE");
  }

  return prisma.$transaction(async (tx) => {
    const combate = await cargarCombateParty(tx, expedicionPartyId);
    if (combate.fase !== "activo") {
      throw new PartyServiceError("El combate ya ha terminado.", 409, "COMBATE_PARTY_TERMINADO");
    }
    if (combate.faseTurno !== "jugador" || combate.turnoActualUsuarioId !== usuarioId) {
      throw new PartyServiceError("No es tu turno de combate.", 409, "NO_ES_TU_TURNO");
    }

    const participante = combate.participantes.find((p) => p.usuarioId === usuarioId);
    if (!participante || participante.estado !== "activo" || participante.jugadorHp <= 0) {
      throw new PartyServiceError("Tu aventurero no puede actuar en este combate.", 409, "PARTICIPANTE_NO_ACTIVO");
    }

    const personaje = await cargarPersonajeAccionParty(tx, usuarioId);
    let efectosJugador = convertirEfectos(participante.efectos);
    let efectosEnemigo = convertirEfectos(combate.efectosEnemigo);
    const cooldowns = obtenerCooldowns(participante.cooldowns);
    let enemigoHp = combate.enemigoHp;
    let jugadorHp = participante.jugadorHp;
    let jugadorDefensa = participante.jugadorDefensa;
    let enemigoDefensa = combate.enemigoDefensa;
    let habilidad: DefinicionHabilidad | null = null;
    let objetoConsumible: { inventarioObjetoId: string; objetoId: string; curacion: number; nombre: string } | null = null;
    let accion: AccionAnimadaCombate;

    if (accionDesconocida === "atacar") {
      accion = resolverAtaqueJugador({
        jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
        jugadorNivel: participante.jugadorNivel,
        jugadorProbCritico: participante.jugadorProbCritico,
        jugadorDanoCritico: participante.jugadorDanoCritico,
        jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
        enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion, efectosEnemigo),
        enemigoDefensa,
        enemigoNombre: combate.enemigoNombre,
      });
    } else if (accionDesconocida === "usar_habilidad") {
      if (typeof payload?.habilidadId !== "string" || !payload.habilidadId.trim()) {
        throw new PartyServiceError("Debes indicar una habilidad.", 400, "HABILIDAD_ID_REQUERIDO");
      }
      const habilidadAprendida = personaje.habilidades.find(
        (aprendida) =>
          aprendida.habilidadId === payload.habilidadId &&
          ["activa_1", "activa_2", "activa_3"].includes(aprendida.slot ?? ""),
      );
      if (!habilidadAprendida) {
        throw new PartyServiceError("No tienes esa habilidad equipada en una ranura activa.", 403, "HABILIDAD_NO_EQUIPADA");
      }
      const definicion = obtenerHabilidadPorId(habilidadAprendida.habilidadId);
      if (!definicion) {
        throw new PartyServiceError("No se encontró la definición de la habilidad.", 404, "HABILIDAD_NO_ENCONTRADA");
      }
      habilidad = ajustarHabilidadPorNivel(definicion, habilidadAprendida.nivel);
      if (habilidad.tipo !== "activa") {
        throw new PartyServiceError("Solo puedes utilizar habilidades activas durante el combate.", 400, "HABILIDAD_NO_ACTIVA");
      }
      if (!puedeUsarHabilidadDeClase(personaje.profesionActivaId || "novato", habilidad.claseId)) {
        throw new PartyServiceError("Tu profesión no puede utilizar esa habilidad.", 403, "HABILIDAD_CLASE_NO_VALIDA");
      }
      if ((cooldowns[habilidad.id] ?? 0) > 0) {
        throw new PartyServiceError(`Esta habilidad está en cooldown durante ${cooldowns[habilidad.id]} turno(s).`, 409, "HABILIDAD_EN_COOLDOWN");
      }
      validarCostesHabilidad(personaje, habilidad);

      const resultado = resolverHabilidadJugador(habilidad, {
        jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
        jugadorAtaqueMagico: calcularAtaqueModificado(participante.jugadorAtaqueMagico, efectosJugador, true),
        jugadorProbCritico: participante.jugadorProbCritico,
        jugadorDanoCritico: participante.jugadorDanoCritico,
        jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
        enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion, efectosEnemigo),
        jugadorDefensa,
        jugadorDefensaMagica: participante.jugadorDefensaMagica,
        jugadorNivel: participante.jugadorNivel,
        jugadorHp,
        jugadorHpMaximo: participante.jugadorHpMaximo,
        enemigoDefensa,
        enemigoDefensaMagica: combate.enemigoDefensaMagica,
        enemigoNombre: combate.enemigoNombre,
        efectosJugador,
      });
      accion = resultado.accion;
      jugadorHp = resultado.jugadorHp;
      jugadorDefensa = resultado.jugadorDefensa;
      enemigoDefensa = resultado.enemigoDefensa;
      enemigoHp = Math.max(0, enemigoHp - accion.dano);
      efectosJugador = [
        ...efectosJugador.filter((efecto) => !resultado.efectosJugadorActualizados?.some((actualizado) =>
          actualizado.habilidadId === efecto.habilidadId && actualizado.objetivo === efecto.objetivo)),
        ...(resultado.efectosJugadorActualizados ?? []),
        ...resultado.efectos.filter((efecto) => efecto.objetivo === "jugador"),
      ];
      efectosEnemigo = [
        ...efectosEnemigo.filter((efecto) => !resultado.efectos.some((nuevo) =>
          nuevo.habilidadId === efecto.habilidadId && nuevo.objetivo === "enemigo")),
        ...resultado.efectos.filter((efecto) => efecto.objetivo === "enemigo"),
      ];
      if ((habilidad.cooldownTurnos ?? 0) > 0) cooldowns[habilidad.id] = habilidad.cooldownTurnos!;
      await gastarCostesHabilidad(tx, personaje, habilidad);
    } else {
      if (typeof payload?.objetoInventarioId !== "string" || !payload.objetoInventarioId.trim()) {
        throw new PartyServiceError("Debes seleccionar una poción del inventario.", 400, "OBJETO_ID_REQUERIDO");
      }
      const item = personaje.inventario?.objetos.find((entrada) => entrada.id === payload.objetoInventarioId);
      if (!item || item.cantidad < 1) {
        throw new PartyServiceError("No tienes ese objeto en el inventario.", 404, "OBJETO_NO_DISPONIBLE");
      }
      const definicion = obtenerObjetoPorId(item.objetoId);
      if (!definicion || definicion.tipo !== "consumible" || !Number.isFinite(definicion.curacion) || (definicion.curacion ?? 0) <= 0) {
        throw new PartyServiceError("Solo se pueden usar consumibles de curación durante el combate.", 400, "OBJETO_NO_USABLE");
      }
      const curacion = Math.min(Math.floor(definicion.curacion ?? 0), participante.jugadorHpMaximo - jugadorHp);
      if (curacion <= 0) {
        throw new PartyServiceError("Tu aventurero ya tiene la salud al máximo.", 409, "VIDA_AL_MAXIMO");
      }
      objetoConsumible = { inventarioObjetoId: item.id, objetoId: item.objetoId, curacion, nombre: definicion.nombre };
      jugadorHp += curacion;
      accion = {
        actor: "jugador",
        tipo: "habilidad",
        animacion: "curacion",
        dano: 0,
        curacion,
        critico: false,
        texto: `Usas ${definicion.nombre} y recuperas ${curacion} puntos de vida.`,
      };
    }

    enemigoHp = Math.max(0, enemigoHp - accion.dano);
    const estadoParticipantes = obtenerEstadoParticipantes(combate.participantes).map((p) =>
      p.usuarioId === usuarioId ? { ...p, jugadorHp, estado: jugadorHp > 0 ? "activo" : "caido" } : p,
    );
    const resultadoTerminal = registrarResultadoTerminal(enemigoHp, estadoParticipantes);
    const log = obtenerLog(combate.log);
    log.push(accion.texto);

    let faseTurno: "jugador" | "enemigo" = "enemigo";
    let turnoActualUsuarioId: string | null = null;
    let ronda = combate.ronda;
    let fase = "activo";
    if (resultadoTerminal === "victoria") {
      fase = "victoria";
      log.push(`🏆 ¡${combate.enemigoNombre} ha sido derrotado!`);
    } else if (resultadoTerminal === "derrota") {
      fase = "derrota";
      log.push("💀 Todos los aventureros han caído.");
    } else {
      const siguiente = prepararSiguienteTurno(combate, estadoParticipantes);
      faseTurno = siguiente.faseTurno;
      turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
      ronda = siguiente.ronda;
    }

    // Todos los cambios de recursos/inventario y el avance del turno son atómicos.
    const actualizado = await tx.combateParty.updateMany({
      where: {
        id: combate.id,
        version: combate.version,
        fase: "activo",
        faseTurno: "jugador",
        turnoActualUsuarioId: usuarioId,
      },
      data: {
        version: { increment: 1 },
        fase,
        faseTurno,
        turnoActualUsuarioId,
        ronda,
        turnoInicialEnemigo: false,
        enemigoHp,
        enemigoDefensa,
        efectosEnemigo: efectosEnemigo as unknown as Prisma.InputJsonValue,
        log: log as unknown as Prisma.InputJsonValue,
        ultimaAccion: accion as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El combate ha cambiado mientras se resolvía tu acción. Actualiza e inténtalo de nuevo.", 409, "COMBATE_PARTY_MODIFICADO");
    }

    const participanteActualizado = await tx.combatePartyParticipante.updateMany({
      where: { id: participante.id, jugadorHp: participante.jugadorHp },
      data: {
        jugadorHp,
        jugadorDefensa,
        estado: jugadorHp > 0 ? "activo" : "caido",
        efectos: efectosJugador as unknown as Prisma.InputJsonValue,
        cooldowns: cooldowns as unknown as Prisma.InputJsonValue,
      },
    });
    if (participanteActualizado.count !== 1) {
      throw new PartyServiceError("El estado individual del aventurero cambió durante la acción.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
    }

    const personajeActualizado = await tx.personaje.updateMany({
      where: { id: personaje.id, usuarioId, estado: "combatiendo" },
      data: { hpActual: jugadorHp },
    });
    if (personajeActualizado.count !== 1) {
      throw new PartyServiceError("No se pudo sincronizar la salud del aventurero.", 409, "PERSONAJE_PARTY_MODIFICADO");
    }

    if (objetoConsumible) {
      const consumido = await tx.inventarioObjeto.updateMany({
        where: { id: objetoConsumible.inventarioObjetoId, cantidad: { gte: 1 } },
        data: { cantidad: { decrement: 1 } },
      });
      if (consumido.count !== 1) {
        throw new PartyServiceError("El consumible ya no está disponible.", 409, "OBJETO_PARTY_MODIFICADO");
      }
      await tx.inventarioObjeto.deleteMany({ where: { id: objetoConsumible.inventarioObjetoId, cantidad: { lte: 0 } } });
    }

    const regreso = fase === "victoria" || fase === "derrota"
      ? await iniciarRegresoParty(tx, expedicionPartyId, fase === "victoria" ? "exito" : "derrota")
      : null;

    return {
      expedicionPartyId,
      combatePartyId: combate.id,
      fase,
      ronda,
      faseTurno,
      turnoActualUsuarioId,
      enemigoHp,
      jugadorHp,
      ...(regreso ? { regreso } : {}),
      accion,
    };
  }, AISLAMIENTO);
}

export async function ejecutarTurnoEnemigoParty(usuarioId: string, idDesconocido: unknown) {
  const expedicionPartyId = validarExpedicionId(idDesconocido);
  return prisma.$transaction(async (tx) => {
    const combate = await cargarCombateParty(tx, expedicionPartyId);
    if (!combate.participantes.some((p) => p.usuarioId === usuarioId)) {
      throw new PartyServiceError("No perteneces a este combate.", 403, "NO_ES_PARTICIPANTE");
    }
    if (combate.fase !== "activo") {
      return {
        expedicionPartyId,
        combatePartyId: combate.id,
        fase: combate.fase,
        yaTerminado: true,
      };
    }
    if (combate.faseTurno !== "enemigo") {
      throw new PartyServiceError("Todavía no corresponde el turno del enemigo.", 409, "NO_ES_TURNO_ENEMIGO");
    }

    const log = obtenerLog(combate.log);
    let enemigoHp = combate.enemigoHp;
    let enemigoDefensa = combate.enemigoDefensa;
    let efectosEnemigo = obtenerEfectos(combate.efectosEnemigo);
    const ticks = procesarTicksPeriodicos(
      efectosEnemigo,
      enemigoHp,
      combate.enemigoHpMaximo,
      combate.enemigoNombre,
    );
    enemigoHp = ticks.hp;
    log.push(...ticks.mensajes);

    let accion: AccionAnimadaCombate;
    const objetivo = obtenerParticipantesVivos(obtenerEstadoParticipantes(combate.participantes))
      .map((vivo) => combate.participantes.find((p) => p.usuarioId === vivo.usuarioId)!)
      .sort((a, b) =>
        a.jugadorHp / Math.max(1, a.jugadorHpMaximo) -
        b.jugadorHp / Math.max(1, b.jugadorHpMaximo) ||
        a.ordenTurno - b.ordenTurno,
      )[0];

    if (enemigoHp <= 0) {
      accion = {
        actor: "enemigo",
        tipo: "fallo",
        animacion: "ofensiva",
        dano: 0,
        critico: false,
        texto: `🏆 ${combate.enemigoNombre} cae por los efectos acumulados.`,
      };
    } else if (!objetivo) {
      accion = {
        actor: "enemigo",
        tipo: "fallo",
        animacion: "ofensiva",
        dano: 0,
        critico: false,
        texto: "No quedan aventureros capaces de continuar.",
      };
    } else {
      const efectosObjetivo = obtenerEfectos(objetivo.efectos);
      accion = resolverAtaqueEnemigo({
        enemigoAtaque: calcularAtaqueModificado(combate.enemigoAtaque, efectosEnemigo),
        enemigoProbCritico: combate.enemigoProbCritico,
        enemigoDanoCritico: combate.enemigoDanoCritico,
        enemigoPrecision: calcularPrecisionModificada(combate.enemigoPrecision, efectosEnemigo),
        jugadorEvasion: calcularEvasionModificada(objetivo.jugadorEvasion, efectosObjetivo),
        jugadorDefensa: objetivo.jugadorDefensa,
        enemigoNombre: combate.enemigoNombre,
      });
    }
    log.push(accion.texto);

    // El cooldown avanza una vez por ronda completa, al terminar el turno enemigo.
    for (const miembro of combate.participantes) {
      const valor = miembro.cooldowns;
      const bruto = valor && typeof valor === "object" && !Array.isArray(valor)
        ? Object.fromEntries(Object.entries(valor).filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0))
        : {};
      const cooldownsReducidos = reducirCooldowns(bruto as Record<string, number>);
      const guardado = await tx.combatePartyParticipante.updateMany({
        where: { id: miembro.id, combatePartyId: combate.id },
        data: { cooldowns: cooldownsReducidos as unknown as Prisma.InputJsonValue },
      });
      if (guardado.count !== 1) {
        throw new PartyServiceError("No se pudieron actualizar los cooldowns de la party.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
      }
    }

    let participantesActualizados = obtenerEstadoParticipantes(combate.participantes);
    if (objetivo && enemigoHp > 0) {
      const nuevoHp = Math.max(0, objetivo.jugadorHp - accion.dano);
      const caido = nuevoHp <= 0;
      const actualizadoParticipante = await tx.combatePartyParticipante.updateMany({
        where: {
          id: objetivo.id,
          combatePartyId: combate.id,
          estado: "activo",
          jugadorHp: objetivo.jugadorHp,
        },
        data: {
          jugadorHp: nuevoHp,
          estado: caido ? "caido" : "activo",
        },
      });
      if (actualizadoParticipante.count !== 1) {
        throw new PartyServiceError("El estado del aventurero cambió durante el turno enemigo.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
      }
      const personajeActualizado = await tx.personaje.updateMany({
        where: {
          id: objetivo.personajeId,
          usuarioId: objetivo.usuarioId,
          estado: "combatiendo",
        },
        data: { hpActual: nuevoHp },
      });
      if (personajeActualizado.count !== 1) {
        throw new PartyServiceError("El personaje ya no está disponible para recibir el resultado del turno enemigo.", 409, "PERSONAJE_MODIFICADO");
      }
      if (caido) log.push(`💀 ${objetivo.usuarioId} ha caído en combate.`);
      participantesActualizados = participantesActualizados.map((p) =>
        p.usuarioId === objetivo!.usuarioId
          ? { ...p, jugadorHp: nuevoHp, estado: caido ? "caido" : "activo" }
          : p,
      );
    }

    const resultado = registrarResultadoTerminal(enemigoHp, participantesActualizados);
    let fase = "activo";
    let faseTurno: "jugador" | "enemigo" = "jugador";
    let turnoActualUsuarioId: string | null = null;
    let ronda = combate.ronda;

    if (resultado === "victoria") {
      fase = "victoria";
      faseTurno = "enemigo";
      log.push(`🏆 ¡${combate.enemigoNombre} ha sido derrotado!`);
    } else if (resultado === "derrota") {
      fase = "derrota";
      faseTurno = "enemigo";
      log.push("💀 Todos los aventureros han caído.");
    } else {
      const siguiente = prepararSiguienteTurno(combate, participantesActualizados);
      faseTurno = siguiente.faseTurno;
      turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
      ronda = siguiente.ronda;
    }

    const avancesEfectos = avanzarEfectosCombate(efectosEnemigo, enemigoDefensa);
    efectosEnemigo = avancesEfectos.efectos;
    enemigoDefensa = avancesEfectos.defensa;
    log.push(...avancesEfectos.mensajes);

    const actualizado = await tx.combateParty.updateMany({
      where: {
        id: combate.id,
        version: combate.version,
        fase: "activo",
        faseTurno: "enemigo",
      },
      data: {
        version: { increment: 1 },
        fase,
        faseTurno,
        turnoActualUsuarioId,
        ronda,
        turnoInicialEnemigo: false,
        enemigoHp,
        enemigoDefensa,
        efectosEnemigo: efectosEnemigo as unknown as Prisma.InputJsonValue,
        log: log as unknown as Prisma.InputJsonValue,
        ultimaAccion: accion as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El turno enemigo ya se procesó en otra petición.", 409, "COMBATE_PARTY_MODIFICADO");
    }

    const regreso = fase === "victoria" || fase === "derrota"
      ? await iniciarRegresoParty(tx, expedicionPartyId, fase === "victoria" ? "exito" : "derrota")
      : null;

    return {
      expedicionPartyId,
      combatePartyId: combate.id,
      fase,
      ronda,
      faseTurno,
      turnoActualUsuarioId,
      enemigoHp,
      objetivoUsuarioId: objetivo?.usuarioId ?? null,
      ...(regreso ? { regreso } : {}),
      accion,
    };
  }, AISLAMIENTO);
}
