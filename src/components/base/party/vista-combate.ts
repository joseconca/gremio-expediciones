import type { CombatePve } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import type { CombatePartyModalUI, RecompensaInformeCombate } from "@/components/combate/tipos";
import type { EstadoParty, ResultadoCombatePanelParty } from "./tipos";

type CombatePartyVista = NonNullable<NonNullable<EstadoParty["expedicionActiva"]>["combate"]>;

/** Adaptador puro del contrato de party para el modal PvE compartido. */
export function crearVistaCombate(
  estado: EstadoParty | null,
  personaje: unknown,
  expedicionConCombate: EstadoParty["expedicionActiva"],
  combatePartyDatos: CombatePartyVista | null,
  participanteModal: CombatePartyVista["participantes"][number] | undefined,
): CombatePve | null {
    if (!estado || !personaje || !expedicionConCombate || !combatePartyDatos || !participanteModal) return null;
    const cooldownsRaw = participanteModal.cooldowns;
    const cooldowns = cooldownsRaw && typeof cooldownsRaw === "object" && !Array.isArray(cooldownsRaw)
      ? Object.fromEntries(Object.entries(cooldownsRaw).filter(([, valor]) => typeof valor === "number" && Number.isFinite(valor) && valor > 0)) as Record<string, number>
      : {};
    const efectosJugador = Array.isArray(participanteModal.efectos) ? participanteModal.efectos : [];
    const efectosEnemigo = Array.isArray(combatePartyDatos.efectosEnemigo) ? combatePartyDatos.efectosEnemigo : [];
    const log = Array.isArray(combatePartyDatos.log)
      ? combatePartyDatos.log.filter((linea): linea is string => typeof linea === "string")
      : [];
    const esMiTurno = combatePartyDatos.faseTurno === "jugador" &&
      combatePartyDatos.turnoActualUsuarioId === estado.usuarioId &&
      participanteModal.estado === "activo";
    return {
      id: combatePartyDatos.id,
      version: combatePartyDatos.version,
      enemigos: Array.isArray(combatePartyDatos.enemigos)
        ? combatePartyDatos.enemigos as NonNullable<CombatePve["enemigos"]>
        : undefined,
      expedicionId: expedicionConCombate.id,
      fase: combatePartyDatos.fase as CombatePve["fase"],
      ronda: combatePartyDatos.ronda,
      turno: esMiTurno ? "jugador" : "enemigo",
      jugadorPosicion: participanteModal.jugadorPosicion as CombatePve["jugadorPosicion"],
      enemigoPosicion: "centro",
      tipo: expedicionConCombate.tipo as CombatePve["tipo"],
      jugadorHp: participanteModal.jugadorHp,
      jugadorHpMaximo: participanteModal.jugadorHpMaximo,
      jugadorAtaque: participanteModal.jugadorAtaque,
      jugadorDefensa: participanteModal.jugadorDefensa,
      jugadorVelocidad: participanteModal.jugadorVelocidad,
      jugadorProbCritico: participanteModal.jugadorProbCritico,
      jugadorDanoCritico: participanteModal.jugadorDanoCritico,
      jugadorNivel: participanteModal.jugadorNivel,
      enemigoHp: combatePartyDatos.enemigoHp,
      enemigoHpMaximo: combatePartyDatos.enemigoHpMaximo,
      enemigoAtaque: combatePartyDatos.enemigoAtaque,
      enemigoDefensa: combatePartyDatos.enemigoDefensa,
      enemigoVelocidad: combatePartyDatos.enemigoVelocidad,
      enemigoProbCritico: combatePartyDatos.enemigoProbCritico,
      enemigoDanoCritico: combatePartyDatos.enemigoDanoCritico,
      enemigoNivel: combatePartyDatos.enemigoNivel,
      enemigoId: combatePartyDatos.enemigoId,
      enemigoNombre: combatePartyDatos.enemigoNombre,
      ganadorUsuarioId: null,
      oroGanado: 0,
      experienciaGanada: 0,
      cooldowns,
      efectos: efectosJugador,
      efectosDefensor: efectosEnemigo,
      log,
      creado: expedicionConCombate.fechaSalida,
      actualizado: expedicionConCombate.fechaLlegada,
    };
}

/**
 * Contrato de presentación del modo de compañía. Los identificadores, estados,
 * recursos y apariencias de los participantes se proyectan una sola vez aquí.
 * No resuelve turnos ni modifica el estado persistido.
 */
