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
import { calcularEstadisticasPersonaje, calcularModificadoresEquipo } from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { obtenerPresentacionAtaqueBasico, usaAtaqueMagicoBasico } from "@/lib/expediciones/presentacion-combate";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/niveles-habilidad";
import { puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "@/lib/tiposJuego";
import {
  calcularAtaqueModificado,
  calcularEvasionModificada,
  calcularPrecisionModificada,
  leerEfectosCombate,
  avanzarEfectosCombate,
  procesarEfectosTurno,
  aplicarBarreraAccion,
  retirarEfectosHabilidad,
} from "@/lib/expediciones/estados-combate";
import {
  resolverResultadoCombateParty,
  type ParticipanteTurnoParty,
} from "@/lib/party/combate-reglas";
import {
  avanzarSecuenciaTurnosVelocidad,
  crearSecuenciaTurnosVelocidad,
  normalizarSecuenciaTurnosVelocidad,
  type ActorTurnoVelocidad,
  type PasoTurnoVelocidad,
} from "@/lib/expediciones/iniciativa-combate";
import { PartyServiceError } from "@/server/services/party/party-service";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { tirarBotinEnemigo } from "@/lib/lootObjetos";
import { LIMITE_INVENTARIO_OBJETOS } from "@/lib/inventario";
import { experienciaParaNivel } from "@/lib/configuracionJuego";
import {
  aplicarMultiplicadorRecompensa,
  calcularExperienciaBaseGanada,
  calcularOroEnemigo,
  esModoDificultad,
  registrarVictoriaRangoNormal,
} from "@/lib/expediciones/dificultad";
import { otorgarExperienciaJob } from "@/server/services/combate/accion-combate";
import { reducirCooldowns, obtenerCooldowns } from "@/server/services/combate/accion-combate";
import { calcularFechasRegresoProgramadas } from "@/lib/expediciones/tiempos";
import { calcularRecompensasParcialesDerrota } from "@/lib/expediciones/recompensas-derrota";
import { leerCoordenadasBase } from "@/lib/party/reglas";
import { obtenerReglaObjetivoHabilidad, resolverObjetivosHabilidad } from "@/lib/expediciones/objetivos-combate";
import { crearEnemigoLegacy, leerEnemigosEnCombate, obtenerEnemigoVivoPorId, type EnemigoEnCombate } from "@/lib/expediciones/enemigos-combate";

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
): "activo" | "victoria" | "derrota" | "huida" {
  return resolverResultadoCombateParty(enemigoHp, participantes);
}

type ParticipanteConVelocidadParty = {
  usuarioId: string;
  ordenTurno: number;
  estado: string;
  jugadorHp: number;
  jugadorVelocidad: number;
};

function construirActoresVivosParty(
  participantes: ParticipanteConVelocidadParty[],
  enemigos: EnemigoEnCombate[],
  estadosActualizados: ParticipanteTurnoParty[] = [],
): ActorTurnoVelocidad[] {
  const cambios = new Map(estadosActualizados.map((participante) => [participante.usuarioId, participante] as const));
  return [
    ...participantes.flatMap((participante) => {
      const actual = cambios.get(participante.usuarioId) ?? participante;
      return actual.estado === "activo" && actual.jugadorHp > 0
        ? [{ actorId: participante.usuarioId, equipo: "jugador" as const, velocidad: participante.jugadorVelocidad }]
        : [];
    }),
    ...enemigos
      .filter((enemigo) => enemigo.hp > 0)
      .map((enemigo) => ({ actorId: enemigo.id, equipo: "enemigo" as const, velocidad: enemigo.velocidad })),
  ];
}

function obtenerColaActualParty(
  combate: {
    id: string;
    faseTurno: string;
    turnoActualUsuarioId: string | null;
    ronda: number;
    turnosPendientes: unknown;
  },
  participantes: ParticipanteConVelocidadParty[],
  enemigos: EnemigoEnCombate[],
  estadosActualizados: ParticipanteTurnoParty[] = [],
): PasoTurnoVelocidad[] {
  const actores = construirActoresVivosParty(participantes, enemigos, estadosActualizados);
  const idsVivos = new Set(actores.map((actor) => actor.actorId));
  const guardada = normalizarSecuenciaTurnosVelocidad(combate.turnosPendientes);
  const primera = guardada[0];
  const turnoGuardadoValido = primera &&
    idsVivos.has(primera.actorId) &&
    (combate.faseTurno === "jugador"
      ? primera.equipo === "jugador" && primera.actorId === combate.turnoActualUsuarioId
      : primera.equipo === "enemigo");
  if (turnoGuardadoValido) return guardada;

  // Compatibilidad para combates iniciados antes de añadir la cola persistida.
  const enemigosVivos = actores
    .filter((actor) => actor.equipo === "enemigo")
    .sort((a, b) => b.velocidad - a.velocidad || a.actorId.localeCompare(b.actorId));
  const preferido = combate.faseTurno === "jugador"
    ? combate.turnoActualUsuarioId
    : enemigosVivos[0]?.actorId;
  return crearSecuenciaTurnosVelocidad(
    actores,
    `party:${combate.id}:ronda:${combate.ronda}`,
    preferido,
  );
}

function prepararSiguienteTurnoVelocidad(
  combate: {
    id: string;
    faseTurno: string;
    turnoActualUsuarioId: string | null;
    ronda: number;
    turnosPendientes: unknown;
  },
  participantes: ParticipanteConVelocidadParty[],
  enemigos: EnemigoEnCombate[],
  estadosActualizados: ParticipanteTurnoParty[] = [],
  colaActualOverride?: PasoTurnoVelocidad[],
) {
  const cola = colaActualOverride ?? obtenerColaActualParty(combate, participantes, enemigos);
  const avance = avanzarSecuenciaTurnosVelocidad({
    turnosPendientes: cola,
    actoresVivos: construirActoresVivosParty(participantes, enemigos, estadosActualizados),
    ronda: combate.ronda,
    semilla: `party:${combate.id}:ronda`,
  });
  const turno = avance.turnoActual;
  return {
    faseTurno: turno?.equipo === "enemigo" ? "enemigo" as const : "jugador" as const,
    turnoActualUsuarioId: turno?.equipo === "jugador" ? turno.actorId : null,
    ronda: avance.ronda,
    turnosPendientes: avance.turnosPendientes,
    nuevaRonda: avance.nuevaRonda,
  };
}

function leerRosterEnemigosParty(combate: {
  enemigos: unknown;
  enemigoId: string;
  enemigoNombre: string;
  enemigoHp: number;
  enemigoHpMaximo: number;
  enemigoAtaque: number;
  enemigoAtaqueMagico: number;
  enemigoDefensa: number;
  enemigoDefensaMagica: number;
  enemigoVelocidad: number;
  enemigoProbCritico: number;
  enemigoDanoCritico: number;
  enemigoPrecision: number;
  enemigoEvasion: number;
  enemigoNivel: number;
  efectosEnemigo: unknown;
}): EnemigoEnCombate[] {
  const guardados = leerEnemigosEnCombate(combate.enemigos);
  if (guardados.length > 0) return guardados;
  const legado = crearEnemigoLegacy({
    enemigoId: combate.enemigoId,
    enemigoNombre: combate.enemigoNombre,
    enemigoHp: combate.enemigoHp,
    enemigoHpMaximo: combate.enemigoHpMaximo,
    enemigoAtaque: combate.enemigoAtaque,
    enemigoAtaqueMagico: combate.enemigoAtaqueMagico,
    enemigoDefensa: combate.enemigoDefensa,
    enemigoDefensaMagica: combate.enemigoDefensaMagica,
    enemigoVelocidad: combate.enemigoVelocidad,
    enemigoProbCritico: combate.enemigoProbCritico,
    enemigoDanoCritico: combate.enemigoDanoCritico,
    enemigoPrecision: combate.enemigoPrecision,
    enemigoEvasion: combate.enemigoEvasion,
    enemigoNivel: combate.enemigoNivel,
    efectos: combate.efectosEnemigo,
  });
  return legado ? [legado] : [];
}

async function iniciarRegresoParty(
  tx: Prisma.TransactionClient,
  expedicionPartyId: string,
  resultadoFinal: "exito" | "derrota" | "huida",
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

  const participantes = expedicion.participantes.filter((participante) => participante.estado !== "retirado");
  if (participantes.length < 1 || participantes.length > 3) {
    throw new PartyServiceError("La expedición no tiene participantes activos para regresar.", 409, "NUMERO_MIEMBROS_INVALIDO");
  }
  const velocidades = participantes.map((participante) => participante.velocidadViajeKmh);
  if (velocidades.some((velocidad) => !Number.isFinite(velocidad) || velocidad <= 0)) {
    throw new PartyServiceError("La expedición no conserva velocidades válidas para calcular el regreso.", 409, "VELOCIDAD_REGRESO_NO_DISPONIBLE");
  }
  const velocidadRegreso = Math.min(...velocidades);
  const fechasRegreso = calcularFechasRegresoProgramadas(expedicion.fechaSalida, expedicion.fechaLlegada);
  const salida = fechasRegreso.fechaSalida;
  const fechaLlegada = fechasRegreso.fechaLlegada;
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
    where: { expedicionPartyId, estado: { in: ["activo", "caido", "en_destino", "huyo"] } },
    data: { estado: "regresando" },
  });
  for (const participante of participantes) {
    if (participante.estado === "retirado") continue;
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
  equipoEquipado: { arma: { objetoId: string } | null } | null;
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
      equipoEquipado: { select: { arma: { select: { objetoId: true } } } },
    },
  });
  if (!personaje) {
    throw new PartyServiceError("No se encontró tu personaje.", 404, "PERSONAJE_NO_ENCONTRADO");
  }
  return personaje;
}

