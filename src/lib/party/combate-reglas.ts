/** Limita el historial persistido, conservando el orden de las entradas válidas. */
export function obtenerLogCombateParty(valor: unknown): string[] {
  return Array.isArray(valor)
    ? valor.filter((entrada): entrada is string => typeof entrada === "string").slice(-120)
    : [];
}

export type FaseCombateParty = "activo" | "victoria" | "derrota" | "huida";

export interface ParticipanteTurnoParty {
  usuarioId: string;
  ordenTurno: number;
  jugadorHp: number;
  estado: string;
}

function ordenarParticipantes(participantes: ParticipanteTurnoParty[]) {
  return [...participantes].sort((a, b) => a.ordenTurno - b.ordenTurno);
}

export function obtenerParticipantesVivos(
  participantes: ParticipanteTurnoParty[],
): ParticipanteTurnoParty[] {
  return ordenarParticipantes(participantes).filter(
    (participante) => participante.estado === "activo" && participante.jugadorHp > 0,
  );
}

export function resolverResultadoCombateParty(
  enemigoHp: number,
  participantes: ParticipanteTurnoParty[],
): FaseCombateParty {
  if (!Number.isFinite(enemigoHp)) throw new RangeError("El HP del enemigo debe ser un número finito.");
  if (enemigoHp <= 0) return "victoria";
  if (obtenerParticipantesVivos(participantes).length > 0) return "activo";
  return participantes.some((participante) => participante.estado === "huyo") ? "huida" : "derrota";
}
