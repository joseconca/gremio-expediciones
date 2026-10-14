import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularEstadisticasPersonaje, calcularModificadoresEquipo } from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { calcularDistanciaKm } from "@/lib/utils";
import { generarMisionesDisponibles } from "@/lib/generadorMisiones";
import { obtenerDefinicionClase } from "@/lib/progresion/clases";
import { leerCoordenadasBase, ESTADOS_TRASLADO_ACTIVOS } from "@/lib/party/reglas";
import {
  calcularFechaLlegadaParty,
  esMisionPveCompartida,
  ESTADOS_EXPEDICION_PARTY_ACTIVOS,
} from "@/lib/party/expedicion-reglas";
import { PartyServiceError } from "@/server/services/party/party-service";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { crearEstadoInicialTurnoParty } from "@/lib/party/combate-reglas";
import type { DefinicionEnemigo } from "@/lib/tiposJuego";
import { esModoDificultad, type ModoDificultad } from "../../../lib/expediciones/dificultad";
import type { DefinicionMision } from "@/lib/tiposJuego";

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

const incluirUsuarioIntegrante = {
  personaje: { include: incluirPersonaje },
  expedicionActiva: { select: { id: true } },
  trasladosComoVisitante: {
    where: { estado: { in: [...ESTADOS_TRASLADO_ACTIVOS] } },
    select: { id: true },
    take: 1,
  },
} satisfies Prisma.UsuarioInclude;

function exigirCoordenadas(valor: unknown, contexto: string) {
  const coords = leerCoordenadasBase(valor);
  if (!coords) {
    throw new PartyServiceError("No hay coordenadas válidas para " + contexto + ".", 409, "COORDENADAS_NO_DISPONIBLES");
  }
  return coords;
}

function validarModo(modo: unknown): ModoDificultad {
  if (modo === undefined) return "normal";
  if (!esModoDificultad(modo)) {
    throw new PartyServiceError("El modo de dificultad no es válido.", 400, "MODO_DIFICULTAD_INVALIDO");
  }
  return modo;
}

function obtenerMisionDisponible(
  datos: {
    baseCoords: unknown;
    personaje: { nivel: number; rangosAmenazaCompletados: unknown } | null;
    ultimaMisionElite: Date | string | null;
  },
  misionId: string,
  ahora: Date,
): DefinicionMision {
  if (!datos.personaje) {
    throw new PartyServiceError("El líder no tiene un personaje disponible.", 409, "PERSONAJE_NO_ENCONTRADO");
  }
  if (!esMisionPveCompartida(misionId)) {
    throw new PartyServiceError("Las expediciones compartidas solo admiten misiones PvE normales o de élite.", 400, "MISION_PARTY_NO_COMPATIBLE");
  }
  const coordenadas = exigirCoordenadas(datos.baseCoords, "la base del líder");
  const disponibles = generarMisionesDisponibles({
    baseLat: coordenadas.lat,
    baseLng: coordenadas.lng,
    nivelPersonaje: datos.personaje.nivel,
    rangosAmenazaCompletados: datos.personaje.rangosAmenazaCompletados,
    ultimaMisionElite: datos.ultimaMisionElite,
    ahora,
  });
  const mision = disponibles.find((opcion) => opcion.id === misionId);
  if (!mision) {
    throw new PartyServiceError("La misión ya no está disponible. Actualiza el mapa e inténtalo de nuevo.", 409, "MISION_NO_DISPONIBLE");
  }
  if (mision.tipo !== "normal" && mision.tipo !== "elite") {
    throw new PartyServiceError("El tipo de misión no se admite en una expedición compartida.", 400, "MISION_PARTY_NO_COMPATIBLE");
  }
  return mision;
}

function obtenerDatosViaje(personaje: NonNullable<Prisma.PersonajeGetPayload<{ include: typeof incluirPersonaje }>>) {
  const equipo = obtenerEquipoDesdePersonaje(personaje);
  const modificadoresEquipo = calcularModificadoresEquipo(equipo, personaje.profesionActivaId);
  const estadisticas = calcularEstadisticasPersonaje(
    personaje,
    personaje.habilidades
      .filter((habilidad) => habilidad.slot !== null)
      .map((habilidad) => ({ habilidadId: habilidad.habilidadId, nivel: habilidad.nivel })),
    modificadoresEquipo,
  );

  const velocidadBaseKmh = 6 + (estadisticas.total.velocidad - 1) / 15;
  const profesionActivaId = personaje.profesionActivaId || "novato";
  const bonusVelocidad = obtenerDefinicionClase(profesionActivaId)?.bonusVelocidadExpedicion ??
    (profesionActivaId === "novato" && personaje.clase === "Explorador" ? 0.25 : 0);

  return {
    velocidadKmh: Math.max(1, velocidadBaseKmh * (1 + bonusVelocidad)),
    hpMaximo: Math.max(1, Math.floor(estadisticas.total.hpMaximo)),
    energiaMaxima: Math.max(0, Math.floor(estadisticas.total.energiaMaxima ?? 20)),
    manaMaximo: Math.max(0, Math.floor(estadisticas.total.manaMaximo ?? 10)),
    efectoComida: personaje.comidaPreparada,
  };
}

