import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularEstadisticasPersonaje, calcularModificadoresEquipo } from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { seleccionarEnemigosNormales } from "@/lib/expediciones/normal";
import { crearEnemigosEnCombate } from "@/lib/expediciones/enemigos-combate";
import type { DefinicionEnemigo } from "@/lib/tiposJuego";
import { seleccionarJefeElite } from "@/lib/expediciones/elite";
import { aplicarEfectoComida, calcularBonificacionesComida, obtenerComidaTaberna } from "@/lib/comidasTaberna";
import { aplicarModificadoresPosicion, normalizarPosicionCombate } from "@/lib/expediciones/posicion-combate";
import { esModoDificultad } from "@/lib/expediciones/dificultad";
import { crearSecuenciaTurnosVelocidad } from "@/lib/expediciones/iniciativa-combate";
import { PartyServiceError } from "@/server/services/party/party-service";

const AISLAMIENTO = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;

const incluirEquipo = {
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

const incluirPersonaje = {
  habilidades: true,
  progresosClase: true,
  inventario: { include: { objetos: true } },
  equipoEquipado: { include: incluirEquipo },
} satisfies Prisma.PersonajeInclude;

const incluirExpedicionCombate = {
  participantes: {
    orderBy: { creado: "asc" },
    include: { personaje: { include: incluirPersonaje } },
  },
  combate: true,
} satisfies Prisma.ExpedicionPartyInclude;

function obtenerEstadisticasParticipante(participante: {
  usuarioId: string;
  personaje: Prisma.PersonajeGetPayload<{ include: typeof incluirPersonaje }>;
  efectoComida: string | null;
}) {
  const personaje = participante.personaje;
  const equipo = obtenerEquipoDesdePersonaje(personaje);
  const modificadoresEquipo = calcularModificadoresEquipo(equipo, personaje.profesionActivaId);
  const estadisticas = calcularEstadisticasPersonaje(
    personaje,
    personaje.habilidades
      .filter((habilidad) => habilidad.slot !== null)
      .map((habilidad) => ({ habilidadId: habilidad.habilidadId, nivel: habilidad.nivel })),
    modificadoresEquipo,
  );

  const bonificacionesComida = calcularBonificacionesComida({
      ataque: estadisticas.total.ataque,
      ataqueMagico: estadisticas.total.ataqueMagico ?? estadisticas.total.ataque,
      defensa: estadisticas.total.defensa,
      velocidad: estadisticas.total.velocidad,
      probCritico: estadisticas.total.probCritico,
    }, participante.efectoComida, personaje.posicionCombate);
    const atributosConComida = aplicarEfectoComida(
    {
      ataque: estadisticas.total.ataque,
      ataqueMagico: estadisticas.total.ataqueMagico ?? estadisticas.total.ataque,
      defensa: estadisticas.total.defensa,
      velocidad: estadisticas.total.velocidad,
      probCritico: estadisticas.total.probCritico,
    },
    participante.efectoComida,
  );
  const posicion = normalizarPosicionCombate(personaje.posicionCombate);
  const atributos = aplicarModificadoresPosicion({
    ataque: atributosConComida.ataque,
    ataqueMagico: atributosConComida.ataqueMagico,
    defensa: atributosConComida.defensa,
    defensaMagica: estadisticas.total.defensaMagica ?? atributosConComida.defensa,
  }, posicion);

  return {
    usuarioId: participante.usuarioId,
    personajeId: personaje.id,
    personajeNombre: personaje.nombre,
    posicion,
    hpMaximo: Math.max(1, Math.floor(estadisticas.total.hpMaximo)),
    ataque: Math.max(1, Math.floor(atributos.ataque)),
    ataqueMagico: Math.max(1, Math.floor(atributos.ataqueMagico ?? atributosConComida.ataqueMagico)),
    defensa: Math.max(0, Math.floor(atributos.defensa)),
    defensaMagica: Math.max(0, Math.floor(atributos.defensaMagica ?? atributos.defensa)),
    velocidad: Math.max(1, Math.floor(atributosConComida.velocidad)),
    probCritico: atributosConComida.probCritico,
    danoCritico: estadisticas.total.danoCritico,
    precision: estadisticas.total.precision ?? 75,
    evasion: estadisticas.total.evasion ?? 0,
    nivel: personaje.nivel,
    comida: participante.efectoComida,
    bonificacionesComida,
    nombreComida: obtenerComidaTaberna(participante.efectoComida),
  };
}

function validarIdExpedicion(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim().length === 0 || valor.length > 100) {
    throw new PartyServiceError("El identificador de expedición no es válido.", 400, "EXPEDICION_ID_INVALIDO");
  }
  return valor.trim();
}