export function crearModoCombateParty(
  estado: EstadoParty,
  expedicionConCombate: EstadoParty["expedicionActiva"],
  combatePartyDatos: CombatePartyVista,
  participanteModal: CombatePartyVista["participantes"][number] | undefined,
): Omit<CombatePartyModalUI, "onAccionParty"> {
  return {
    usuarioId: estado.usuarioId,
    nombreExpedicion: expedicionConCombate?.nombre ?? "Expedición compartida",
    faseTurno: combatePartyDatos.faseTurno === "enemigo" ? "enemigo" : "jugador",
    turnoActualUsuarioId: combatePartyDatos.turnoActualUsuarioId,
    estadoJugador: participanteModal?.estado ?? "activo",
    participantes: combatePartyDatos.participantes.map((participante) => ({
      id: participante.id,
      usuarioId: participante.usuarioId,
      nombre: participante.usuario?.personaje?.nombre ?? participante.usuario?.nombre ?? "Aventurero",
      clase: participante.usuario?.personaje?.clase ?? "novato",
      sexo: participante.usuario?.personaje?.sexo === "chica" ? "chica" : "chico",
      esLider: participante.usuarioId === estado.party?.liderUsuarioId,
      ordenTurno: participante.ordenTurno,
      estado: participante.estado,
      jugadorPosicion: participante.jugadorPosicion,
      jugadorHp: participante.jugadorHp,
      jugadorHpMaximo: participante.jugadorHpMaximo,
      jugadorAtaque: participante.jugadorAtaque,
      jugadorAtaqueMagico: participante.jugadorAtaqueMagico,
      jugadorDefensa: participante.jugadorDefensa,
      jugadorDefensaMagica: participante.jugadorDefensaMagica,
      jugadorVelocidad: participante.jugadorVelocidad,
      jugadorProbCritico: participante.jugadorProbCritico,
      jugadorDanoCritico: participante.jugadorDanoCritico,
      jugadorPrecision: participante.jugadorPrecision,
      jugadorEvasion: participante.jugadorEvasion,
      jugadorNivel: participante.jugadorNivel,
      profesionActivaId: participante.profesionActivaId,
      armaSpriteId: participante.armaSpriteId,
      escudoSpriteId: participante.escudoSpriteId,
      jugadorEnergiaActual: participante.jugadorEnergiaActual,
      jugadorEnergiaMaxima: participante.jugadorEnergiaMaxima,
      jugadorManaActual: participante.jugadorManaActual,
      jugadorManaMaximo: participante.jugadorManaMaximo,
      efectos: participante.efectos,
      comidaActiva: participante.comidaActiva,
      pasivas: participante.pasivas,
    })),
    ultimaAccion: combatePartyDatos.ultimaAccion && typeof combatePartyDatos.ultimaAccion === "object"
      ? combatePartyDatos.ultimaAccion as AccionAnimadaCombate
      : null,
  };
}

/**
 * Construye el resumen del combate exclusivamente con recompensas del usuario actual.
 * Prioriza la liquidación más reciente del servidor y utiliza el informe local
 * solo si pertenece a esta expedición; no reparte ni recalcula botín.
 */
export function crearRecompensaInformeCombateParty(
  estado: EstadoParty | null,
  ultimoResultadoCombate: ResultadoCombatePanelParty | null,
): RecompensaInformeCombate | null {
  const expedicion = estado?.expedicionActiva;
  const resultadoRecompensasParty = expedicion?.combate?.recompensasResultado
    ?? (ultimoResultadoCombate && ultimoResultadoCombate.expedicionPartyId === expedicion?.id
      ? ultimoResultadoCombate.recompensas
      : null);
  const recompensa = resultadoRecompensasParty?.recompensas.find(
    (resultado) => resultado.usuarioId === estado?.usuarioId,
  );
  const botin = (resultadoRecompensasParty?.dropsEnemigo ?? [])
    .filter((drop) => drop.usuarioId === estado?.usuarioId)
    .map((drop) => `${drop.nombre}${drop.sufijoId ? ` ${drop.sufijoId}` : ""} ×${drop.cantidad}`);

  return recompensa ? {
    oro: recompensa.oro,
    madera: recompensa.madera,
    piedra: recompensa.piedra,
    metal: recompensa.metal,
    experiencia: recompensa.experiencia,
    experienciaJob: recompensa.experienciaJob ?? 0,
    botin,
  } : null;
}
