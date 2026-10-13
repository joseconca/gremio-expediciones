export type ObjetivoAccionCombate = "propio" | "oponente";
export type TipoAccionContrato = "atacar" | "usar_habilidad" | "usar_objeto";
export type TipoCombateContrato = "pve" | "pvp";

export function obtenerObjetivoEsperadoAccion(
  accion: TipoAccionContrato,
  efectoHabilidad?: string | null,
): ObjetivoAccionCombate {
  if (accion === "usar_objeto") return "propio";
  if (accion === "usar_habilidad" && efectoHabilidad !== "dano") return "propio";
  return "oponente";
}

export function validarObjetivoAccionCombate(input: {
  accion: TipoAccionContrato;
  objetivo: unknown;
  efectoHabilidad?: string | null;
  permitirInferencia?: boolean;
}):
  | { valido: true; objetivo: ObjetivoAccionCombate; inferido: boolean }
  | { valido: false; error: string } {
  const esperado = obtenerObjetivoEsperadoAccion(input.accion, input.efectoHabilidad);
  if (input.objetivo === undefined || input.objetivo === null || input.objetivo === "") {
    if (input.permitirInferencia) return { valido: true, objetivo: esperado, inferido: true };
    return { valido: false, error: "Debes indicar el objetivo de la acción." };
  }
  if (input.objetivo !== "propio" && input.objetivo !== "oponente") {
    return { valido: false, error: "El objetivo de la acción no es válido." };
  }
  if (input.objetivo !== esperado) {
    return {
      valido: false,
      error: input.accion === "usar_habilidad"
        ? "El objetivo no coincide con el efecto de la habilidad."
        : input.accion === "usar_objeto"
          ? "Los objetos consumibles deben dirigirse al personaje propio."
          : "Los ataques básicos deben dirigirse al oponente.",
    };
  }
  return { valido: true, objetivo: esperado, inferido: false };
}

export function validarTurnoAccionCombate(input: {
  tipo: TipoCombateContrato;
  turno: unknown;
  usuarioId: string;
  atacanteUsuarioId?: string | null;
  defensorUsuarioId?: string | null;
  accion: TipoAccionContrato;
}):
  | { valido: true; actor: "jugador" | "enemigo" | "atacante" | "defensor" }
  | { valido: false; estado: number; error: string } {
  if (input.tipo === "pvp") {
    if (input.turno !== "atacante" && input.turno !== "defensor") {
      return { valido: false, estado: 409, error: "Turno de combate PvP no válido." };
    }
    const actorEsperado = input.turno === "atacante" ? input.atacanteUsuarioId : input.defensorUsuarioId;
    if (actorEsperado !== input.usuarioId) {
      return { valido: false, estado: 409, error: "No es tu turno de combate." };
    }
    return { valido: true, actor: input.turno };
  }

  if (input.turno !== "jugador" && input.turno !== "enemigo") {
    return { valido: false, estado: 409, error: "Turno de combate no válido." };
  }
  if ((input.accion === "usar_habilidad" || input.accion === "usar_objeto") && input.turno !== "jugador") {
    return { valido: false, estado: 409, error: "Solo puedes usar habilidades u objetos durante tu turno." };
  }
  return { valido: true, actor: input.turno };
}
