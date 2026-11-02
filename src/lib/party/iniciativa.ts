import { avanzarSecuenciaTurnosVelocidad, crearSecuenciaTurnosVelocidad, normalizarSecuenciaTurnosVelocidad, type ActorTurnoVelocidad, type PasoTurnoVelocidad } from "@/lib/expediciones/iniciativa-combate";
import type { ParticipanteTurnoParty } from "./combate-reglas";
import type { EnemigoEnCombate } from "@/lib/expediciones/enemigos-combate";

/** Iniciativa compartida y compatibilidad con colas antiguas, sin acceso a Prisma. */
export type ParticipanteConVelocidadParty = {
  usuarioId: string;
  ordenTurno: number;
  estado: string;
  jugadorHp: number;
  jugadorVelocidad: number;
};

export function construirActoresVivosParty(
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

export function obtenerColaActualParty(
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

export function prepararSiguienteTurnoVelocidad(
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