async function consultarClima(lat: number, lng: number) {
  let multiplicadorTiempo = 1;
  let clima = "Despejado / Buen tiempo";
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const respuesta = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (respuesta.ok) {
      const datos = await respuesta.json();
      const codigo = datos?.current_weather?.weathercode;
      if (typeof codigo === "number") {
        if (codigo >= 51 && codigo <= 67) {
          multiplicadorTiempo = 1.2;
          clima = "Lluvia y barro en los caminos";
        } else if (codigo >= 71 && codigo <= 77) {
          multiplicadorTiempo = 1.5;
          clima = "Fuertes nevadas";
        } else if (codigo >= 95) {
          multiplicadorTiempo = 1.8;
          clima = "Tormenta eléctrica peligrosa";
        }
      }
    } else {
      clima = "No se pudo consultar el clima";
    }
  } catch {
    // La meteorología es informativa; el viaje no depende del proveedor.
    clima = "No se pudo consultar el clima";
  }
  return { multiplicadorTiempo, clima };
}

function validarIdentificadorMision(valor: unknown): string {
  if (typeof valor !== "string" || valor.trim().length === 0 || valor.length > 200) {
    throw new PartyServiceError("Debes indicar una misión válida.", 400, "MISION_ID_INVALIDO");
  }
  return valor;
}

