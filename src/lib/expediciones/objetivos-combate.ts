/**
 * Reglas comunes de selección de objetivos. Este módulo no modifica estadísticas
 * ni combate: convierte una habilidad y una formación en combatientes objetivo.
 */
export const MAX_ENEMIGOS_COMBATE = 9;
export const MAX_ALIADOS_COMBATE = 9;
export const COLUMNAS_FORMACION_COMBATE = 3;

export type EquipoObjetivoHabilidad = "enemigo" | "aliado" | "propio";
export type PatronObjetivoHabilidad = "individual" | "adyacentes" | "fila" | "columna" | "todos";
export type PosicionFormacionCombate = "mele" | "centro" | "retaguardia";

export interface ReglaObjetivoHabilidad {
  equipo: EquipoObjetivoHabilidad;
  patron: PatronObjetivoHabilidad;
  /** Solo afecta a equipo="aliado". Si es false, excluye al lanzador. */
  incluirPropio?: boolean;
}

export interface HabilidadConObjetivo {
  efecto?: string;
  objetivo?: ReglaObjetivoHabilidad;
}

export interface CombatienteObjetivo {
  id: string;
  nombre?: string;
  equipo: "aliado" | "enemigo";
  posicion?: PosicionFormacionCombate | string | null;
  /** Columna visual/lógica 0..2 dentro de la fila de formación. */
  columna?: number;
  /** Slot explícito 0..8; cuando no existe se deriva de posición+columna. */
  casilla?: number;
  hpActual?: number;
  vivo?: boolean;
  estado?: string | null;
}

export interface SolicitudResolverObjetivos {
  habilidad: HabilidadConObjetivo;
  combatientes: CombatienteObjetivo[];
  actorId: string;
  objetivoId?: string | null;
}

export interface ResultadoResolverObjetivos {
  objetivos: CombatienteObjetivo[];
  objetivoPrincipal: CombatienteObjetivo | null;
  error?: "sin_objetivos" | "objetivo_no_valido" | "limite_formacion_excedido";
}

const FILA_POR_POSICION: Record<PosicionFormacionCombate, number> = {
  mele: 0,
  centro: 1,
  retaguardia: 2,
};

const POSICION_POR_FILA: PosicionFormacionCombate[] = ["mele", "centro", "retaguardia"];

export function obtenerReglaObjetivoHabilidad(habilidad: HabilidadConObjetivo): ReglaObjetivoHabilidad {
  if (habilidad.objetivo) {
    return {
      equipo: habilidad.objetivo.equipo,
      patron: habilidad.objetivo.patron,
      incluirPropio: habilidad.objetivo.incluirPropio,
    };
  }

  // Compatibilidad por defecto: las habilidades dañinas buscan al rival;
  // curaciones/mejoras afectan a un aliado, incluyendo al propio lanzador.
  return habilidad.efecto === "dano"
    ? { equipo: "enemigo", patron: "individual" }
    : { equipo: "aliado", patron: "individual", incluirPropio: true };
}

export function normalizarColumna(columna: unknown): number {
  if (typeof columna !== "number" || !Number.isFinite(columna)) return 0;
  return Math.max(0, Math.min(COLUMNAS_FORMACION_COMBATE - 1, Math.floor(columna)));
}

export function normalizarPosicionFormacion(posicion: unknown): PosicionFormacionCombate {
  return posicion === "mele" || posicion === "centro" || posicion === "retaguardia"
    ? posicion
    : "centro";
}

export function indiceCasillaFormacion(posicion: unknown, columna: unknown = 0): number {
  return FILA_POR_POSICION[normalizarPosicionFormacion(posicion)] * COLUMNAS_FORMACION_COMBATE
    + normalizarColumna(columna);
}

export function posicionDesdeIndiceCasilla(indice: number): {
  posicion: PosicionFormacionCombate;
  columna: number;
} {
  const seguro = Number.isFinite(indice) ? Math.max(0, Math.min(8, Math.floor(indice))) : 4;
  return {
    posicion: POSICION_POR_FILA[Math.floor(seguro / COLUMNAS_FORMACION_COMBATE)],
    columna: seguro % COLUMNAS_FORMACION_COMBATE,
  };
}

function estaVivo(combatiente: CombatienteObjetivo): boolean {
  if (combatiente.vivo === false) return false;
  if (typeof combatiente.hpActual === "number" && combatiente.hpActual <= 0) return false;
  if (combatiente.estado && ["caido", "huyo", "retirado", "derrotado", "muerto"].includes(combatiente.estado)) {
    return false;
  }
  return true;
}