async function regenerarRecursosTurnoParty(
  tx: Prisma.TransactionClient,
  personajeId: string,
  usuarioId: string,
) {
  const personaje = await tx.personaje.findUnique({
    where: { id: personajeId, usuarioId },
    select: {
      id: true,
      clase: true,
      nivel: true,
      profesionActivaId: true,
      progresosClase: { select: { claseId: true, nivelJob: true, desbloqueada: true } },
      fuerza: true,
      agilidad: true,
      vitalidad: true,
      inteligencia: true,
      destreza: true,
      suerte: true,
      velocidadMejoras: true,
      capacidadCarruajeMejoras: true,
      energiaActual: true,
      manaActual: true,
      habilidades: { where: { slot: { not: null } }, select: { habilidadId: true, nivel: true } },
      equipoEquipado: {
        select: {
          arma: true, armadura: true, accesorio: true, manoSecundaria: true,
          casco: true, pantalones: true, botas: true, guantes: true, anillo1: true, anillo2: true,
        },
      },
    },
  });
  if (!personaje) {
    throw new PartyServiceError("No se encontró el personaje para regenerar recursos.", 409, "PERSONAJE_NO_ENCONTRADO");
  }
  const equipo = obtenerEquipoDesdePersonaje({ equipoEquipado: personaje.equipoEquipado });
  const modificadores = calcularModificadoresEquipo(equipo, personaje.profesionActivaId);
  const progresoActivo = personaje.progresosClase.find(
    (progreso) => progreso.claseId === personaje.profesionActivaId && progreso.desbloqueada,
  );
  const stats = calcularEstadisticasPersonaje({
    clase: personaje.clase,
    profesionActivaId: personaje.profesionActivaId,
    nivel: personaje.nivel,
    nivelJob: progresoActivo?.nivelJob ?? 1,
    progresosClase: personaje.progresosClase,
    fuerza: personaje.fuerza,
    agilidad: personaje.agilidad,
    vitalidad: personaje.vitalidad,
    inteligencia: personaje.inteligencia,
    destreza: personaje.destreza,
    suerte: personaje.suerte,
    velocidadMejoras: personaje.velocidadMejoras,
    capacidadCarruajeMejoras: personaje.capacidadCarruajeMejoras,
  }, personaje.habilidades, modificadores).total;
  const energiaMaxima = stats.energiaMaxima ?? 20;
  const manaMaximo = stats.manaMaximo ?? 10;
  const energiaActual = Math.min(energiaMaxima, personaje.energiaActual + 2);
  const manaActual = Math.min(manaMaximo, personaje.manaActual + Math.max(1, Math.ceil(manaMaximo * 0.1)));
  if (energiaActual === personaje.energiaActual && manaActual === personaje.manaActual) return;
  const actualizado = await tx.personaje.updateMany({
    where: { id: personaje.id, usuarioId, energiaActual: personaje.energiaActual, manaActual: personaje.manaActual },
    data: { energiaActual, manaActual },
  });
  if (actualizado.count !== 1) {
    throw new PartyServiceError("Los recursos cambiaron antes de regenerarse.", 409, "RECURSOS_COMBATE_MODIFICADOS");
  }
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

type RecompensaRecursosParty = {
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
  objetos: { objetoId: string; cantidad: number }[];
};

function leerRecompensaParty(valor: unknown): RecompensaRecursosParty {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return { oro: 0, madera: 0, piedra: 0, metal: 0, objetos: [] };
  }
  const record = valor as Record<string, unknown>;
  const cantidad = (key: string) =>
    typeof record[key] === "number" && Number.isFinite(record[key])
      ? Math.max(0, Math.floor(record[key] as number))
      : 0;
  const objetos = Array.isArray(record.objetos)
    ? record.objetos.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const objeto = item as Record<string, unknown>;
        if (
          typeof objeto.objetoId !== "string" ||
          !objeto.objetoId.trim() ||
          typeof objeto.cantidad !== "number" ||
          !Number.isFinite(objeto.cantidad) ||
          objeto.cantidad <= 0
        ) return [];
        return [{ objetoId: objeto.objetoId.trim(), cantidad: Math.floor(objeto.cantidad) }].filter((x) => x.cantidad > 0);
      })
    : [];
  return { oro: cantidad("oro"), madera: cantidad("madera"), piedra: cantidad("piedra"), metal: cantidad("metal"), objetos };
}

function repartirCantidadEntera(total: number, numeroMiembros: number, indice: number): number {
  if (numeroMiembros <= 0) return 0;
  const cantidad = Math.max(0, Math.floor(total));
  const base = Math.floor(cantidad / numeroMiembros);
  const resto = cantidad % numeroMiembros;
  return base + (indice < resto ? 1 : 0);
}

