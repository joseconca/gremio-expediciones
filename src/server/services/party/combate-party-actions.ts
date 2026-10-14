import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resolverAtaqueEnemigo,
  resolverAtaqueJugador,
  type AccionAnimadaCombate,
} from "@/lib/expediciones/combate";
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

export async function ejecutarAccionCombateParty(
  usuarioId: string,
  idDesconocido: unknown,
  accionDesconocida: unknown,
) {
  const expedicionPartyId = validarExpedicionId(idDesconocido);
  if (accionDesconocida !== "atacar") {
    throw new PartyServiceError(
      "De momento solo está disponible el ataque básico; habilidades y objetos se integrarán en el siguiente subpaso.",
      400,
      "ACCION_PARTY_NO_DISPONIBLE",
    );
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

    const efectosJugador = obtenerEfectos(participante.efectos);
    const efectosEnemigo = obtenerEfectos(combate.efectosEnemigo);
    const accion = resolverAtaqueJugador({
      jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
      jugadorNivel: participante.jugadorNivel,
      jugadorProbCritico: participante.jugadorProbCritico,
      jugadorDanoCritico: participante.jugadorDanoCritico,
      jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
      enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion, efectosEnemigo),
      enemigoDefensa: combate.enemigoDefensa,
      enemigoNombre: combate.enemigoNombre,
    });

    const enemigoHp = Math.max(0, combate.enemigoHp - accion.dano);
    const estadoParticipantes = obtenerEstadoParticipantes(combate.participantes);
    const resultado = registrarResultadoTerminal(enemigoHp, estadoParticipantes);
    const log = obtenerLog(combate.log);
    log.push(accion.texto);

    let faseTurno: "jugador" | "enemigo" = "enemigo";
    let turnoActualUsuarioId: string | null = null;
    let ronda = combate.ronda;
    let fase = "activo";
    if (resultado === "victoria") {
      fase = "victoria";
      log.push(`🏆 ¡${combate.enemigoNombre} ha sido derrotado!`);
    } else if (resultado === "derrota") {
      fase = "derrota";
      log.push("💀 Todos los aventureros han caído.");
    } else {
      const siguiente = prepararSiguienteTurno(combate, estadoParticipantes);
      faseTurno = siguiente.faseTurno;
      turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
      ronda = siguiente.ronda;
    }

    // La escritura con versión se ejecuta al final de la transacción. Si otra
    // petición gastó este turno, se lanza un error y se revierte todo.
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
        log: log as unknown as Prisma.InputJsonValue,
        ultimaAccion: accion as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El combate ha cambiado mientras se resolvía tu acción. Actualiza e inténtalo de nuevo.", 409, "COMBATE_PARTY_MODIFICADO");
    }

    return {
      expedicionPartyId,
      combatePartyId: combate.id,
      fase,
      ronda,
      faseTurno,
      turnoActualUsuarioId,
      enemigoHp,
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
    let objetivo = obtenerParticipantesVivos(obtenerEstadoParticipantes(combate.participantes))
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

    return {
      expedicionPartyId,
      combatePartyId: combate.id,
      fase,
      ronda,
      faseTurno,
      turnoActualUsuarioId,
      enemigoHp,
      objetivoUsuarioId: objetivo?.usuarioId ?? null,
      accion,
    };
  }, AISLAMIENTO);
}
