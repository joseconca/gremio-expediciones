/**
 * Secuencia reproducible de iniciativa para combates PvE en solitario y party.
 *
 * Cada combatiente obtiene acciones en proporción a su velocidad respecto
 * a la más baja: 10/15/30 produce 1/2/3, y 10/100 produce 1/10. Se intercala una
 * acción de cada combatiente elegible por pasada, empezando por el más rápido.
 * Los empates se resuelven con un hash de semilla, actor y ronda, nunca con
 * aleatoriedad de servidor no reproducible.
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
}

export interface AvanceTurnosVelocidad {
  turnoActual: PasoTurnoVelocidad | null;
  turnosPendientes: PasoTurnoVelocidad[];
  ronda: number;
  nuevaRonda: boolean;
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
    return [{ actorId: paso.actorId, equipo: paso.equipo }];
  });
}

export function crearSecuenciaTurnosVelocidad(
  actoresEntrada: ActorTurnoVelocidad[],
  semilla: string,
  actorPreferidoId?: string | null,
): PasoTurnoVelocidad[] {
  const actores = normalizarActores(actoresEntrada);
  if (actores.length === 0) return [];

  const velocidadBase = Math.min(...actores.map((actor) => actor.velocidad));
  const conAcciones = actores.map((actor) => ({
    ...actor,
    acciones: Math.max(1, Math.round(actor.velocidad / velocidadBase)),
    desempate: hashDeterminista(`${semilla}:${actor.actorId}`),
  })).sort((a, b) =>
    b.velocidad - a.velocidad ||
    a.desempate - b.desempate ||
    a.actorId.localeCompare(b.actorId),
  );

  // Repartimos las acciones a lo largo del ciclo, en vez de agruparlas
  // por pasadas. Así 3/2/1 queda C, B, C, A, C, B y no provoca que el actor
  // más rápido actúe dos veces seguidas al cruzar el límite entre rondas.
  const eventos = conAcciones.flatMap((actor, rango) => {
    const desfase = rango / (conAcciones.length + 1);
    return Array.from({ length: actor.acciones }, (_, indice) => ({
      paso: { actorId: actor.actorId, equipo: actor.equipo },
      instante: (indice / actor.acciones + desfase) % 1,
      rango,
      indice,
    }));
  }).sort((a, b) =>
    a.instante - b.instante ||
    a.rango - b.rango ||
    a.indice - b.indice,
  );
  const secuencia: PasoTurnoVelocidad[] = eventos.map((evento) => evento.paso);

  // La comida de iniciativa conserva su comportamiento de abrir el combate
  // con un aventurero, pero no altera la cantidad total de acciones del ciclo.
  if (actorPreferidoId) {
    const indicePreferido = secuencia.findIndex((paso) => paso.actorId === actorPreferidoId);
    if (indicePreferido > 0) {
      secuencia.unshift(secuencia.splice(indicePreferido, 1)[0]);
    }
  }
  return secuencia;
}

/**
 * Consume el actor actual, descarta los turnos restantes de combatientes caídos
 * y prepara el siguiente ciclo solo cuando ya no queda ninguna acción elegible.
 */
export function avanzarSecuenciaTurnosVelocidad(entrada: {
  turnosPendientes: unknown;
  actoresVivos: ActorTurnoVelocidad[];
  ronda: number;
  semilla: string;
}): AvanceTurnosVelocidad {
  const vivos = normalizarActores(entrada.actoresVivos);
  const idsVivos = new Set(vivos.map((actor) => actor.actorId));
  const restantes = normalizarSecuenciaTurnosVelocidad(entrada.turnosPendientes)
    .slice(1)
    .filter((paso) => idsVivos.has(paso.actorId));

  if (restantes.length > 0) {
    return {
      turnoActual: restantes[0],
      turnosPendientes: restantes,
      ronda: entrada.ronda,
      nuevaRonda: false,
    };
  }

  const ronda = entrada.ronda + 1;
  const secuenciaNueva = crearSecuenciaTurnosVelocidad(vivos, `${entrada.semilla}:${ronda}`);
  return {
    turnoActual: secuenciaNueva[0] ?? null,
    turnosPendientes: secuenciaNueva,
    ronda,
    nuevaRonda: true,
  };
}