export async function iniciarCombateParty(usuarioId: string, idDesconocido: unknown) {
  const expedicionPartyId = validarIdExpedicion(idDesconocido);
  return prisma.$transaction(async (tx) => {
    const expedicion = await tx.expedicionParty.findUnique({
      where: { id: expedicionPartyId },
      include: incluirExpedicionCombate,
    });
    if (!expedicion) {
      throw new PartyServiceError("No se encontró la expedición compartida.", 404, "EXPEDICION_PARTY_NO_ENCONTRADA");
    }
    if (!expedicion.participantes.some((participante) => participante.usuarioId === usuarioId)) {
      throw new PartyServiceError("No perteneces a esta expedición compartida.", 403, "NO_ES_PARTICIPANTE");
    }
    if (expedicion.combate && expedicion.fase === "combatiendo") {
      return {
        combatePartyId: expedicion.combate.id,
        expedicionPartyId,
        fase: expedicion.combate.fase,
        ronda: expedicion.combate.ronda,
        faseTurno: expedicion.combate.faseTurno,
        turnoActualUsuarioId: expedicion.combate.turnoActualUsuarioId,
        yaExistia: true,
      };
    }
    if (expedicion.fase !== "lista_para_combate") {
      throw new PartyServiceError("La expedición debe haber llegado al destino antes de iniciar el combate.", 409, "EXPEDICION_PARTY_NO_LISTA");
    }
    if (expedicion.fechaLlegada > new Date()) {
      throw new PartyServiceError("La party todavía está de camino.", 409, "EXPEDICION_PARTY_NO_LLEGADA");
    }
    if (expedicion.tipo !== "normal" && expedicion.tipo !== "elite") {
      throw new PartyServiceError("Solo se pueden iniciar combates compartidos de misiones normales o de élite.", 409, "MISION_PARTY_NO_COMPATIBLE");
    }
    if (expedicion.participantes.length < 2 || expedicion.participantes.length > 3) {
      throw new PartyServiceError("El combate compartido requiere entre dos y tres aventureros.", 409, "NUMERO_MIEMBROS_INVALIDO");
    }
    if (expedicion.participantes.some((participante) =>
      participante.estado !== "en_destino" || participante.personaje.estado !== "de_viaje"
    )) {
      throw new PartyServiceError("Todos los aventureros deben haber llegado al destino.", 409, "PARTICIPANTES_NO_EN_DESTINO");
    }

    let enemigoBase: DefinicionEnemigo;
    let grupoMonstruosBase: DefinicionEnemigo[];
    try {
      if (expedicion.tipo === "elite") {
        if (!expedicion.enemigoId) {
          throw new PartyServiceError("La misión de élite no tiene un jefe asignado.", 409, "JEFE_ELITE_NO_ASIGNADO");
        }
        enemigoBase = seleccionarJefeElite(expedicion.enemigoId);
        grupoMonstruosBase = [enemigoBase];
      } else {
        grupoMonstruosBase = seleccionarEnemigosNormales(expedicion.dificultad, true);
        enemigoBase = grupoMonstruosBase[0];
      }
    } catch (error) {
      if (error instanceof PartyServiceError) throw error;
      throw new PartyServiceError("No se pudo seleccionar el grupo enemigo del combate compartido.", 500, "ENEMIGO_NO_DISPONIBLE");
    }

    const modoDificultad = esModoDificultad(expedicion.modoDificultad)
      ? expedicion.modoDificultad
      : "normal";
    const enemigosEnCombate = crearEnemigosEnCombate(grupoMonstruosBase, modoDificultad);
    const enemigoPrincipal = enemigosEnCombate[0];
    const enemigoHp = enemigoPrincipal.hp;
    const enemigoAtaque = enemigoPrincipal.ataque;
    const enemigoAtaqueMagico = enemigoPrincipal.ataqueMagico;
    const enemigoDefensa = enemigoPrincipal.defensa;
    const enemigoDefensaMagica = enemigoPrincipal.defensaMagica;
    const enemigoVelocidad = enemigoPrincipal.velocidad;
    const enemigoProbCritico = enemigoPrincipal.probCritico;
    const enemigoDanoCritico = enemigoPrincipal.danoCritico;
    const enemigoPrecision = enemigoPrincipal.precision;
    const enemigoEvasion = enemigoPrincipal.evasion;

    const participantesCalculados = expedicion.participantes.map((participante) => {
      if (!participante.personaje) {
        throw new PartyServiceError("Uno de los aventureros ya no tiene personaje.", 409, "PERSONAJE_NO_ENCONTRADO");
      }
      return obtenerEstadisticasParticipante(participante as typeof expedicion.participantes[number] & {
        personaje: Prisma.PersonajeGetPayload<{ include: typeof incluirPersonaje }>;
      });
    }).sort((a, b) => b.velocidad - a.velocidad ||
      expedicion.participantes.findIndex((p) => p.usuarioId === a.usuarioId) -
      expedicion.participantes.findIndex((p) => p.usuarioId === b.usuarioId));

    const turnosPendientes = crearSecuenciaTurnosVelocidad([
      ...participantesCalculados.map((participante) => ({
        actorId: participante.usuarioId,
        equipo: "jugador" as const,
        velocidad: participante.velocidad,
      })),
      ...enemigosEnCombate.map((enemigo) => ({
        actorId: enemigo.id,
        equipo: "enemigo" as const,
        velocidad: enemigo.velocidad,
      })),
    ], `party:${expedicionPartyId}:ronda:1`);
    const turnoInicial = turnosPendientes[0] ?? null;
    const primerTurnoJugador = turnoInicial?.equipo !== "enemigo";

    const nombresEnemigos = enemigosEnCombate.map((enemigo) => enemigo.nombre);
    const resumenEnemigos = nombresEnemigos.length === 1
      ? nombresEnemigos[0]
      : nombresEnemigos.length === 2
        ? nombresEnemigos.join(" y ")
        : nombresEnemigos.slice(0, -1).join(", ") + " y " + nombresEnemigos[nombresEnemigos.length - 1];
    const log = [
      `⚔️ La party se enfrenta a ${resumenEnemigos} (${enemigosEnCombate.length} ${enemigosEnCombate.length === 1 ? "enemigo" : "enemigos"}, amenaza ${expedicion.dificultad}, modo ${modoDificultad}).`,
      ...participantesCalculados.map((participante) =>
        `📍 ${participante.personajeNombre}: ${participante.posicion === "mele" ? "Melé" : participante.posicion === "retaguardia" ? "Retaguardia" : "Centro"}.`
      ),
      ...participantesCalculados
        .filter((participante) => participante.nombreComida)
        .map((participante) => `🍲 ${participante.personajeNombre}: ${participante.nombreComida?.nombre} — ${participante.nombreComida?.descripcion}`),
      primerTurnoJugador
        ? `🟢 La party tiene la iniciativa. Empieza ${participantesCalculados.find((participante) => participante.usuarioId === turnoInicial?.actorId)?.personajeNombre ?? participantesCalculados[0].personajeNombre}.`
        : `🔴 ${enemigosEnCombate.find((enemigo) => enemigo.id === turnoInicial?.actorId)?.nombre ?? enemigoBase.nombre} tiene la iniciativa y actuará primero.`,
    ];

    const combate = await tx.combateParty.create({
      data: {
        expedicionPartyId,
        fase: "activo",
        version: 0,
        ronda: 1,
        faseTurno: turnoInicial?.equipo === "enemigo" ? "enemigo" : "jugador",
        turnoInicialEnemigo: turnoInicial?.equipo === "enemigo",
        turnoActualUsuarioId: turnoInicial?.equipo === "jugador" ? turnoInicial.actorId : null,
        turnosPendientes: turnosPendientes as unknown as Prisma.InputJsonValue,
        enemigoId: enemigoBase.id,
        enemigoNombre: enemigoBase.nombre,
        enemigoHp,
        enemigoHpMaximo: enemigoHp,
        enemigoAtaque,
        enemigoAtaqueMagico,
        enemigoDefensa,
        enemigoDefensaMagica,
        enemigoVelocidad,
        enemigoProbCritico,
        enemigoDanoCritico,
        enemigoPrecision,
        enemigoEvasion,
        enemigoNivel: Math.max(1, enemigoPrincipal.nivel),
        enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
        efectosEnemigo: [],
        log,
      },
    });

    await tx.combatePartyParticipante.createMany({
      data: participantesCalculados.map((participante, ordenTurno) => ({
        combatePartyId: combate.id,
        usuarioId: participante.usuarioId,
        personajeId: participante.personajeId,
        ordenTurno,
        estado: "activo",
        jugadorPosicion: participante.posicion,
        jugadorHp: participante.hpMaximo,
        jugadorHpMaximo: participante.hpMaximo,
        jugadorAtaque: participante.ataque,
        jugadorAtaqueMagico: participante.ataqueMagico,
        jugadorDefensa: participante.defensa,
        jugadorDefensaMagica: participante.defensaMagica,
        jugadorVelocidad: participante.velocidad,
        jugadorProbCritico: participante.probCritico,
        jugadorDanoCritico: participante.danoCritico,
        jugadorPrecision: participante.precision,
        jugadorEvasion: participante.evasion,
        jugadorNivel: participante.nivel,
        cooldowns: {},
        bonificacionesComida: participante.bonificacionesComida,
        efectos: [],
      })),
    });

    const actualizacionExpedicion = await tx.expedicionParty.updateMany({
      where: { id: expedicionPartyId, fase: "lista_para_combate" },
      data: { fase: "combatiendo" },
    });
    if (actualizacionExpedicion.count !== 1) {
      throw new PartyServiceError("El estado de la expedición cambió mientras se iniciaba el combate.", 409, "EXPEDICION_PARTY_MODIFICADA");
    }

    await tx.expedicionPartyParticipante.updateMany({
      where: { expedicionPartyId, estado: "en_destino" },
      data: { estado: "activo" },
    });

    for (const participante of participantesCalculados) {
      const actualizado = await tx.personaje.updateMany({
        where: { id: participante.personajeId, estado: "de_viaje" },
        data: { estado: "combatiendo", hpActual: participante.hpMaximo },
      });
      if (actualizado.count !== 1) {
        throw new PartyServiceError("El estado de un personaje cambió durante el inicio del combate.", 409, "PERSONAJE_MODIFICADO");
      }
    }

    return {
      combatePartyId: combate.id,
      expedicionPartyId,
      fase: combate.fase,
      ronda: combate.ronda,
      faseTurno: combate.faseTurno,
      turnoActualUsuarioId: combate.turnoActualUsuarioId,
      yaExistia: false,
    };
  }, AISLAMIENTO);
}
