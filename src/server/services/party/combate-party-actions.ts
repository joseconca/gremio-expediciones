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
import { obtenerPresentacionAtaqueBasico } from "@/lib/expediciones/presentacion-combate";
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
  procesarEfectosTurno,
} from "@/lib/expediciones/estados-combate";
import {
  calcularSiguienteTurnoParty,
  obtenerParticipantesVivos,
  resolverResultadoCombateParty,
  type ParticipanteTurnoParty,
} from "@/lib/party/combate-reglas";
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
import { leerCoordenadasBase } from "@/lib/party/reglas";
import { obtenerReglaObjetivoHabilidad, resolverObjetivosHabilidad } from "@/lib/expediciones/objetivos-combate";

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
) {
  const combate = await tx.combateParty.findUnique({
    where: { id: combatePartyId },
    include: { participantes: { orderBy: { ordenTurno: "asc" } } },
  });
  if (!combate) {
    throw new PartyServiceError("No se encontró el combate para liquidar las recompensas.", 404, "COMBATE_PARTY_NO_ENCONTRADO");
  }
  if (combate.fase !== "victoria") {
    throw new PartyServiceError("Solo se liquidan recompensas tras una victoria.", 409, "COMBATE_PARTY_NO_VICTORIA");
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
  const enemigo = obtenerEnemigoPorId(combate.enemigoId);
  const modoDificultad = esModoDificultad(expedicion.modoDificultad) ? expedicion.modoDificultad : "normal";
  const oroEnemigo = enemigo
    ? calcularOroEnemigo(enemigo.botin, expedicion.dificultad)
    : 0;
  const oroTotal = aplicarMultiplicadorRecompensa(recompensaMision.oro + oroEnemigo, modoDificultad);
  const totalMiembros = participantes.length;
  const primerPersonaje = (participantes.find((p) => porUsuario.get(p.usuarioId)?.estado !== "huyo") ?? participantes[0])?.personaje;
  if (!primerPersonaje) {
    throw new PartyServiceError("Uno de los integrantes ya no tiene personaje.", 409, "PERSONAJE_NO_ENCONTRADO");
  }
  // La XP Base es una recompensa común del resultado: el nivel individual solo
  // se utiliza para progresión propia, nunca para cambiar la XP que recibe cada miembro.
  const experienciaBaseComun = calcularExperienciaBaseGanada(
    expedicion.dificultad,
    primerPersonaje.nivel,
    modoDificultad,
  );
  const versionEsperadaLiquidada = combate.version + 1;
  const liquidado = await tx.combateParty.updateMany({
    where: {
      id: combatePartyId,
      fase: "victoria",
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

  const logLiquidacion = obtenerLog(combate.log);
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
    const madera = repartirCantidadEntera(recompensaMision.madera, totalMiembros, indice);
    const piedra = repartirCantidadEntera(recompensaMision.piedra, totalMiembros, indice);
    const metal = repartirCantidadEntera(recompensaMision.metal, totalMiembros, indice);
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
      expedicion.tipo === "normal" && modoDificultad === "normal"
        ? registrarVictoriaRangoNormal(personaje.rangosAmenazaCompletados, expedicion.dificultad)
        : undefined;

    await tx.usuario.update({
      where: { id: miembro.usuarioId },
      data: {
        oro: { increment: oro },
        madera: { increment: madera },
        piedra: { increment: piedra },
        metal: { increment: metal },
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
    );
    const mensajesJob = progresoJob?.nivelesSubidos
      ? ` Job +${progresoJob.nivelesSubidos} nivel(es).`
      : "";
    const mensajesBase = nivelesSubidos > 0 ? ` Base +${nivelesSubidos} nivel(es).` : "";

    const objetosRepartidos: { objetoId: string; cantidad: number }[] = [];
    for (const objeto of recompensaMision.objetos) {
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
      experienciaJob: progresoJob?.experienciaJobGanada ?? 0,
      nivelesBaseSubidos: nivelesSubidos,
      nivelesJobSubidos: progresoJob?.nivelesSubidos ?? 0,
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
  if (enemigo) {
    for (let indice = 0; indice < participantes.length; indice += 1) {
      const miembro = participantes[indice];
      if (porUsuario.get(miembro.usuarioId)?.estado === "huyo" || miembro.estado === "huyo") continue;
      const drop = tirarBotinEnemigo(
        enemigo,
        crearRngDeterminista(`${combate.id}:${enemigo.id}:botin:${miembro.usuarioId}`),
      );
      if (!drop) continue;

      const agregado = await agregarInstanciaBotinAlInventario(tx, miembro.personaje.id, drop);
      if (!agregado) {
        logLiquidacion.push(
          `🎒 El botín de ${combate.enemigoNombre} para ${miembro.usuarioId} se ha perdido porque su inventario está lleno.`,
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
        `🎲 Botín de ${combate.enemigoNombre}: ${drop.objeto.nombre}${drop.sufijoId ? ` (${drop.sufijoId})` : ""} para ${miembro.usuarioId}.`,
      );
    }
  }

  const resultadoRecompensas = {
    liquidacionYaResuelta: false,
    oroTotal,
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
  payload?: { habilidadId?: unknown; objetivoId?: unknown; objetoInventarioId?: unknown; posicion?: unknown },
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
    if (combate.faseTurno !== "jugador" || combate.turnoActualUsuarioId !== usuarioId) {
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
      const estadoParticipantes = obtenerEstadoParticipantes(combate.participantes).map((p) =>
        p.usuarioId === usuarioId ? { ...p, estado: "huyo" } : p,
      );
      const resultadoTerminal = registrarResultadoTerminal(combate.enemigoHp, estadoParticipantes);
      const log = obtenerLog(combate.log);
      log.push(`🏃 ${usuarioId} huye del combate. Si sus compañeros vencen, conservará su parte del oro, pero no recibirá XP ni botín del enemigo.`);
      const terminal = resultadoTerminal !== "activo";
      let faseTurno: "jugador" | "enemigo" = "enemigo";
      let turnoActualUsuarioId: string | null = null;
      let ronda = combate.ronda;
      if (!terminal) {
        const siguiente = prepararSiguienteTurno(combate, estadoParticipantes);
        faseTurno = siguiente.faseTurno;
        turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
        ronda = siguiente.ronda;
      } else {
        log.push(
          resultadoTerminal === "victoria"
            ? `🏆 ${combate.enemigoNombre} ya había caído.`
            : resultadoTerminal === "huida"
              ? "🏃 Toda la party ha abandonado el combate."
              : "💀 No quedan aventureros capaces de continuar.",
        );
      }
      const actualizado = await tx.combateParty.updateMany({
        where: { id: combate.id, version: combate.version, fase: "activo", faseTurno: "jugador", turnoActualUsuarioId: usuarioId },
        data: {
          version: { increment: 1 },
          fase: terminal ? resultadoTerminal : "activo",
          faseTurno,
          turnoActualUsuarioId,
          ronda,
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
    let efectosEnemigo = convertirEfectos(combate.efectosEnemigo);
    const cooldowns = obtenerCooldowns(participante.cooldowns);
    let enemigoHp = combate.enemigoHp;
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
    let enemigoDefensa = combate.enemigoDefensa;
    if (estadoInicioTurno.mensajes.length > 0) {
      efectosJugador = estadoInicioTurno.efectos;
    }
    let habilidad: DefinicionHabilidad | null = null;
    let objetoConsumible: { inventarioObjetoId: string; objetoId: string; curacion: number; nombre: string } | null = null;
    let accion: AccionAnimadaCombate;
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
      const armaEquipadaId = personaje.equipoEquipado?.arma?.objetoId;
      const subtipoArma = armaEquipadaId ? obtenerObjetoPorId(armaEquipadaId)?.subtipo : undefined;
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
        objetivoId: typeof payload?.objetivoId === "string" ? payload.objetivoId : null,
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
          {
            id: "enemigo",
            nombre: combate.enemigoNombre,
            equipo: "enemigo" as const,
            posicion: "centro",
            columna: 1,
            hpActual: enemigoHp,
            estado: enemigoHp > 0 ? "activo" : "caido",
          },
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
          const efectosDelObjetivo = obtenerEfectos(aliado.efectos);
          const resultadoObjetivo = resolverHabilidadJugador(habilidad, {
            jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
            jugadorAtaqueMagico: calcularAtaqueModificado(participante.jugadorAtaqueMagico, efectosJugador, true),
            jugadorProbCritico: participante.jugadorProbCritico,
            jugadorDanoCritico: participante.jugadorDanoCritico,
            jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
            enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion, efectosEnemigo),
            jugadorDefensa: aliado.jugadorDefensa,
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
        accion = {
          ...primera.resultado.accion,
          dano: danoTotal,
          ...(curacionTotal > 0 ? { curacion: curacionTotal } : {}),
          objetivoUsuarioId: primera.objetivoUsuarioId,
          objetivosUsuarioIds: resultados.map((resultado) => resultado.objetivoUsuarioId),
          texto: resultados.length > 1
            ? habilidad.nombre + " afecta a " + resultados.length + " aliados."
            : primera.resultado.accion.texto,
        };
      } else {
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
        accion = { ...resultado.accion, objetivoUsuarioId: "enemigo" };
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
      };
    }

    enemigoHp = Math.max(0, enemigoHp - accion.dano);
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
    let fase = "activo";
    if (resultadoTerminal === "victoria") {
      fase = "victoria";
      log.push(`🏆 ¡${combate.enemigoNombre} ha sido derrotado!`);
    } else if (resultadoTerminal === "derrota") {
      fase = "derrota";
      log.push("💀 Todos los aventureros han caído.");
    } else if (resultadoTerminal === "huida") {
      fase = "huida";
      log.push("🏃 Todos los aventureros han abandonado el combate.");
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
        ultimaAccion: { ...accion, actorUsuarioId: usuarioId } as unknown as Prisma.InputJsonValue,
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

    const recompensas = fase === "victoria"
      ? await liquidarRecompensasParty(tx, expedicionPartyId, combate.id)
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
    let enemigoHp = combate.enemigoHp;
    let enemigoDefensa = combate.enemigoDefensa;
    let efectosEnemigo = obtenerEfectos(combate.efectosEnemigo);
    const ticks = procesarEfectosTurno(
      efectosEnemigo,
      enemigoHp,
      combate.enemigoHpMaximo,
      enemigoDefensa,
      combate.enemigoNombre,
    );
    enemigoHp = ticks.hp;
    enemigoDefensa = ticks.defensa;
    efectosEnemigo = ticks.efectos;
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
    } else if (resultado === "huida") {
      fase = "huida";
      faseTurno = "enemigo";
      log.push("🏃 Todos los aventureros han abandonado el combate.");
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
        ultimaAccion: { ...accion, objetivoUsuarioId: enemigoHp > 0 ? objetivo?.usuarioId ?? null : null } as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El turno enemigo ya se procesó en otra petición.", 409, "COMBATE_PARTY_MODIFICADO");
    }

    const recompensas = fase === "victoria"
      ? await liquidarRecompensasParty(tx, expedicionPartyId, combate.id)
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
      objetivoUsuarioId: objetivo?.usuarioId ?? null,
      ...(recompensas ? { recompensas } : {}),
      ...(regreso ? { regreso } : {}),
      accion,
    };
  }, AISLAMIENTO);
}