export async function iniciarExpedicionParty(
  liderUsuarioId: string,
  misionIdDesconocido: unknown,
  modoDesconocido: unknown,
) {
  const misionId = validarIdentificadorMision(misionIdDesconocido);
  const modoDificultad = validarModo(modoDesconocido);
  const ahoraInicial = new Date();

  const lider = await prisma.usuario.findUnique({
    where: { id: liderUsuarioId },
    include: {
      personaje: { include: incluirPersonaje },
      expedicionActiva: { select: { id: true } },
      partyMembresia: { include: { party: true } },
    },
  });
  if (!lider || !lider.personaje) {
    throw new PartyServiceError("Necesitas un personaje para iniciar la expedición.", 404, "PERSONAJE_NO_ENCONTRADO");
  }
  if (!lider.partyMembresia) {
    throw new PartyServiceError("No perteneces a ninguna party.", 409, "SIN_PARTY");
  }
  const partyInicial = lider.partyMembresia.party;
  if (partyInicial.liderUsuarioId !== liderUsuarioId) {
    throw new PartyServiceError("Solo el líder puede iniciar una expedición compartida.", 403, "NO_ES_LIDER");
  }
  if (lider.expedicionActiva) {
    throw new PartyServiceError("El líder tiene una expedición individual activa.", 409, "EXPEDICION_INDIVIDUAL_ACTIVA");
  }
  if (lider.personaje.estado !== "ocioso") {
    throw new PartyServiceError("El personaje líder no está disponible en la base.", 409, "PERSONAJE_NO_DISPONIBLE");
  }

  const coordenadasOrigen = exigirCoordenadas(lider.baseCoords, "la base del líder");
  const misionInicial = obtenerMisionDisponible(lider, misionId, ahoraInicial);

  const miembrosIniciales = await prisma.partyMember.findMany({
    where: { partyId: partyInicial.id },
    orderBy: { unidoEn: "asc" },
    include: { usuario: { include: incluirUsuarioIntegrante } },
  });
  if (miembrosIniciales.length < 2 || miembrosIniciales.length > 3) {
    throw new PartyServiceError("La party debe tener entre dos y tres integrantes para salir de expedición.", 409, "NUMERO_MIEMBROS_INVALIDO");
  }
  const idsIniciales = miembrosIniciales.map((miembro) => miembro.usuarioId).sort();
  if (!idsIniciales.includes(liderUsuarioId)) {
    throw new PartyServiceError("El líder no figura como integrante de su party.", 409, "LIDER_SIN_MEMBRESIA");
  }
  for (const miembro of miembrosIniciales) {
    if (!miembro.usuario.personaje || miembro.usuario.personaje.estado !== "ocioso") {
      throw new PartyServiceError("Todos los integrantes deben tener un personaje disponible en la base.", 409, "MIEMBRO_NO_DISPONIBLE");
    }
    if (miembro.usuario.expedicionActiva) {
      throw new PartyServiceError("Un integrante tiene una expedición individual activa.", 409, "EXPEDICION_INDIVIDUAL_ACTIVA");
    }
    if (miembro.usuario.trasladosComoVisitante.length > 0) {
      throw new PartyServiceError("Un integrante tiene un traslado entre bases activo.", 409, "TRASLADO_ACTIVO");
    }
  }

  const clima = await consultarClima(misionInicial.lat, misionInicial.lng);

  const resultado = await prisma.$transaction(async (tx) => {
    const party = await tx.party.findUnique({
      where: { id: partyInicial.id },
      include: { miembros: { orderBy: { unidoEn: "asc" }, include: { usuario: { include: incluirUsuarioIntegrante } } } },
    });
    if (!party || party.liderUsuarioId !== liderUsuarioId) {
      throw new PartyServiceError("La party ha cambiado o ya no existe.", 409, "PARTY_MODIFICADA");
    }
    const miembros = party.miembros;
    if (miembros.length < 2 || miembros.length > 3) {
      throw new PartyServiceError("La party debe tener entre dos y tres integrantes.", 409, "NUMERO_MIEMBROS_INVALIDO");
    }
    const idsActuales = miembros.map((miembro) => miembro.usuarioId).sort();
    if (idsActuales.join("|") !== idsIniciales.join("|")) {
      throw new PartyServiceError("La composición de la party ha cambiado. Actualiza e inténtalo de nuevo.", 409, "PARTY_MODIFICADA");
    }

    const liderActual = miembros.find((miembro) => miembro.usuarioId === liderUsuarioId)?.usuario;
    if (!liderActual?.personaje || liderActual.personaje.estado !== "ocioso" || liderActual.expedicionActiva) {
      throw new PartyServiceError("El líder ya no está disponible para partir.", 409, "PERSONAJE_NO_DISPONIBLE");
    }
    const coordenadasActuales = exigirCoordenadas(liderActual.baseCoords, "la base del líder");
    const mision = obtenerMisionDisponible(liderActual, misionId, new Date());
    if (mision.tipo !== misionInicial.tipo || mision.enemigoId !== misionInicial.enemigoId ||
        mision.lat !== misionInicial.lat || mision.lng !== misionInicial.lng) {
      throw new PartyServiceError("La misión ha cambiado. Actualiza el mapa e inténtalo de nuevo.", 409, "MISION_MODIFICADA");
    }

    const expedicionActiva = await tx.expedicionParty.findFirst({
      where: { partyId: party.id, fase: { in: [...ESTADOS_EXPEDICION_PARTY_ACTIVOS] } },
      select: { id: true },
    });
    if (expedicionActiva) {
      throw new PartyServiceError("La party ya tiene una expedición activa.", 409, "EXPEDICION_PARTY_ACTIVA");
    }

    const velocidades: number[] = [];
    const datosParticipantes = miembros.map((miembro) => {
      const usuario = miembro.usuario;
      const personaje = usuario.personaje;
      if (!personaje || personaje.estado !== "ocioso") {
        throw new PartyServiceError("Todos los integrantes deben tener un personaje disponible en la base.", 409, "MIEMBRO_NO_DISPONIBLE");
      }
      if (usuario.expedicionActiva) {
        throw new PartyServiceError("Un integrante tiene una expedición individual activa.", 409, "EXPEDICION_INDIVIDUAL_ACTIVA");
      }
      if (usuario.trasladosComoVisitante.length > 0) {
        throw new PartyServiceError("Un integrante tiene un traslado entre bases activo.", 409, "TRASLADO_ACTIVO");
      }

      const datosViaje = obtenerDatosViaje(personaje);
      velocidades.push(datosViaje.velocidadKmh);
      return {
        usuarioId: usuario.id,
        personajeId: personaje.id,
        estado: "en_viaje",
        hpInicio: datosViaje.hpMaximo,
        energiaInicio: datosViaje.energiaMaxima,
        manaInicio: datosViaje.manaMaximo,
        efectoComida: datosViaje.efectoComida,
      };
    });

    const distanciaKm = calcularDistanciaKm(
      coordenadasActuales.lat,
      coordenadasActuales.lng,
      mision.lat,
      mision.lng,
    );
    if (!Number.isFinite(distanciaKm) || distanciaKm < 0) {
      throw new PartyServiceError("La distancia a la misión no es válida.", 400, "DISTANCIA_INVALIDA");
    }
    const fechaSalida = new Date();
    const fechaLlegada = calcularFechaLlegadaParty(
      distanciaKm,
      velocidades,
      clima.multiplicadorTiempo,
      fechaSalida,
    );
    const recompensaJson: Prisma.InputJsonObject = {
      oro: mision.recompensa.oro,
      madera: mision.recompensa.madera,
      piedra: mision.recompensa.piedra,
      metal: mision.recompensa.metal,
      ...(mision.recompensa.objetos
        ? { objetos: mision.recompensa.objetos.map((objeto) => ({ objetoId: objeto.objetoId, cantidad: objeto.cantidad })) }
        : {}),
    };

    const expedicion = await tx.expedicionParty.create({
      data: {
        partyId: party.id,
        liderUsuarioId,
        tipo: mision.tipo,
        misionId: mision.id,
        enemigoId: mision.tipo === "elite" ? mision.enemigoId : null,
        nombre: mision.nombre,
        recompensa: recompensaJson,
        dificultad: mision.dificultad,
        modoDificultad,
        fase: "en_viaje",
        fechaSalida,
        fechaLlegada,
        destinoCoords: { lat: mision.lat, lng: mision.lng },
      },
    });

    await tx.expedicionPartyParticipante.createMany({
      data: datosParticipantes.map((participante) => ({
        expedicionPartyId: expedicion.id,
        ...participante,
      })),
    });

    for (const participante of datosParticipantes) {
      const actualizado = await tx.personaje.updateMany({
        where: { id: participante.personajeId, estado: "ocioso" },
        data: {
          estado: "de_viaje",
          hpActual: participante.hpInicio,
          energiaActual: participante.energiaInicio,
          manaActual: participante.manaInicio,
          comidaPreparada: null,
        },
      });
      if (actualizado.count !== 1) {
        throw new PartyServiceError("El estado de un personaje cambió durante la salida. No se inició la expedición.", 409, "PERSONAJE_MODIFICADO");
      }
    }

    return { expedicion, numeroParticipantes: datosParticipantes.length };
  }, AISLAMIENTO);

  const horasReales = ((resultado.expedicion.fechaLlegada.getTime() - resultado.expedicion.fechaSalida.getTime()) / 3_600_000) * 2;
  return {
    expedicionPartyId: resultado.expedicion.id,
    fechaSalida: resultado.expedicion.fechaSalida.toISOString(),
    fechaLlegada: resultado.expedicion.fechaLlegada.toISOString(),
    clima: clima.clima,
    horasReales: horasReales.toFixed(1),
    numeroParticipantes: resultado.numeroParticipantes,
  };
}

