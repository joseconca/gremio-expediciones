import type { CombatePve } from "@/store/useGameStore";
import type { EstadoParty } from "./tipos";

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