function indiceCasilla(combatiente: CombatienteObjetivo, indiceOriginal: number): number {
  if (typeof combatiente.casilla === "number" && Number.isFinite(combatiente.casilla)) {
    return Math.max(0, Math.min(8, Math.floor(combatiente.casilla)));
  }
  if (typeof combatiente.columna === "number" && Number.isFinite(combatiente.columna)) {
    return indiceCasillaFormacion(combatiente.posicion, combatiente.columna);
  }
  // Fallback estable para datos legados sin casilla: respeta el orden recibido
  // y llena primero las columnas de la fila central por defecto.
  const pos = normalizarPosicionFormacion(combatiente.posicion);
  return indiceCasillaFormacion(pos, indiceOriginal % COLUMNAS_FORMACION_COMBATE);
}

function ordenarPorFormacion(combatientes: CombatienteObjetivo[]): CombatienteObjetivo[] {
  return [...combatientes].sort((a, b) => {
    const filaA = Math.floor(indiceCasilla(a, 0) / COLUMNAS_FORMACION_COMBATE);
    const filaB = Math.floor(indiceCasilla(b, 0) / COLUMNAS_FORMACION_COMBATE);
    const columnaA = indiceCasilla(a, 0) % COLUMNAS_FORMACION_COMBATE;
    const columnaB = indiceCasilla(b, 0) % COLUMNAS_FORMACION_COMBATE;
    return filaA - filaB || columnaA - columnaB || a.id.localeCompare(b.id);
  });
}

/**
 * Resuelve los objetivos reales desde una formación de hasta 9 combatientes por
 * equipo. Para individuales/áreas con ancla, la ausencia de objetivo selecciona
 * la primera casilla viva: melé antes que centro y retaguardia, y luego columna.
 */
export function resolverObjetivosHabilidad(
  solicitud: SolicitudResolverObjetivos,
): ResultadoResolverObjetivos {
  const { habilidad, combatientes, actorId } = solicitud;
  const regla = obtenerReglaObjetivoHabilidad(habilidad);
  const aliadosTodos = combatientes.filter((c) => c.equipo === "aliado" && estaVivo(c));
  const enemigosTodos = combatientes.filter((c) => c.equipo === "enemigo" && estaVivo(c));

  if (aliadosTodos.length > MAX_ALIADOS_COMBATE || enemigosTodos.length > MAX_ENEMIGOS_COMBATE) {
    return { objetivos: [], objetivoPrincipal: null, error: "limite_formacion_excedido" };
  }

  const actor = aliadosTodos.find((c) => c.id === actorId);
  let candidatos: CombatienteObjetivo[];
  if (regla.equipo === "propio") {
    candidatos = actor ? [actor] : [];
  } else if (regla.equipo === "aliado") {
    candidatos = aliadosTodos.filter((c) => regla.incluirPropio !== false || c.id !== actorId);
  } else {
    candidatos = enemigosTodos;
  }
  candidatos = ordenarPorFormacion(candidatos);
  if (candidatos.length === 0) {
    return { objetivos: [], objetivoPrincipal: null, error: "sin_objetivos" };
  }

  if (regla.patron === "todos") {
    return { objetivos: candidatos, objetivoPrincipal: candidatos[0] };
  }

  const elegido = solicitud.objetivoId
    ? candidatos.find((c) => c.id === solicitud.objetivoId)
    : candidatos[0];
  if (!elegido) {
    return { objetivos: [], objetivoPrincipal: null, error: "objetivo_no_valido" };
  }

  if (regla.patron === "individual" || regla.equipo === "propio") {
    return { objetivos: [elegido], objetivoPrincipal: elegido };
  }

  const indiceElegido = indiceCasilla(elegido, candidatos.indexOf(elegido));
  const filaElegida = Math.floor(indiceElegido / COLUMNAS_FORMACION_COMBATE);
  const columnaElegida = indiceElegido % COLUMNAS_FORMACION_COMBATE;
  const objetivos = candidatos.filter((c) => {
    const indice = indiceCasilla(c, candidatos.indexOf(c));
    const fila = Math.floor(indice / COLUMNAS_FORMACION_COMBATE);
    const columna = indice % COLUMNAS_FORMACION_COMBATE;
    if (regla.patron === "fila") return fila === filaElegida;
    if (regla.patron === "columna") return columna === columnaElegida;
    return Math.abs(fila - filaElegida) + Math.abs(columna - columnaElegida) <= 1;
  });

  return {
    objetivos: ordenarPorFormacion(objetivos),
    objetivoPrincipal: elegido,
  };
}