export async function llegarExpedicionParty(usuarioId: string, idDesconocido: unknown) {
  if (typeof idDesconocido !== "string" || idDesconocido.trim().length === 0 || idDesconocido.length > 100) {
    throw new PartyServiceError("El identificador de expedición no es válido.", 400, "EXPEDICION_ID_INVALIDO");
  }
  const expedicionPartyId = idDesconocido.trim();
  return prisma.$transaction(async (tx) => {
    const expedicion = await tx.expedicionParty.findUnique({
      where: { id: expedicionPartyId },
      include: { participantes: { select: { id: true, usuarioId: true, estado: true } } },
    });
    if (!expedicion) throw new PartyServiceError("No se encontró la expedición compartida.", 404, "EXPEDICION_PARTY_NO_ENCONTRADA");
    if (!expedicion.participantes.some((participante) => participante.usuarioId === usuarioId)) {
      throw new PartyServiceError("No perteneces a esta expedición compartida.", 403, "NO_ES_PARTICIPANTE");
    }
    if (expedicion.fase === "lista_para_combate") {
      return { expedicionPartyId, fase: expedicion.fase, llegadaProcesada: true };
    }
    if (expedicion.fase !== "en_viaje") {
      throw new PartyServiceError("La expedición no está en viaje.", 409, "EXPEDICION_PARTY_NO_EN_VIAJE");
    }
    const ahora = new Date();
    if (expedicion.fechaLlegada > ahora) {
      throw new PartyServiceError("La party todavía está de camino.", 409, "EXPEDICION_PARTY_NO_LLEGADA");
    }

    const actualizado = await tx.expedicionParty.updateMany({
      where: { id: expedicionPartyId, fase: "en_viaje", fechaLlegada: { lte: ahora } },
      data: { fase: "lista_para_combate" },
    });
    if (actualizado.count !== 1) {
      const actual = await tx.expedicionParty.findUnique({
        where: { id: expedicionPartyId },
        select: { fase: true },
      });
      if (actual?.fase === "lista_para_combate") {
        return { expedicionPartyId, fase: actual.fase, llegadaProcesada: true };
      }
      throw new PartyServiceError("La expedición cambió de estado durante la llegada.", 409, "EXPEDICION_PARTY_MODIFICADA");
    }

    await tx.expedicionPartyParticipante.updateMany({
      where: { expedicionPartyId, estado: "en_viaje" },
      data: { estado: "en_destino" },
    });
    return { expedicionPartyId, fase: "lista_para_combate", llegadaProcesada: true };
  }, AISLAMIENTO);
}
