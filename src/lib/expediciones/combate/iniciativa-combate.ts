/**
 * Cada participante tiene una próxima acción programada. Al actuar, espera
 * 1 / velocidad unidades de tiempo antes de volver a actuar.
 */
export type EquipoTurnoVelocidad = "jugador" | "enemigo";

export interface ActorTurnoVelocidad {
  actorId: string;
  equipo: EquipoTurnoVelocidad;
  velocidad: number;
}

export interface PasoTurnoVelocidad {
  actorId: string;
  equipo: EquipoTurnoVelocidad;
  instante?: number;
  velocidad?: number;
}

export interface AvanceTurnosVelocidad {
  turnoActual: PasoTurnoVelocidad | null;
  turnosPendientes: PasoTurnoVelocidad[];
  ronda: number;
}

function hashDeterminista(valor: string): number {
  let hash = 2166136261;
  for (let indice = 0; indice < valor.length; indice += 1) {
    hash ^= valor.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizarActores(actores: ActorTurnoVelocidad[]): ActorTurnoVelocidad[] {
  const vistos = new Set<string>();
  return actores.filter((actor) => {
    if (
      !actor ||
      typeof actor.actorId !== "string" ||
      actor.actorId.trim() === "" ||
      (actor.equipo !== "jugador" && actor.equipo !== "enemigo") ||
      !Number.isFinite(actor.velocidad) ||
      actor.velocidad <= 0 ||
      vistos.has(actor.actorId)
    ) return false;
    vistos.add(actor.actorId);
    return true;
  }).map((actor) => ({ ...actor, actorId: actor.actorId.trim() }));
}

export function normalizarSecuenciaTurnosVelocidad(valor: unknown): PasoTurnoVelocidad[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((entrada): PasoTurnoVelocidad[] => {
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return [];
    const paso = entrada as Record<string, unknown>;
    if (
      typeof paso.actorId !== "string" ||
      !paso.actorId.trim() ||
      (paso.equipo !== "jugador" && paso.equipo !== "enemigo")
    ) return [];
    return [{
      actorId: paso.actorId,
      equipo: paso.equipo,
      ...(typeof paso.velocidad === "number" && Number.isFinite(paso.velocidad) && paso.velocidad > 0 ? { velocidad: paso.velocidad } : {}),
      ...(typeof paso.instante === "number" && Number.isFinite(paso.instante) ? { instante: paso.instante } : {}),
    }];
  });
}

export function crearSecuenciaTurnosVelocidad(
  actoresEntrada: ActorTurnoVelocidad[],
  semilla: string,
  actorPreferido?: string | null,
): PasoTurnoVelocidad[] {
  const actores = normalizarActores(actoresEntrada);
  if (actores.length === 0) return [];

  const ordenados = actores.sort((a, b) =>
    b.velocidad - a.velocidad ||
    hashDeterminista(`${semilla}:${a.actorId}`) - hashDeterminista(`${semilla}:${b.actorId}`) ||
    a.actorId.localeCompare(b.actorId),
  );
  return ordenados.map((actor, indice) => ({
    actorId: actor.actorId,
    equipo: actor.equipo,
    velocidad: actor.velocidad,
    instante: actor.actorId === actorPreferido ? 0 : (indice + 1) * 1e-9,
  })).sort((a, b) => a.instante - b.instante);
}

/**
 * Consume el actor actual, descarta los turnos restantes de combatientes caídos
 * y vuelve a programar su turno. Los cambios de velocidad reajustan la
 * espera que todavía no se ha consumido.
 */
export function avanzarSecuenciaTurnosVelocidad(entrada: {
  turnosPendientes: unknown;
  actoresVivos: ActorTurnoVelocidad[];
  ronda: number;
  semilla: string;
}): AvanceTurnosVelocidad {
  const vivos = normalizarActores(entrada.actoresVivos);
  const porId = new Map(vivos.map(actor => [actor.actorId, actor]));
  const guardada = normalizarSecuenciaTurnosVelocidad(entrada.turnosPendientes);
  let cola = guardada;
  if (guardada.some(paso => paso.instante === undefined)) {
    const reconstruida = crearSecuenciaTurnosVelocidad(vivos, entrada.semilla);
    const unicos = new Map<string, PasoTurnoVelocidad>();
    for (const paso of [...guardada, ...reconstruida]) {
      if (!unicos.has(paso.actorId)) unicos.set(paso.actorId, paso);
    }
    cola = [...unicos.values()].map((paso, indice) => ({ ...paso, instante: indice * 1e-9 }));
  }
  const actual = cola[0];
  const ahora = actual?.instante ?? 0;
  const pendientes = cola.slice(1).flatMap(paso => {
    const vivo = porId.get(paso.actorId);
    if (!vivo) return [];
    const espera = Math.max(0, (paso.instante ?? ahora) - ahora);
    return [{
      ...paso,
      instante: ahora + espera * (paso.velocidad ?? vivo.velocidad) / vivo.velocidad,
      velocidad: vivo.velocidad,
    }];
  });
  const actor = actual && porId.get(actual.actorId);
  if (actor) {
    pendientes.push({ actorId: actor.actorId, equipo: actor.equipo, velocidad: actor.velocidad, instante: ahora + 1 / actor.velocidad });
  }
  const programados = new Set(pendientes.map(paso => paso.actorId));
  for (const vivo of vivos) {
    if (!programados.has(vivo.actorId)) {
      pendientes.push({ actorId: vivo.actorId, equipo: vivo.equipo, velocidad: vivo.velocidad, instante: ahora + 1 / vivo.velocidad });
    }
  }
  pendientes.sort((a, b) => (a.instante ?? 0) - (b.instante ?? 0) || a.actorId.localeCompare(b.actorId));
  return {
    turnoActual: pendientes[0] ?? null,
    turnosPendientes: pendientes,
    ronda: entrada.ronda + 1,
  };
}
