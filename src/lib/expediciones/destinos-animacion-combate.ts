import type { AccionAnimadaCombate } from "./combate";

export type ContextoDestinoVisualCombate =
  | { modo: "pve" }
  | { modo: "party"; usuarioId: string }
  | { modo: "pvp"; esAtacante: boolean };

export interface PulsoEstadoVisual {
  actor: string;
  tipo: "curacion" | "dano";
  cantidad: number;
}

export interface DestinosVisualesAccionCombate {
  actorVisual: string;
  objetivoVisual: string;
  pulsosEstadoVisibles: PulsoEstadoVisual[];
}

function opuesto(actor: "jugador" | "enemigo"): "jugador" | "enemigo" {
  return actor === "jugador" ? "enemigo" : "jugador";
}

function esAccionDeSoporte(accion: AccionAnimadaCombate): boolean {
  return accion.presentacion?.modo === "curacion" ||
    accion.presentacion?.modo === "defensiva" ||
    accion.animacion === "curacion" ||
    accion.animacion === "defensiva" ||
    accion.animacion === "escudo";
}

/**
 * Normaliza origen, objetivo y pulsos para PvE, parties y ambas perspectivas PvP.
 * Solo interpreta metadatos visuales: no elige objetivos ni cambia reglas de combate.
 */
export function resolverDestinosVisualesAccion(input: {
  accion: AccionAnimadaCombate;
  contexto: ContextoDestinoVisualCombate;
  actorUsuarioId?: string | null;
  objetivoUsuarioId?: string | null;
}): DestinosVisualesAccionCombate {
  const { accion, contexto } = input;
  const actorUsuarioId = input.actorUsuarioId ?? accion.actorUsuarioId ?? null;
  const objetivoUsuarioId = input.objetivoUsuarioId ?? accion.objetivoUsuarioId ?? null;
  const soporte = esAccionDeSoporte(accion);

  let actorVisual: string;
  if (contexto.modo === "party") {
    actorVisual = accion.actor === "enemigo"
      ? accion.actorEnemigoId ?? accion.actoresEnemigoIds?.[0] ?? "enemigo"
      : actorUsuarioId ?? contexto.usuarioId;
  } else if (contexto.modo === "pvp" && !contexto.esAtacante) {
    actorVisual = opuesto(accion.actor);
  } else {
    actorVisual = accion.actor;
  }

  let objetivoVisual: string;
  if (contexto.modo === "party") {
    objetivoVisual = objetivoUsuarioId ?? (soporte
      ? actorVisual
      : accion.actor === "enemigo" ? contexto.usuarioId : accion.enemigoObjetivoId ?? "enemigo");
  } else if (accion.enemigoObjetivoId) {
    objetivoVisual = accion.enemigoObjetivoId;
  } else {
    objetivoVisual = soporte ? actorVisual : opuesto(actorVisual as "jugador" | "enemigo");
  }

  const pulsosEstadoVisibles = (accion.pulsosEstado ?? []).map((pulso) => {
    let actor: string;
    if (contexto.modo === "party") {
      actor = pulso.objetivoUsuarioId ?? (
        pulso.objetivo === "enemigo"
          ? "enemigo"
          : accion.actor === "enemigo"
            ? objetivoUsuarioId ?? contexto.usuarioId
            : actorVisual
      );
    } else if (contexto.modo === "pvp" && !contexto.esAtacante) {
      actor = opuesto(pulso.objetivo);
    } else {
      actor = pulso.objetivo;
    }
    return { actor, tipo: pulso.tipo, cantidad: pulso.cantidad };
  });

  return { actorVisual, objetivoVisual, pulsosEstadoVisibles };
}