function hashDeterminista(texto: string): number {
  let hash = 2166136261;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function crearRngDeterminista(semillaInicial: string): () => number {
  let estado = hashDeterminista(semillaInicial);
  return () => {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let valor = estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };
}

function registrarObjetoRecompensa(
  lista: { objetoId: string; cantidad: number }[],
  objetoId: string,
  cantidad: number,
) {
  if (cantidad <= 0) return;
  const existente = lista.find((objeto) => objeto.objetoId === objetoId);
  if (existente) existente.cantidad += cantidad;
  else lista.push({ objetoId, cantidad });
}

async function agregarObjetoAlInventario(
  tx: Prisma.TransactionClient,
  personajeId: string,
  objetoId: string,
  cantidad: number,
): Promise<boolean> {
  if (cantidad <= 0 || !Number.isInteger(cantidad) || !obtenerObjetoPorId(objetoId)) return false;
  const inventarioExistente = await tx.inventario.findUnique({
    where: { personajeId },
    select: { id: true },
  });
  const inventario = inventarioExistente ?? await tx.inventario.create({
    data: { personajeId },
    select: { id: true },
  });
  const stack = await tx.inventarioObjeto.findFirst({
    where: { inventarioId: inventario.id, objetoId },
    select: { id: true, cantidad: true },
    orderBy: { id: "asc" },
  });
  if (stack) {
    await tx.inventarioObjeto.update({
      where: { id: stack.id },
      data: { cantidad: { increment: cantidad } },
    });
    return true;
  }
  const ocupados = await tx.inventarioObjeto.count({ where: { inventarioId: inventario.id } });
  if (ocupados >= LIMITE_INVENTARIO_OBJETOS) return false;
  await tx.inventarioObjeto.create({
    data: {
      inventarioId: inventario.id,
      objetoId,
      cantidad,
      nivelMejora: 0,
      sufijoId: null,
      bonificaciones: {},
    },
  });
  return true;
}

async function agregarInstanciaBotinAlInventario(
  tx: Prisma.TransactionClient,
  personajeId: string,
  botin: NonNullable<ReturnType<typeof tirarBotinEnemigo>>,
): Promise<boolean> {
  const inventarioExistente = await tx.inventario.findUnique({
    where: { personajeId },
    select: { id: true },
  });
  const inventario = inventarioExistente ?? await tx.inventario.create({
    data: { personajeId },
    select: { id: true },
  });
  const ocupados = await tx.inventarioObjeto.count({ where: { inventarioId: inventario.id } });
  if (ocupados >= LIMITE_INVENTARIO_OBJETOS) return false;
  await tx.inventarioObjeto.create({
    data: {
      inventarioId: inventario.id,
      objetoId: botin.objeto.id,
      cantidad: 1,
      nivelMejora: 0,
      sufijoId: botin.sufijoId,
      bonificaciones: botin.bonificaciones as unknown as Prisma.InputJsonValue,
    },
  });
  return true;
}

/** Liquida una victoria compartida exactamente una vez dentro de la transacción serializable. */
async function liquidarRecompensasParty(
  tx: Prisma.TransactionClient,
  expedicionPartyId: string,
  combatePartyId: string,
  faseResultado: "victoria" | "derrota" = "victoria",
) {
  const combate = await tx.combateParty.findUnique({
    where: { id: combatePartyId },
    include: { participantes: { orderBy: { ordenTurno: "asc" } } },
  });
  if (!combate) {
    throw new PartyServiceError("No se encontró el combate para liquidar las recompensas.", 404, "COMBATE_PARTY_NO_ENCONTRADO");
  }
  if (combate.fase !== faseResultado) {
    throw new PartyServiceError("La fase del combate no coincide con la liquidación de recompensas.", 409, "COMBATE_PARTY_RESULTADO_NO_COINCIDE");
  }
  if (combate.recompensasResueltas) {
    return { liquidacionYaResuelta: true, recompensas: [] as unknown[] };
  }

  const expedicion = await tx.expedicionParty.findUnique({
    where: { id: expedicionPartyId },
    include: {
      participantes: {
        orderBy: { creado: "asc" },
        include: {
          usuario: { select: { id: true } },
          personaje: {
            select: {
              id: true,
              usuarioId: true,
              nivel: true,
              experiencia: true,
              profesionActivaId: true,
              rangosAmenazaCompletados: true,
              inventario: { select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!expedicion || expedicion.fase !== "combatiendo") {
    throw new PartyServiceError("La expedición no está disponible para liquidar la victoria.", 409, "EXPEDICION_PARTY_NO_COMBATIENDO");
  }
  const porUsuario = new Map(combate.participantes.map((p) => [p.usuarioId, p]));
  const participantes = expedicion.participantes
    .filter((p) => p.estado !== "retirado")
    .sort((a, b) => (porUsuario.get(a.usuarioId)?.ordenTurno ?? 999) - (porUsuario.get(b.usuarioId)?.ordenTurno ?? 999));
  if (participantes.length < 1 || participantes.length > 3) {
    throw new PartyServiceError("La party no tiene integrantes activos para recibir las recompensas de misión.", 409, "NUMERO_MIEMBROS_INVALIDO");
  }
  if (participantes.some((p) => !porUsuario.has(p.usuarioId))) {
    throw new PartyServiceError("La composición del combate no coincide con la expedición.", 409, "PARTY_COMBAT_PARTICIPANTS_MISMATCH");
  }

  const recompensaMision = leerRecompensaParty(expedicion.recompensa);
  const rosterGuardado = leerEnemigosEnCombate(combate.enemigos);
  const enemigoLegacy = crearEnemigoLegacy({
    enemigoId: combate.enemigoId,
    enemigoNombre: combate.enemigoNombre,
    enemigoHp: combate.enemigoHp,
    enemigoHpMaximo: combate.enemigoHpMaximo,
    enemigoAtaque: combate.enemigoAtaque,
    enemigoAtaqueMagico: combate.enemigoAtaqueMagico,
    enemigoDefensa: combate.enemigoDefensa,
    enemigoDefensaMagica: combate.enemigoDefensaMagica,
    enemigoVelocidad: combate.enemigoVelocidad,
    enemigoProbCritico: combate.enemigoProbCritico,
    enemigoDanoCritico: combate.enemigoDanoCritico,
    enemigoPrecision: combate.enemigoPrecision,
    enemigoEvasion: combate.enemigoEvasion,
    enemigoNivel: combate.enemigoNivel,
    efectos: combate.efectosEnemigo,
  });
  const enemigosDelCombate = rosterGuardado.length > 0 ? rosterGuardado : enemigoLegacy ? [enemigoLegacy] : [];
  const definicionesEnemigos = enemigosDelCombate
    .map((snapshot) => ({ snapshot, definicion: obtenerEnemigoPorId(snapshot.enemigoId) }))
    .filter((entrada): entrada is { snapshot: EnemigoEnCombate; definicion: NonNullable<ReturnType<typeof obtenerEnemigoPorId>> } => Boolean(entrada.definicion));
  if (definicionesEnemigos.length === 0) {
    throw new PartyServiceError("No se pudieron resolver las criaturas del combate para las recompensas.", 500, "RECOMPENSAS_ENEMIGOS_INVALIDOS");
  }
  const modoDificultad = esModoDificultad(expedicion.modoDificultad) ? expedicion.modoDificultad : "normal";
  const totalMiembros = participantes.length;
  const primerPersonaje = (participantes.find((p) => porUsuario.get(p.usuarioId)?.estado !== "huyo") ?? participantes[0])?.personaje;
  if (!primerPersonaje) {
    throw new PartyServiceError("Uno de los integrantes ya no tiene personaje.", 409, "PERSONAJE_NO_ENCONTRADO");
  }
  const liquidacionDerrota = faseResultado === "derrota"
    ? calcularRecompensasParcialesDerrota({
        enemigos: enemigosDelCombate,
        recompensaMision,
        dificultadMision: expedicion.dificultad,
        nivelBase: primerPersonaje.nivel,
        modoDificultad,
      })
    : null;
  const definicionesRecompensables = faseResultado === "derrota"
    ? definicionesEnemigos.filter((entrada) => entrada.snapshot.hp <= 0)
    : definicionesEnemigos;
  const oroEnemigo = definicionesRecompensables.reduce(
    (total, entrada) => total + calcularOroEnemigo(entrada.definicion.botin, entrada.snapshot.difMin),
    0,
  );
  const oroTotal = liquidacionDerrota?.oro ?? aplicarMultiplicadorRecompensa(recompensaMision.oro + oroEnemigo, modoDificultad);
  const recompensaRecursos = liquidacionDerrota?.recompensa ?? recompensaMision;
  // En derrota solo se concede la consolación y las recompensas de los enemigos realmente abatidos.
  // Las recompensas Base/Job son iguales para los miembros que no huyeron.
  const experienciaBaseComun = liquidacionDerrota?.experiencia ?? definicionesRecompensables.reduce(
    (total, entrada) => total + calcularExperienciaBaseGanada(
      entrada.snapshot.difMin,
      primerPersonaje.nivel,
      modoDificultad,
    ),
    0,
  );
  const logLiquidacion = obtenerLog(combate.log);
  if (faseResultado === "derrota") {
    const abatidos = definicionesRecompensables.map((entrada) => entrada.snapshot.nombre);
    logLiquidacion.push(abatidos.length
      ? `⚔️ Criaturas abatidas antes de caer: ${abatidos.join(", ")}.`
      : "⚔️ La party no había abatido ninguna criatura antes de caer.");
    logLiquidacion.push(`💰 Oro parcial total de la party: ${oroTotal} 🪙.`);
    logLiquidacion.push(`⭐ XP Base parcial por aventurero activo: ${experienciaBaseComun}.`);
    if (recompensaRecursos.madera > 0) logLiquidacion.push(`🪵 Madera parcial asegurada: ${recompensaRecursos.madera}.`);
    if (recompensaRecursos.piedra > 0) logLiquidacion.push(`🪨 Piedra parcial asegurada: ${recompensaRecursos.piedra}.`);
    if (recompensaRecursos.metal > 0) logLiquidacion.push(`⚙️ Metal parcial asegurado: ${recompensaRecursos.metal}.`);
  }

  const versionEsperadaLiquidada = combate.version + 1;
  const liquidado = await tx.combateParty.updateMany({
    where: {
      id: combatePartyId,
      fase: faseResultado,
      version: combate.version,
      recompensasResueltas: false,
    },
    data: {
      recompensasResueltas: true,
      version: { increment: 1 },
    },
  });
  if (liquidado.count !== 1) {
    const estadoActual = await tx.combateParty.findUnique({
      where: { id: combatePartyId },
      select: { recompensasResueltas: true },
    });
    if (estadoActual?.recompensasResueltas) {
      return { liquidacionYaResuelta: true, recompensas: [] as unknown[] };
    }
    throw new PartyServiceError("El estado de liquidación cambió; no se duplicarán las recompensas.", 409, "RECOMPENSA_PARTY_MODIFICADA");
  }

  const detalle: {
    usuarioId: string;
    oro: number;
    madera: number;
    piedra: number;
    metal: number;
    experiencia: number;
    experienciaJob: number;
    nivelesBaseSubidos: number;
    nivelesJobSubidos: number;
    objetos: { objetoId: string; cantidad: number }[];
  }[] = [];
  for (let indice = 0; indice < participantes.length; indice += 1) {
    const miembro = participantes[indice];
    const personaje = miembro.personaje;
    if (!personaje) {
      throw new PartyServiceError("Uno de los integrantes ya no tiene personaje.", 409, "PERSONAJE_NO_ENCONTRADO");
    }

    const combateParticipante = porUsuario.get(miembro.usuarioId);
    const huyo = combateParticipante?.estado === "huyo" || miembro.estado === "huyo";
    const oro = repartirCantidadEntera(oroTotal, totalMiembros, indice);
    const madera = repartirCantidadEntera(recompensaRecursos.madera, totalMiembros, indice);
    const piedra = repartirCantidadEntera(recompensaRecursos.piedra, totalMiembros, indice);
    const metal = repartirCantidadEntera(recompensaRecursos.metal, totalMiembros, indice);
    const experiencia = huyo ? 0 : experienciaBaseComun;
    const experienciaActual = Math.max(0, Math.floor(personaje.experiencia ?? 0));
    let nivel = Math.max(1, Math.floor(personaje.nivel ?? 1));
    let experienciaNueva = experienciaActual + experiencia;
    let nivelesSubidos = 0;
    while (experienciaNueva >= experienciaParaNivel(nivel)) {
      experienciaNueva -= experienciaParaNivel(nivel);
      nivel += 1;
      nivelesSubidos += 1;
    }
    const rangosAmenazaCompletados =
      faseResultado === "victoria" && expedicion.tipo === "normal" && modoDificultad === "normal"
        ? registrarVictoriaRangoNormal(personaje.rangosAmenazaCompletados, expedicion.dificultad)
        : undefined;

    await tx.usuario.update({
      where: { id: miembro.usuarioId },
      data: {
        oro: { increment: oro },
        madera: { increment: madera },
        piedra: { increment: piedra },
        metal: { increment: metal },
        ...(faseResultado === "victoria" && expedicion.tipo === "elite" && !huyo
          ? { ultimaMisionElite: new Date() }
          : {}),
      },
    });
    const personajeActualizado = await tx.personaje.updateMany({
      where: { id: personaje.id, usuarioId: miembro.usuarioId },
      data: {
        nivel,
        experiencia: experienciaNueva,
        ...(rangosAmenazaCompletados ? { rangosAmenazaCompletados } : {}),
      },
    });
    if (personajeActualizado.count !== 1) {
      throw new PartyServiceError("No se pudo actualizar la progresión de un aventurero.", 409, "PERSONAJE_RECOMPENSA_MODIFICADO");
    }

    const progresoJob = huyo ? null : await otorgarExperienciaJob(
      tx,
      { id: personaje.id, profesionActivaId: personaje.profesionActivaId || "novato" },
      expedicion.dificultad,
      personaje.nivel,
      modoDificultad,
      faseResultado === "derrota" ? 0.1 : undefined,
    );
    let experienciaJobTotal = progresoJob?.experienciaJobGanada ?? 0;
    let nivelesJobTotal = progresoJob?.nivelesSubidos ?? 0;
    if (faseResultado === "derrota" && !huyo) {
      for (const entradaEnemigo of definicionesRecompensables) {
        const progresoJobEnemigo = await otorgarExperienciaJob(
          tx,
          { id: personaje.id, profesionActivaId: personaje.profesionActivaId || "novato" },
          entradaEnemigo.snapshot.difMin,
          personaje.nivel,
          modoDificultad,
        );
        experienciaJobTotal += progresoJobEnemigo?.experienciaJobGanada ?? 0;
        nivelesJobTotal += progresoJobEnemigo?.nivelesSubidos ?? 0;
        if (progresoJobEnemigo?.nivelesSubidos) {
          logLiquidacion.push(`⬆️ Job de ${progresoJobEnemigo.claseNombre}: nivel ${progresoJobEnemigo.nivelJob} tras abatir a ${entradaEnemigo.snapshot.nombre} para ${miembro.usuarioId}.`);
        }
      }
    }
    const mensajesJob = experienciaJobTotal > 0
      ? ` Job +${experienciaJobTotal} XP.`
      : "";
    const mensajesBase = nivelesSubidos > 0 ? ` Base +${nivelesSubidos} nivel(es).` : "";

    const objetosRepartidos: { objetoId: string; cantidad: number }[] = [];
    for (const objeto of (faseResultado === "victoria" ? recompensaMision.objetos : [])) {
      const cantidad = repartirCantidadEntera(objeto.cantidad, totalMiembros, indice);
      if (cantidad <= 0) continue;
      const agregado = await agregarObjetoAlInventario(tx, personaje.id, objeto.objetoId, cantidad);
      if (agregado) {
        registrarObjetoRecompensa(objetosRepartidos, objeto.objetoId, cantidad);
      } else {
        logLiquidacion.push(
          `🎒 ${miembro.usuarioId} no ha podido recibir ${objeto.objetoId} ×${cantidad} de la misión porque su inventario está lleno o el objeto ya no existe.`,
        );
      }
    }
    detalle.push({
      usuarioId: miembro.usuarioId,
      oro,
      madera,
      piedra,
      metal,
      experiencia,
      experienciaJob: experienciaJobTotal,
      nivelesBaseSubidos: nivelesSubidos,
      nivelesJobSubidos: nivelesJobTotal,
      objetos: objetosRepartidos,
    });
    logLiquidacion.push(
      `🎁 ${miembro.usuarioId}: +${oro} oro, +${madera} madera, +${piedra} piedra, +${metal} metal y +${experiencia} XP.${mensajesBase}${mensajesJob}`,
    );
  }

  const dropsEnemigo: {
    usuarioId: string;
    objetoId: string;
    nombre: string;
    cantidad: number;
    sufijoId: string | null;
  }[] = [];
  for (const entradaEnemigo of definicionesRecompensables) {
    for (let indice = 0; indice < participantes.length; indice += 1) {
      const miembro = participantes[indice];
      if (porUsuario.get(miembro.usuarioId)?.estado === "huyo" || miembro.estado === "huyo") continue;
      const drop = tirarBotinEnemigo(
        entradaEnemigo.definicion,
        crearRngDeterminista(`${combate.id}:${entradaEnemigo.snapshot.id}:botin:${miembro.usuarioId}`),
        miembro.personaje.profesionActivaId,
      );
      if (!drop) continue;

      const agregado = await agregarInstanciaBotinAlInventario(tx, miembro.personaje.id, drop);
      if (!agregado) {
        logLiquidacion.push(
          `🎒 El botín de ${entradaEnemigo.snapshot.nombre} para ${miembro.usuarioId} se ha perdido porque su inventario está lleno.`,
        );
        continue;
      }

      dropsEnemigo.push({
        usuarioId: miembro.usuarioId,
        objetoId: drop.objeto.id,
        nombre: drop.objeto.nombre,
        cantidad: 1,
        sufijoId: drop.sufijoId,
      });
      logLiquidacion.push(
        `🎲 Botín de ${entradaEnemigo.snapshot.nombre}: ${drop.objeto.nombre}${drop.sufijoId ? ` (${drop.sufijoId})` : ""} para ${miembro.usuarioId}.`,
      );
    }
  }

  const resultadoRecompensas = {
    liquidacionYaResuelta: false,
    resultadoFinal: faseResultado,
    oroTotal,
    enemigosDerrotados: definicionesRecompensables.map((entrada) => ({
      id: entrada.snapshot.id,
      nombre: entrada.snapshot.nombre,
    })),
    dropsEnemigo,
    experienciaPorMiembro: detalle.map((d) => ({
      usuarioId: d.usuarioId,
      experiencia: d.experiencia,
      experienciaJob: d.experienciaJob,
    })),
    recompensas: detalle,
  };

  const logGuardado = await tx.combateParty.updateMany({
    where: {
      id: combatePartyId,
      recompensasResueltas: true,
      version: versionEsperadaLiquidada,
    },
    data: {
      log: logLiquidacion as unknown as Prisma.InputJsonValue,
      recompensasResultado: resultadoRecompensas as unknown as Prisma.InputJsonValue,
    },
  });
  if (logGuardado.count !== 1) {
    throw new PartyServiceError("No se pudo registrar el resumen de recompensas.", 409, "COMBATE_PARTY_MODIFICADO");
  }

  return resultadoRecompensas;
}

export async function ejecutarAccionCombateParty(
  usuarioId: string,
  idDesconocido: unknown,
  accionDesconocida: unknown,
  payload?: { habilidadId?: unknown; objetivoId?: unknown; enemigoObjetivoId?: unknown; objetoInventarioId?: unknown; posicion?: unknown },
) {
  const expedicionPartyId = validarExpedicionId(idDesconocido);
  if (accionDesconocida !== "atacar" && accionDesconocida !== "usar_habilidad" && accionDesconocida !== "usar_objeto" && accionDesconocida !== "escapar" && accionDesconocida !== "cambiar_posicion") {
    throw new PartyServiceError("Acción de combate no válida.", 400, "ACCION_PARTY_NO_DISPONIBLE");
  }

  return prisma.$transaction(async (tx) => {
    const combate = await cargarCombateParty(tx, expedicionPartyId);
    if (combate.fase !== "activo") {
      throw new PartyServiceError("El combate ya ha terminado.", 409, "COMBATE_PARTY_TERMINADO");
    }
    const esHuida = accionDesconocida === "escapar";
    const esTurnoDelUsuario = combate.faseTurno === "jugador" && combate.turnoActualUsuarioId === usuarioId;
    // Huir es una acción de emergencia disponible para cualquier miembro activo.
    // El resto de acciones sigue estrictamente limitado al turno correspondiente.
    if (!esHuida && !esTurnoDelUsuario) {
      throw new PartyServiceError("No es tu turno de combate.", 409, "NO_ES_TU_TURNO");
    }

    const participante = combate.participantes.find((p) => p.usuarioId === usuarioId);
    if (!participante || participante.estado !== "activo" || participante.jugadorHp <= 0) {
      throw new PartyServiceError("Tu aventurero no puede actuar en este combate.", 409, "PARTICIPANTE_NO_ACTIVO");
    }

    if (accionDesconocida === "cambiar_posicion") {
      const posiciones = ["mele", "centro", "retaguardia"];
      if (typeof payload?.posicion !== "string" || !posiciones.includes(payload.posicion)) {
        throw new PartyServiceError("La posición debe ser melé, centro o retaguardia.", 400, "POSICION_PARTY_INVALIDA");
      }
      if (participante.jugadorPosicion === payload.posicion) {
        throw new PartyServiceError("Ya estás en esa posición.", 409, "POSICION_PARTY_SIN_CAMBIOS");
      }
      const log = obtenerLog(combate.log);
      const etiquetas: Record<string, string> = { mele: "melé", centro: "centro", retaguardia: "retaguardia" };
      log.push(`↔️ ${usuarioId} cambia a la posición de ${etiquetas[payload.posicion]}.`);
      const actualizado = await tx.combateParty.updateMany({
        where: { id: combate.id, version: combate.version, fase: "activo", faseTurno: "jugador", turnoActualUsuarioId: usuarioId },
        data: { version: { increment: 1 }, log: log as unknown as Prisma.InputJsonValue },
      });
      if (actualizado.count !== 1) throw new PartyServiceError("El combate cambió al guardar la formación.", 409, "COMBATE_PARTY_MODIFICADO");
      const actualizadoPosicion = await tx.combatePartyParticipante.updateMany({
        where: { id: participante.id, estado: "activo" },
        data: { jugadorPosicion: payload.posicion },
      });
      if (actualizadoPosicion.count !== 1) throw new PartyServiceError("No se pudo guardar la posición del aventurero.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
      return {
        expedicionPartyId,
        combatePartyId: combate.id,
        fase: combate.fase,
        faseTurno: combate.faseTurno,
        turnoActualUsuarioId: combate.turnoActualUsuarioId,
        ronda: combate.ronda,
        jugadorPosicion: payload.posicion,
      };
    }

    if (accionDesconocida === "escapar") {
      const enemigosParaHuida = leerRosterEnemigosParty(combate);
      const colaAntesDeHuida = obtenerColaActualParty(combate, combate.participantes, enemigosParaHuida);
      const estadoParticipantes = obtenerEstadoParticipantes(combate.participantes).map((p) =>
        p.usuarioId === usuarioId ? { ...p, estado: "huyo" } : p,
      );
      const resultadoTerminal = registrarResultadoTerminal(combate.enemigoHp, estadoParticipantes);
      const log = obtenerLog(combate.log);
      log.push(`🏃 ${usuarioId} huye del combate. Si sus compañeros vencen, conservará su parte del oro, pero no recibirá XP ni botín del enemigo.`);
      const terminal = resultadoTerminal !== "activo";
      const huyeEnSuTurno = combate.faseTurno === "jugador" && combate.turnoActualUsuarioId === usuarioId;
      let faseTurno: "jugador" | "enemigo" = terminal
        ? "enemigo"
        : combate.faseTurno as "jugador" | "enemigo";
      let turnoActualUsuarioId: string | null = terminal ? null : combate.turnoActualUsuarioId;
      let ronda = combate.ronda;
      let turnosPendientes: PasoTurnoVelocidad[] = terminal ? [] : colaAntesDeHuida;

      if (!terminal && huyeEnSuTurno) {
        // Si era su turno, consume esa acción y omite las demás acciones que tuviera pendientes.
        const siguiente = prepararSiguienteTurnoVelocidad(
          combate,
          combate.participantes,
          enemigosParaHuida,
          estadoParticipantes,
          colaAntesDeHuida,
        );
        faseTurno = siguiente.faseTurno;
        turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
        ronda = siguiente.ronda;
        turnosPendientes = siguiente.turnosPendientes;
        if (siguiente.nuevaRonda) {
          // Huir consume el turno actual; si con ello termina el ciclo,
          // los cooldowns avanzan igual que con cualquier otra acción.
          for (const miembro of combate.participantes) {
            const bruto = miembro.cooldowns && typeof miembro.cooldowns === "object" && !Array.isArray(miembro.cooldowns)
              ? Object.fromEntries(Object.entries(miembro.cooldowns).filter(([, valor]) => typeof valor === "number" && Number.isFinite(valor) && valor > 0))
              : {};
            const guardado = await tx.combatePartyParticipante.updateMany({
              where: { id: miembro.id, combatePartyId: combate.id },
              data: { cooldowns: reducirCooldowns(bruto as Record<string, number>) as unknown as Prisma.InputJsonValue },
            });
            if (guardado.count !== 1) {
              throw new PartyServiceError("No se pudieron actualizar los cooldowns al cerrar el ciclo de iniciativa.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
            }
          }
        }
      } else if (!terminal) {
        // La huida fuera de turno no consume la acción que ya correspondía a otro actor.
        turnosPendientes = colaAntesDeHuida.filter((paso) => paso.actorId !== usuarioId);
      } else if (terminal) {
        log.push(
          resultadoTerminal === "victoria"
            ? `🏆 ${combate.enemigoNombre} ya había caído.`
            : resultadoTerminal === "huida"
              ? "🏃 Toda la party ha abandonado el combate."
              : "💀 No quedan aventureros capaces de continuar.",
        );
      }
      const actualizado = await tx.combateParty.updateMany({
        // Se valida fase+versión, pero no el turno: la huida puede ocurrir
        // cuando actúa otro aliado o durante el turno de los enemigos.
        where: { id: combate.id, version: combate.version, fase: "activo" },
        data: {
          version: { increment: 1 },
          fase: terminal ? resultadoTerminal : "activo",
          faseTurno,
          turnoActualUsuarioId,
          ronda,
          turnosPendientes: turnosPendientes as unknown as Prisma.InputJsonValue,
          log: log as unknown as Prisma.InputJsonValue,
          ultimaAccion: { actor: "jugador", actorUsuarioId: usuarioId, tipo: "fallo", animacion: "defensiva", dano: 0, critico: false, texto: "Huyes del combate." } as unknown as Prisma.InputJsonValue,
        },
      });
      if (actualizado.count !== 1) throw new PartyServiceError("El combate cambió al procesar la huida.", 409, "COMBATE_PARTY_MODIFICADO");
      await tx.combatePartyParticipante.updateMany({
        where: { id: participante.id, estado: "activo" },
        data: { estado: "huyo" },
      });
      await tx.expedicionPartyParticipante.updateMany({
        where: { expedicionPartyId, usuarioId, estado: { not: "retirado" } },
        data: { estado: "huyo" },
      });
      const recompensas = terminal && resultadoTerminal === "victoria"
        ? await liquidarRecompensasParty(tx, expedicionPartyId, combate.id)
        : null;
      const regreso = terminal
        ? await iniciarRegresoParty(
            tx,
            expedicionPartyId,
            resultadoTerminal === "victoria" ? "exito" : resultadoTerminal === "huida" ? "huida" : "derrota",
          )
        : null;
      return {
        expedicionPartyId,
        combatePartyId: combate.id,
        fase: terminal ? resultadoTerminal : "activo",
        ronda,
        faseTurno,
        turnoActualUsuarioId,
        enemigoHp: combate.enemigoHp,
        jugadorHp: participante.jugadorHp,
        ...(recompensas ? { recompensas } : {}),
        ...(regreso ? { regreso } : {}),
        accion: { actor: "jugador", tipo: "fallo", animacion: "defensiva", dano: 0, critico: false, texto: "Huyes del combate." },
      };
    }

    const personaje = await cargarPersonajeAccionParty(tx, usuarioId);
    let efectosJugador = convertirEfectos(participante.efectos);
    let cooldowns = obtenerCooldowns(participante.cooldowns);
    const rosterGuardado = leerEnemigosEnCombate(combate.enemigos);
    const enemigoLegacy = crearEnemigoLegacy({
      enemigoId: combate.enemigoId,
      enemigoNombre: combate.enemigoNombre,
      enemigoHp: combate.enemigoHp,
      enemigoHpMaximo: combate.enemigoHpMaximo,
      enemigoAtaque: combate.enemigoAtaque,
      enemigoAtaqueMagico: combate.enemigoAtaqueMagico,
      enemigoDefensa: combate.enemigoDefensa,
      enemigoDefensaMagica: combate.enemigoDefensaMagica,
      enemigoVelocidad: combate.enemigoVelocidad,
      enemigoProbCritico: combate.enemigoProbCritico,
      enemigoDanoCritico: combate.enemigoDanoCritico,
      enemigoPrecision: combate.enemigoPrecision,
      enemigoEvasion: combate.enemigoEvasion,
      enemigoNivel: combate.enemigoNivel,
      efectos: combate.efectosEnemigo,
    });
    let enemigosEnCombate: EnemigoEnCombate[] = rosterGuardado.length > 0
      ? rosterGuardado
      : enemigoLegacy ? [enemigoLegacy] : [];
    if (enemigosEnCombate.length === 0) {
      throw new PartyServiceError("El combate no contiene enemigos válidos.", 500, "ROSTER_ENEMIGO_INVALIDO");
    }
    const colaTurnosActuales = obtenerColaActualParty(combate, combate.participantes, enemigosEnCombate);
    const idEnemigoSolicitado = typeof payload?.enemigoObjetivoId === "string"
      ? payload.enemigoObjetivoId
      : typeof payload?.objetivoId === "string" && payload.objetivoId.startsWith("enemigo-")
        ? payload.objetivoId
        : null;
    const enemigoSeleccionado = obtenerEnemigoVivoPorId(enemigosEnCombate, idEnemigoSolicitado);
    if (!enemigoSeleccionado) {
      throw new PartyServiceError("El enemigo seleccionado ya no está disponible.", 409, "ENEMIGO_OBJETIVO_NO_ACTIVO");
    }
    let efectosEnemigo = obtenerEfectos(enemigoSeleccionado.efectos);
    let enemigoHp = enemigoSeleccionado.hp;
    const estadoInicioTurno = procesarEfectosTurno(
      efectosJugador,
      participante.jugadorHp,
      participante.jugadorHpMaximo,
      participante.jugadorDefensa,
      personaje.id,
    );
    let jugadorHp = estadoInicioTurno.hp;
    let jugadorDefensa = estadoInicioTurno.defensa;
    efectosJugador = estadoInicioTurno.efectos;
    let enemigoDefensa = enemigoSeleccionado.defensa;
    if (estadoInicioTurno.mensajes.length > 0) {
      efectosJugador = estadoInicioTurno.efectos;
    }
    let habilidad: DefinicionHabilidad | null = null;
    let objetoConsumible: { inventarioObjetoId: string; objetoId: string; curacion: number; nombre: string } | null = null;
    let accion: AccionAnimadaCombate;
    const danoEnemigoPorId = new Map<string, number>();
    const efectosEnemigoPorId = new Map<string, { defensa: number; efectos: ReturnType<typeof obtenerEfectos> }>();
    const objetivosAliadosModificados = new Map<string, {
      usuarioId: string;
      participanteId: string;
      personajeId: string;
      hpOriginal: number;
      hp: number;
      defensa: number;
      efectos: ReturnType<typeof obtenerEfectos>;
    }>();

    if (accionDesconocida === "atacar") {
      const armaEquipadaId = personaje.equipoEquipado?.arma?.objetoId;
      const subtipoArma = armaEquipadaId ? obtenerObjetoPorId(armaEquipadaId)?.subtipo : undefined;
      const usarAtaqueMagico = usaAtaqueMagicoBasico(subtipoArma);
      accion = resolverAtaqueJugador({
        jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
        jugadorAtaqueMagico: calcularAtaqueModificado(participante.jugadorAtaqueMagico, efectosJugador, true),
        usarMejorAtaqueMagico: usarAtaqueMagico,
        jugadorNivel: participante.jugadorNivel,
        jugadorProbCritico: participante.jugadorProbCritico,
        jugadorDanoCritico: participante.jugadorDanoCritico,
        jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
        enemigoEvasion: calcularEvasionModificada(enemigoSeleccionado.evasion, efectosEnemigo),
        enemigoDefensa,
        enemigoDefensaMagica: enemigoSeleccionado.defensaMagica,
        enemigoNombre: enemigoSeleccionado.nombre,
      });
      accion = { ...accion, enemigoObjetivoId: enemigoSeleccionado.id };
      danoEnemigoPorId.set(enemigoSeleccionado.id, accion.dano);
      const presentacionArma = obtenerPresentacionAtaqueBasico(subtipoArma);
      if (presentacionArma) accion = { ...accion, presentacion: presentacionArma };
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

      const reglaObjetivo = obtenerReglaObjetivoHabilidad(habilidad);
      const seleccionObjetivos = resolverObjetivosHabilidad({
        habilidad,
        actorId: usuarioId,
        objetivoId: reglaObjetivo.equipo === "enemigo"
          ? idEnemigoSolicitado
          : typeof payload?.objetivoId === "string" ? payload.objetivoId : null,
        combatientes: [
          ...combate.participantes.map((p) => ({
            id: p.usuarioId,
            nombre: p.usuarioId,
            equipo: "aliado" as const,
            posicion: p.jugadorPosicion,
            columna: p.ordenTurno % 3,
            hpActual: p.jugadorHp,
            estado: p.estado,
          })),
          ...enemigosEnCombate.map((enemigo) => ({
            id: enemigo.id,
            nombre: enemigo.nombre,
            equipo: "enemigo" as const,
            posicion: enemigo.posicion,
            columna: enemigo.columna,
            casilla: enemigo.casilla,
            hpActual: enemigo.hp,
            estado: enemigo.hp > 0 ? "activo" : "caido",
          })),
        ],
      });
      if (seleccionObjetivos.error || seleccionObjetivos.objetivos.length === 0) {
        throw new PartyServiceError(
          seleccionObjetivos.error === "objetivo_no_valido"
            ? "El objetivo seleccionado no pertenece al grupo válido de la habilidad."
            : seleccionObjetivos.error === "limite_formacion_excedido"
              ? "La formación excede el límite de nueve combatientes por equipo."
              : "No hay objetivos válidos para esta habilidad.",
          400,
          "OBJETIVO_COMBATE_INVALIDO",
        );
      }

      if (reglaObjetivo.equipo === "aliado" || reglaObjetivo.equipo === "propio") {
        const resultados = [];
        const objetivosAliados = seleccionObjetivos.objetivos.filter((objetivo) => objetivo.equipo === "aliado");
        for (const objetivo of objetivosAliados) {
          const aliado = combate.participantes.find((p) => p.usuarioId === objetivo.id);
          if (!aliado || aliado.estado !== "activo" || aliado.jugadorHp <= 0) {
            throw new PartyServiceError("El aliado seleccionado ya no puede recibir esa habilidad.", 409, "OBJETIVO_ALIADO_NO_ACTIVO");
          }
          const previos = retirarEfectosHabilidad(obtenerEfectos(aliado.efectos), habilidad.id, aliado.jugadorDefensa);
          const efectosDelObjetivo = previos.efectos;
          const resultadoObjetivo = resolverHabilidadJugador(habilidad, {
            jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
            jugadorAtaqueMagico: calcularAtaqueModificado(participante.jugadorAtaqueMagico, efectosJugador, true),
            jugadorProbCritico: participante.jugadorProbCritico,
            jugadorDanoCritico: participante.jugadorDanoCritico,
            jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
            enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion, efectosEnemigo),
            jugadorDefensa: previos.defensa,
            jugadorDefensaMagica: aliado.jugadorDefensaMagica,
            jugadorNivel: participante.jugadorNivel,
            jugadorHp: aliado.jugadorHp,
            jugadorHpMaximo: aliado.jugadorHpMaximo,
            enemigoDefensa,
            enemigoDefensaMagica: combate.enemigoDefensaMagica,
            enemigoNombre: combate.enemigoNombre,
            efectosJugador: efectosDelObjetivo,
          });
          const efectosNuevosAliado = [
            ...efectosDelObjetivo.filter((efecto) => !resultadoObjetivo.efectosJugadorActualizados?.some((actualizado) =>
              actualizado.habilidadId === efecto.habilidadId && actualizado.objetivo === efecto.objetivo)),
            ...(resultadoObjetivo.efectosJugadorActualizados ?? []),
            ...resultadoObjetivo.efectos.filter((efecto) => efecto.objetivo === "jugador"),
          ];
          objetivosAliadosModificados.set(aliado.usuarioId, {
            usuarioId: aliado.usuarioId,
            participanteId: aliado.id,
            personajeId: aliado.personajeId,
            hpOriginal: aliado.jugadorHp,
            hp: resultadoObjetivo.jugadorHp,
            defensa: resultadoObjetivo.jugadorDefensa,
            efectos: efectosNuevosAliado,
          });
          if (aliado.usuarioId === usuarioId) {
            jugadorHp = resultadoObjetivo.jugadorHp;
            jugadorDefensa = resultadoObjetivo.jugadorDefensa;
            efectosJugador = efectosNuevosAliado;
          }
          for (const estado of resultadoObjetivo.efectos.filter((efecto) => efecto.objetivo === "enemigo")) {
            efectosEnemigo = [
              ...efectosEnemigo.filter((existente) => existente.habilidadId !== estado.habilidadId || existente.objetivo !== estado.objetivo),
              estado,
            ];
          }
          resultados.push({
            objetivoUsuarioId: aliado.usuarioId,
            resultado: resultadoObjetivo,
            curacion: Math.max(0, resultadoObjetivo.jugadorHp - aliado.jugadorHp),
          });
        }
        if (resultados.length === 0) {
          throw new PartyServiceError("No hay aliados vivos en el área de esa habilidad.", 409, "SIN_ALIADOS_OBJETIVO");
        }
        const primera = resultados[0];
        const curacionTotal = resultados.reduce((total, resultado) => total + resultado.curacion, 0);
        const danoTotal = resultados.reduce((total, resultado) => total + resultado.resultado.accion.dano, 0);
        const accionBase = { ...primera.resultado.accion };
        if (resultados.length > 1) delete accionBase.curacion;
        accion = {
          ...accionBase,
          dano: danoTotal,
          ...(resultados.length === 1 && curacionTotal > 0 ? { curacion: curacionTotal } : {}),
          objetivoUsuarioId: primera.objetivoUsuarioId,
          objetivosUsuarioIds: resultados.map((resultado) => resultado.objetivoUsuarioId),
          ...(resultados.length > 1
            ? {
                pulsosEstado: resultados
                  .filter((resultado) => resultado.curacion > 0)
                  .map((resultado) => ({
                    objetivo: "jugador" as const,
                    objetivoUsuarioId: resultado.objetivoUsuarioId,
                    tipo: "curacion" as const,
                    cantidad: resultado.curacion,
                  })),
              }
            : {}),
          texto: resultados.length > 1
            ? habilidad.nombre + " afecta a " + resultados.length + " aliados."
            : primera.resultado.accion.texto,
        };
      } else {
        const objetivosEnemigos = seleccionObjetivos.objetivos.filter((objetivo) => objetivo.equipo === "enemigo");
        if (objetivosEnemigos.length === 0) {
          throw new PartyServiceError("La habilidad ofensiva no tiene enemigos válidos.", 409, "SIN_ENEMIGOS_OBJETIVO");
        }
        const resultados = objetivosEnemigos.map((objetivo) => {
          const enemigo = enemigosEnCombate.find((entrada) => entrada.id === objetivo.id);
          if (!enemigo || enemigo.hp <= 0) {
            throw new PartyServiceError("Uno de los enemigos elegidos ya no está activo.", 409, "ENEMIGO_OBJETIVO_NO_ACTIVO");
          }
          const efectosDelEnemigo = obtenerEfectos(enemigo.efectos);
          const resultado = resolverHabilidadJugador(habilidad!, {
            jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
            jugadorAtaqueMagico: calcularAtaqueModificado(participante.jugadorAtaqueMagico, efectosJugador, true),
            jugadorProbCritico: participante.jugadorProbCritico,
            jugadorDanoCritico: participante.jugadorDanoCritico,
            jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
            enemigoEvasion: calcularEvasionModificada(enemigo.evasion, efectosDelEnemigo),
            jugadorDefensa,
            jugadorDefensaMagica: participante.jugadorDefensaMagica,
            jugadorNivel: participante.jugadorNivel,
            jugadorHp,
            jugadorHpMaximo: participante.jugadorHpMaximo,
            enemigoDefensa: enemigo.defensa,
            enemigoDefensaMagica: enemigo.defensaMagica,
            enemigoNombre: enemigo.nombre,
            efectosJugador,
          });
          const nuevosEfectosEnemigo = [
            ...efectosDelEnemigo.filter((efecto) => !resultado.efectos.some((nuevo) =>
              nuevo.objetivo === "enemigo" && nuevo.habilidadId === efecto.habilidadId)),
            ...resultado.efectos.filter((efecto) => efecto.objetivo === "enemigo"),
          ];
          efectosEnemigoPorId.set(enemigo.id, {
            defensa: resultado.enemigoDefensa,
            efectos: nuevosEfectosEnemigo,
          });
          danoEnemigoPorId.set(enemigo.id, resultado.accion.dano);
          return { enemigo, resultado };
        });
        const primero = resultados[0];
        const danoTotal = resultados.reduce((total, entrada) => total + entrada.resultado.accion.dano, 0);
        const accionBase = { ...primero.resultado.accion };
        accion = {
          ...accionBase,
          dano: danoTotal,
          enemigoObjetivoId: primero.enemigo.id,
          objetivosEnemigoIds: resultados.map((entrada) => entrada.enemigo.id),
          ...(resultados.length > 1 ? {
            impactosMultiples: resultados.map((entrada) => ({
              objetivoId: entrada.enemigo.id,
              dano: entrada.resultado.accion.dano,
              critico: entrada.resultado.accion.critico,
            })),
            texto: habilidad.nombre + " afecta a " + resultados.length + " enemigos.",
          } : {}),
        };
        jugadorHp = primero.resultado.jugadorHp;
        jugadorDefensa = primero.resultado.jugadorDefensa;
        efectosJugador = [
          ...efectosJugador.filter((efecto) => !primero.resultado.efectosJugadorActualizados?.some((actualizado) =>
            actualizado.habilidadId === efecto.habilidadId && actualizado.objetivo === efecto.objetivo)),
          ...(primero.resultado.efectosJugadorActualizados ?? []),
          ...primero.resultado.efectos.filter((efecto) => efecto.objetivo === "jugador"),
        ];
        const enemigoActual = enemigosEnCombate.find((enemigo) => enemigo.id === primero.enemigo.id);
        enemigoDefensa = enemigoActual?.defensa ?? enemigoDefensa;
      }
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
        accionSprite: "use_consumable",
      };
    }

    enemigosEnCombate = enemigosEnCombate.map((enemigo) => {
      const dano = danoEnemigoPorId.get(enemigo.id) ?? 0;
      const extras = efectosEnemigoPorId.get(enemigo.id);
      return {
        ...enemigo,
        hp: Math.max(0, enemigo.hp - dano),
        defensa: extras?.defensa ?? enemigo.defensa,
        efectos: extras?.efectos ?? enemigo.efectos,
      };
    });
    const enemigosVivosTrasAccion = enemigosEnCombate.filter((enemigo) => enemigo.hp > 0);
    const enemigoPrincipalTrasAccion = enemigosVivosTrasAccion[0] ?? enemigosEnCombate[0];
    enemigoHp = enemigosVivosTrasAccion.length > 0 ? enemigoPrincipalTrasAccion.hp : 0;
    enemigoDefensa = enemigoPrincipalTrasAccion.defensa;
    efectosEnemigo = obtenerEfectos(enemigoPrincipalTrasAccion.efectos);
    const estadoParticipantes = obtenerEstadoParticipantes(combate.participantes).map((p) =>
      p.usuarioId === usuarioId ? { ...p, jugadorHp, estado: jugadorHp > 0 ? "activo" : "caido" } : p,
    );
    const resultadoTerminal = registrarResultadoTerminal(enemigoHp, estadoParticipantes);
    const log = obtenerLog(combate.log);
    log.push(...estadoInicioTurno.mensajes);
    log.push(accion.texto);

    let faseTurno: "jugador" | "enemigo" = "enemigo";
    let turnoActualUsuarioId: string | null = null;
    let ronda = combate.ronda;
    let turnosPendientes: PasoTurnoVelocidad[] = [];
    let nuevaRonda = false;
    let fase = "activo";
    if (resultadoTerminal === "victoria") {
      fase = "victoria";
      log.push("🏆 ¡Has derrotado a todos los enemigos del grupo!");
    } else if (resultadoTerminal === "derrota") {
      fase = "derrota";
      log.push("💀 Todos los aventureros han caído.");
    } else if (resultadoTerminal === "huida") {
      fase = "huida";
      log.push("🏃 Todos los aventureros han abandonado el combate.");
    } else {
      const siguiente = prepararSiguienteTurnoVelocidad(
        combate,
        combate.participantes,
        enemigosEnCombate,
        estadoParticipantes,
        colaTurnosActuales,
      );
      faseTurno = siguiente.faseTurno;
      turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
      ronda = siguiente.ronda;
      turnosPendientes = siguiente.turnosPendientes;
      nuevaRonda = siguiente.nuevaRonda;
    }

    if (nuevaRonda) {
      // Un cooldown avanza al completarse todo el ciclo, con independencia
      // de qué equipo haya ejecutado la última acción.
      cooldowns = reducirCooldowns(cooldowns);
      for (const miembro of combate.participantes) {
        if (miembro.usuarioId === usuarioId) continue;
        const valor = miembro.cooldowns;
        const bruto = valor && typeof valor === "object" && !Array.isArray(valor)
          ? Object.fromEntries(Object.entries(valor).filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0))
          : {};
        const guardado = await tx.combatePartyParticipante.updateMany({
          where: { id: miembro.id, combatePartyId: combate.id },
          data: { cooldowns: reducirCooldowns(bruto as Record<string, number>) as unknown as Prisma.InputJsonValue },
        });
        if (guardado.count !== 1) {
          throw new PartyServiceError("No se pudieron actualizar los cooldowns de la party.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
        }
      }
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
        turnosPendientes: turnosPendientes as unknown as Prisma.InputJsonValue,
        enemigoHp,
        enemigoDefensa,
        enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
        efectosEnemigo: efectosEnemigo as unknown as Prisma.InputJsonValue,
        log: log as unknown as Prisma.InputJsonValue,
        ultimaAccion: { ...accion, actorUsuarioId: usuarioId } as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El combate ha cambiado mientras se resolvía tu acción. Actualiza e inténtalo de nuevo.", 409, "COMBATE_PARTY_MODIFICADO");
    }

    if (
      fase === "activo" &&
      faseTurno === "jugador" &&
      turnoActualUsuarioId !== null &&
      turnoActualUsuarioId !== usuarioId
    ) {
      const siguienteMiembro = combate.participantes.find((miembro) => miembro.usuarioId === turnoActualUsuarioId);
      if (siguienteMiembro && siguienteMiembro.estado === "activo" && siguienteMiembro.jugadorHp > 0) {
        await regenerarRecursosTurnoParty(tx, siguienteMiembro.personajeId, siguienteMiembro.usuarioId);
      }
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

    // Las habilidades de soporte de área se aplican a todos los aliados elegidos
    // dentro de la misma transacción. El propio actor ya se ha guardado arriba.
    for (const objetivoAliado of objetivosAliadosModificados.values()) {
      if (objetivoAliado.usuarioId === usuarioId) continue;

      const aliadoActualizado = await tx.combatePartyParticipante.updateMany({
        where: {
          id: objetivoAliado.participanteId,
          jugadorHp: objetivoAliado.hpOriginal,
          estado: "activo",
        },
        data: {
          jugadorHp: objetivoAliado.hp,
          jugadorDefensa: objetivoAliado.defensa,
          estado: objetivoAliado.hp > 0 ? "activo" : "caido",
          efectos: objetivoAliado.efectos as unknown as Prisma.InputJsonValue,
        },
      });
      if (aliadoActualizado.count !== 1) {
        throw new PartyServiceError(
          "El estado de un aliado cambió mientras se aplicaba la habilidad.",
          409,
          "OBJETIVO_ALIADO_MODIFICADO",
        );
      }

      if (objetivoAliado.hp !== objetivoAliado.hpOriginal) {
        const personajeAliadoActualizado = await tx.personaje.updateMany({
          where: {
            id: objetivoAliado.personajeId,
            estado: "combatiendo",
          },
          data: { hpActual: objetivoAliado.hp },
        });
        if (personajeAliadoActualizado.count !== 1) {
          throw new PartyServiceError(
            "No se pudo sincronizar la salud del aliado afectado.",
            409,
            "SALUD_OBJETIVO_ALIADO_NO_SINCRONIZADA",
          );
        }
      }
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

    const recompensas = fase === "victoria" || fase === "derrota"
      ? await liquidarRecompensasParty(tx, expedicionPartyId, combate.id, fase)
      : null;
    const regreso = fase === "victoria" || fase === "derrota" || fase === "huida"
      ? await iniciarRegresoParty(tx, expedicionPartyId, fase === "victoria" ? "exito" : fase === "huida" ? "huida" : "derrota")
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
      ...(recompensas ? { recompensas } : {}),
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
    const rosterGuardado = leerEnemigosEnCombate(combate.enemigos);
    const enemigoLegacy = crearEnemigoLegacy({
      enemigoId: combate.enemigoId,
      enemigoNombre: combate.enemigoNombre,
      enemigoHp: combate.enemigoHp,
      enemigoHpMaximo: combate.enemigoHpMaximo,
      enemigoAtaque: combate.enemigoAtaque,
      enemigoAtaqueMagico: combate.enemigoAtaqueMagico,
      enemigoDefensa: combate.enemigoDefensa,
      enemigoDefensaMagica: combate.enemigoDefensaMagica,
      enemigoVelocidad: combate.enemigoVelocidad,
      enemigoProbCritico: combate.enemigoProbCritico,
      enemigoDanoCritico: combate.enemigoDanoCritico,
      enemigoPrecision: combate.enemigoPrecision,
      enemigoEvasion: combate.enemigoEvasion,
      enemigoNivel: combate.enemigoNivel,
      efectos: combate.efectosEnemigo,
    });
    const enemigosEnCombate: EnemigoEnCombate[] = rosterGuardado.length > 0
      ? rosterGuardado
      : enemigoLegacy ? [enemigoLegacy] : [];
    if (enemigosEnCombate.length === 0) {
      throw new PartyServiceError("El combate no contiene enemigos válidos.", 500, "ROSTER_ENEMIGO_INVALIDO");
    }

    // Solo actúa el enemigo que encabeza la cola; los siguientes enemigos
    // esperan su propio turno según la velocidad relativa.
    let participantesActualizados = obtenerEstadoParticipantes(combate.participantes);
    const colaTurnosActuales = obtenerColaActualParty(
      combate,
      combate.participantes,
      enemigosEnCombate,
      participantesActualizados,
    );
    const turnoEnemigoActual = colaTurnosActuales[0];
    if (!turnoEnemigoActual || turnoEnemigoActual.equipo !== "enemigo") {
      throw new PartyServiceError("La cola de iniciativa no apunta a un enemigo activo.", 409, "TURNO_ENEMIGO_INICIATIVA_INVALIDA");
    }
    const danoPorUsuario = new Map<string, number>();
    const barrerasConsumidas = new Map<string, EstadoEfectoHabilidad[]>();
    const impactos: { actorEnemigoId: string; objetivoUsuarioId: string; dano: number; critico: boolean; hpAntes: number; hpDespues: number }[] = [];
    const actoresEnemigoIds: string[] = [];
    for (const enemigoInicial of [...enemigosEnCombate].filter((enemigo) => enemigo.id === turnoEnemigoActual.actorId)) {
      const indiceEnemigo = enemigosEnCombate.findIndex((enemigo) => enemigo.id === enemigoInicial.id);
      let enemigo = enemigosEnCombate[indiceEnemigo];
      if (enemigo.hp <= 0) continue;

      const efectosIniciales = obtenerEfectos(enemigo.efectos);
      const ticks = procesarEfectosTurno(
        efectosIniciales,
        enemigo.hp,
        enemigo.hpMaximo,
        enemigo.defensa,
        enemigo.nombre,
      );
      enemigo = {
        ...enemigo,
        hp: ticks.hp,
        defensa: ticks.defensa,
        efectos: ticks.efectos,
      };
      log.push(...ticks.mensajes.map((mensaje) => enemigo.nombre + ": " + mensaje));
      if (enemigo.hp <= 0) {
        log.push(`☠️ ${enemigo.nombre} cae por los efectos acumulados.`);
        enemigosEnCombate[indiceEnemigo] = enemigo;
        continue;
      }

      const objetivo = participantesActualizados
        .filter((p) => p.estado === "activo" && p.jugadorHp > 0)
        .map((p) => combate.participantes.find((miembro) => miembro.usuarioId === p.usuarioId)!)
        .sort((a, b) =>
          (a.jugadorHp - (danoPorUsuario.get(a.usuarioId) ?? 0)) / Math.max(1, a.jugadorHpMaximo) -
          (b.jugadorHp - (danoPorUsuario.get(b.usuarioId) ?? 0)) / Math.max(1, b.jugadorHpMaximo) ||
          a.ordenTurno - b.ordenTurno,
        )[0];
      if (!objetivo) break;

      const participanteHpActual = Math.max(0, objetivo.jugadorHp - (danoPorUsuario.get(objetivo.usuarioId) ?? 0));
      const efectosObjetivo = barrerasConsumidas.get(objetivo.usuarioId) ?? obtenerEfectos(objetivo.efectos);
      const accionEnemiga = resolverAtaqueEnemigo({
        enemigoAtaque: calcularAtaqueModificado(enemigo.ataque, enemigo.efectos),
        enemigoProbCritico: enemigo.probCritico,
        enemigoDanoCritico: enemigo.danoCritico,
        enemigoPrecision: calcularPrecisionModificada(enemigo.precision, enemigo.efectos),
        jugadorEvasion: calcularEvasionModificada(objetivo.jugadorEvasion, efectosObjetivo),
        jugadorDefensa: objetivo.jugadorDefensa,
        enemigoNombre: enemigo.nombre,
      });
      const cantidadEfectos = efectosObjetivo.length;
      aplicarBarreraAccion(accionEnemiga, efectosObjetivo);
      if (efectosObjetivo.length !== cantidadEfectos) barrerasConsumidas.set(objetivo.usuarioId, efectosObjetivo);
      const hpFinalPrevisto = Math.max(0, participanteHpActual - accionEnemiga.dano);
      danoPorUsuario.set(objetivo.usuarioId, (danoPorUsuario.get(objetivo.usuarioId) ?? 0) + accionEnemiga.dano);
      actoresEnemigoIds.push(enemigo.id);
      impactos.push({
        actorEnemigoId: enemigo.id,
        objetivoUsuarioId: objetivo.usuarioId,
        dano: accionEnemiga.dano,
        critico: accionEnemiga.critico,
        hpAntes: participanteHpActual,
        hpDespues: hpFinalPrevisto,
      });
      log.push(accionEnemiga.texto);
      if (hpFinalPrevisto <= 0) {
        log.push(`💀 ${objetivo.usuarioId} cae ante ${enemigo.nombre}.`);
        // Los enemigos posteriores pueden dirigir sus ataques contra otros aliados vivos.
        participantesActualizados = participantesActualizados.map((p) =>
          p.usuarioId === objetivo.usuarioId ? { ...p, jugadorHp: 0, estado: "caido" } : p,
        );
      }

      const avances = avanzarEfectosCombate(enemigo.efectos, enemigo.defensa);
      enemigo = { ...enemigo, efectos: avances.efectos, defensa: avances.defensa };
      log.push(...avances.mensajes.map((mensaje) => enemigo.nombre + ": " + mensaje));
      enemigosEnCombate[indiceEnemigo] = enemigo;
    }

    const totalDanoEnemigos = impactos.reduce((total, impacto) => total + impacto.dano, 0);
    const primerImpacto = impactos[0];
    const impactosAgrupadosPorAliado = [...danoPorUsuario.entries()].map(([usuarioObjetivoId, dano]) => ({
      objetivoId: usuarioObjetivoId,
      dano,
      critico: impactos.some((impacto) => impacto.objetivoUsuarioId === usuarioObjetivoId && impacto.critico),
    }));
    const accion: AccionAnimadaCombate = impactos.length > 0 ? {
      actor: "enemigo",
      actorEnemigoId: primerImpacto.actorEnemigoId,
      actoresEnemigoIds,
      impactosEnemigos: impactos.map((impacto) => ({
        actorEnemigoId: impacto.actorEnemigoId,
        objetivoId: impacto.objetivoUsuarioId,
        dano: impacto.dano,
        critico: impacto.critico,
        hpAntes: impacto.hpAntes,
        hpDespues: impacto.hpDespues,
      })),
      objetivoUsuarioId: primerImpacto.objetivoUsuarioId,
      dano: totalDanoEnemigos,
      critico: impactos.some((impacto) => impacto.critico),
      tipo: "ataque",
      animacion: "ofensiva",
      ...(impactos.length > 1 ? { impactosMultiples: impactosAgrupadosPorAliado } : {}),
      texto: impactos.length === 1
        ? `Los enemigos atacan: ${primerImpacto.objetivoUsuarioId} recibe ${totalDanoEnemigos} de daño.`
        : `${impactos.length} enemigos atacan; el grupo recibe ${totalDanoEnemigos} de daño en total.`,
    } : {
      actor: "enemigo",
      tipo: "fallo",
      animacion: "ofensiva",
      dano: 0,
      critico: false,
      texto: "No quedan enemigos capaces de atacar.",
    };

    for (const miembro of combate.participantes) {
      const dano = danoPorUsuario.get(miembro.usuarioId) ?? 0;
      if ((dano <= 0 && !barrerasConsumidas.has(miembro.usuarioId)) || miembro.estado !== "activo" || miembro.jugadorHp <= 0) continue;
      const nuevoHp = Math.max(0, miembro.jugadorHp - dano);
      const caido = nuevoHp <= 0;
      const actualizadoParticipante = await tx.combatePartyParticipante.updateMany({
        where: {
          id: miembro.id,
          combatePartyId: combate.id,
          estado: "activo",
          jugadorHp: miembro.jugadorHp,
        },
        data: {
          jugadorHp: nuevoHp,
          estado: caido ? "caido" : "activo",
          ...(barrerasConsumidas.has(miembro.usuarioId) ? { efectos: barrerasConsumidas.get(miembro.usuarioId)! as unknown as Prisma.InputJsonValue } : {}),
        },
      });
      if (actualizadoParticipante.count !== 1) {
        throw new PartyServiceError("El estado del aventurero cambió durante el turno enemigo.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
      }
      const personajeActualizado = await tx.personaje.updateMany({
        where: {
          id: miembro.personajeId,
          usuarioId: miembro.usuarioId,
          estado: "combatiendo",
        },
        data: { hpActual: nuevoHp },
      });
      if (personajeActualizado.count !== 1) {
        throw new PartyServiceError("El personaje ya no está disponible para recibir el resultado del turno enemigo.", 409, "PERSONAJE_MODIFICADO");
      }
      participantesActualizados = participantesActualizados.map((p) =>
        p.usuarioId === miembro.usuarioId
          ? { ...p, jugadorHp: nuevoHp, estado: caido ? "caido" : "activo", ...(barrerasConsumidas.has(miembro.usuarioId) ? { efectos: barrerasConsumidas.get(miembro.usuarioId)! } : {}) }
          : p,
      );
    }

    const hayEnemigosVivos = enemigosEnCombate.some((enemigo) => enemigo.hp > 0);
    const enemigoPrincipalTrasTurno = enemigosEnCombate.find((enemigo) => enemigo.hp > 0) ?? enemigosEnCombate[0];
    const enemigoHp = hayEnemigosVivos ? enemigoPrincipalTrasTurno.hp : 0;
    const enemigoDefensa = enemigoPrincipalTrasTurno.defensa;
    const efectosEnemigo = obtenerEfectos(enemigoPrincipalTrasTurno.efectos);
    const resultado = registrarResultadoTerminal(enemigoHp, participantesActualizados);
    let fase = "activo";
    let faseTurno: "jugador" | "enemigo" = "jugador";
    let turnoActualUsuarioId: string | null = null;
    let ronda = combate.ronda;
    let turnosPendientes: PasoTurnoVelocidad[] = [];
    let nuevaRonda = false;

    if (resultado === "victoria") {
      fase = "victoria";
      faseTurno = "enemigo";
      log.push("🏆 ¡Has derrotado a todos los enemigos del grupo!");
    } else if (resultado === "derrota") {
      fase = "derrota";
      faseTurno = "enemigo";
      log.push("💀 Todos los aventureros han caído.");
    } else if (resultado === "huida") {
      fase = "huida";
      faseTurno = "enemigo";
      log.push("🏃 Todos los aventureros han abandonado el combate.");
    } else {
      const siguiente = prepararSiguienteTurnoVelocidad(
        combate,
        combate.participantes,
        enemigosEnCombate,
        participantesActualizados,
        colaTurnosActuales,
      );
      faseTurno = siguiente.faseTurno;
      turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
      ronda = siguiente.ronda;
      turnosPendientes = siguiente.turnosPendientes;
      nuevaRonda = siguiente.nuevaRonda;
    }

    if (
      fase === "activo" &&
      faseTurno === "jugador" &&
      turnoActualUsuarioId !== null
    ) {
      const siguienteMiembro = participantesActualizados.find(
        (miembro) => miembro.usuarioId === turnoActualUsuarioId && miembro.estado === "activo" && miembro.jugadorHp > 0,
      );
      if (siguienteMiembro) {
        const miembroOriginal = combate.participantes.find((miembro) => miembro.usuarioId === siguienteMiembro.usuarioId);
        if (miembroOriginal) {
          await regenerarRecursosTurnoParty(tx, miembroOriginal.personajeId, miembroOriginal.usuarioId);
        }
      }
    }

    // Los cooldowns avanzan una vez por ciclo completo, no por cada enemigo.
    if (nuevaRonda) {
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
    }

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
        turnosPendientes: turnosPendientes as unknown as Prisma.InputJsonValue,
        enemigoHp,
        enemigoDefensa,
        enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
        efectosEnemigo: efectosEnemigo as unknown as Prisma.InputJsonValue,
        log: log as unknown as Prisma.InputJsonValue,
        ultimaAccion: {
          ...accion,
          enemigoObjetivoId: accion.enemigoObjetivoId ?? null,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El turno enemigo ya se procesó en otra petición.", 409, "COMBATE_PARTY_MODIFICADO");
    }

    const recompensas = fase === "victoria" || fase === "derrota"
      ? await liquidarRecompensasParty(tx, expedicionPartyId, combate.id, fase)
      : null;
    const regreso = fase === "victoria" || fase === "derrota" || fase === "huida"
      ? await iniciarRegresoParty(tx, expedicionPartyId, fase === "victoria" ? "exito" : fase === "huida" ? "huida" : "derrota")
      : null;

    return {
      expedicionPartyId,
      combatePartyId: combate.id,
      fase,
      ronda,
      faseTurno,
      turnoActualUsuarioId,
      enemigoHp,
      objetivoUsuarioId: primerImpacto?.objetivoUsuarioId ?? null,
      enemigos: enemigosEnCombate,
      ...(recompensas ? { recompensas } : {}),
      ...(regreso ? { regreso } : {}),
      accion,
    };
  }, AISLAMIENTO);
}
