export type FaseTurnoParty = "jugador" | "enemigo";
export type FaseCombateParty = "activo" | "victoria" | "derrota";

export interface ParticipanteTurnoParty {
  usuarioId: string;
  ordenTurno: number;
  jugadorHp: number;
  estado: string;
}

export interface EstadoTurnoParty {
  faseCombate: FaseCombateParty;
  faseTurno: FaseTurnoParty;
  turnoActualUsuarioId: string | null;
  ronda: number;
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
  return obtenerParticipantesVivos(participantes).length > 0 ? "activo" : "derrota";
}

/**
 * Avanza un solo actor del ciclo compartido:
 * jugador -> siguiente jugador vivo -> enemigo -> siguiente ronda.
 * La lista de participantes mantiene su orden congelado al crear el combate.
 */
export function calcularSiguienteTurnoParty(
  estado: EstadoTurnoParty,
  participantes: ParticipanteTurnoParty[],
): EstadoTurnoParty {
  if (estado.faseCombate !== "activo") return { ...estado };

  const vivos = obtenerParticipantesVivos(participantes);
  if (vivos.length === 0) {
    return {
      faseCombate: "derrota",
      faseTurno: "enemigo",
      turnoActualUsuarioId: null,
      ronda: estado.ronda,
    };
  }

  if (estado.faseTurno === "jugador") {
    const actual = participantes.find(
      (participante) => participante.usuarioId === estado.turnoActualUsuarioId,
    );
    if (!actual) {
      return {
        faseCombate: "activo",
        faseTurno: "jugador",
        turnoActualUsuarioId: vivos[0].usuarioId,
        ronda: estado.ronda,
      };
    }

    const siguiente = vivos.find((participante) => participante.ordenTurno > actual.ordenTurno);
    if (siguiente) {
      return {
        faseCombate: "activo",
        faseTurno: "jugador",
        turnoActualUsuarioId: siguiente.usuarioId,
        ronda: estado.ronda,
      };
    }

    return {
      faseCombate: "activo",
      faseTurno: "enemigo",
      turnoActualUsuarioId: null,
      ronda: estado.ronda,
    };
  }

  return {
    faseCombate: "activo",
    faseTurno: "jugador",
    turnoActualUsuarioId: vivos[0].usuarioId,
    ronda: estado.ronda + 1,
  };
}

export function crearEstadoInicialTurnoParty(
  participantes: ParticipanteTurnoParty[],
): EstadoTurnoParty {
  const vivos = obtenerParticipantesVivos(participantes);
  if (vivos.length < 2 || vivos.length > 3) {
    throw new RangeError("El combate de party requiere dos o tres participantes vivos.");
  }
  return {
    faseCombate: "activo",
    faseTurno: "jugador",
    turnoActualUsuarioId: vivos[0].usuarioId,
    ronda: 1,
  };
}
