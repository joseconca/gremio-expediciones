import type { TipoArmadura, TipoArma } from "../tiposJuego";

export interface RequisitoClase {
  claseId: string;
  nivelJob: number;
}

export interface DefinicionClase {
  id: string;
  nombre: string;
  descripcion: string;
  tier: number;
  nivelJobMaximo: number;
  requisitos: readonly RequisitoClase[];
  armasDominadas: readonly TipoArma[];
  armadurasDominadas: readonly TipoArmadura[];
  bonoAtaqueArmaDominada: number;
  bonoDefensaArmaduraDominada: number;
}

const NOVATO_JOB_10: readonly RequisitoClase[] = [{ claseId: "novato", nivelJob: 10 }];
const ESPADACHIN_JOB_40: readonly RequisitoClase[] = [{ claseId: "espadachin", nivelJob: 40 }];
const ACOLITO_JOB_40: readonly RequisitoClase[] = [{ claseId: "acolito", nivelJob: 40 }];
const ARQUERO_JOB_40: readonly RequisitoClase[] = [{ claseId: "arquero", nivelJob: 40 }];
const MAGO_JOB_40: readonly RequisitoClase[] = [{ claseId: "mago", nivelJob: 40 }];

const DEFINICIONES = {
  novato: {
    id: "novato", nombre: "Novato", descripcion: "El punto de partida de todo aventurero.",
    tier: 0, nivelJobMaximo: 10, requisitos: [], armasDominadas: [],
    armadurasDominadas: ["ligera"], bonoAtaqueArmaDominada: 0, bonoDefensaArmaduraDominada: 0,
  },
  espadachin: {
    id: "espadachin", nombre: "Espadachín", descripcion: "Especialista en combate frontal.",
    tier: 1, nivelJobMaximo: 40, requisitos: NOVATO_JOB_10,
    armasDominadas: ["espada", "lanza"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.1,
  },
  acolito: {
    id: "acolito", nombre: "Acólito", descripcion: "Aprendiz de apoyo y artes sagradas.",
    tier: 1, nivelJobMaximo: 40, requisitos: NOVATO_JOB_10,
    armasDominadas: ["maza", "baston"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.1, bonoDefensaArmaduraDominada: 0.1,
  },
  arquero: {
    id: "arquero", nombre: "Arquero", descripcion: "Especialista en precisión y armas a distancia.",
    tier: 1, nivelJobMaximo: 40, requisitos: NOVATO_JOB_10,
    armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.05,
  },
  mago: {
    id: "mago", nombre: "Mago", descripcion: "Aprendiz de las artes arcanas.",
    tier: 1, nivelJobMaximo: 40, requisitos: NOVATO_JOB_10,
    armasDominadas: ["baston", "libro"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.05,
  },
  caballero: {
    id: "caballero", nombre: "Caballero", descripcion: "Evolución defensiva del Espadachín.",
    tier: 2, nivelJobMaximo: 40, requisitos: ESPADACHIN_JOB_40,
    armasDominadas: ["espada", "lanza"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.15,
  },
  duelista: {
    id: "duelista", nombre: "Duelista", descripcion: "Evolución ofensiva y móvil del Espadachín.",
    tier: 2, nivelJobMaximo: 40, requisitos: ESPADACHIN_JOB_40,
    armasDominadas: ["espada", "daga"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.05,
  },
  sacerdote: {
    id: "sacerdote", nombre: "Sacerdote", descripcion: "Especialista en curación y protección.",
    tier: 2, nivelJobMaximo: 40, requisitos: ACOLITO_JOB_40,
    armasDominadas: ["maza", "baston", "libro"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.1, bonoDefensaArmaduraDominada: 0.15,
  },
  monje: {
    id: "monje", nombre: "Monje", descripcion: "Especialista en combate físico y disciplina.",
    tier: 2, nivelJobMaximo: 40, requisitos: ACOLITO_JOB_40,
    armasDominadas: ["puños", "maza"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.1,
  },
  cazador: {
    id: "cazador", nombre: "Cazador", descripcion: "Evolución técnica del Arquero.",
    tier: 2, nivelJobMaximo: 40, requisitos: ARQUERO_JOB_40,
    armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera", "media"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.05,
  },
  explorador: {
    id: "explorador", nombre: "Explorador", descripcion: "Evolución móvil del Arquero.",
    tier: 2, nivelJobMaximo: 40, requisitos: ARQUERO_JOB_40,
    armasDominadas: ["arco", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.15, bonoDefensaArmaduraDominada: 0.05,
  },
  elementalista: {
    id: "elementalista", nombre: "Elementalista", descripcion: "Especialista en magia elemental.",
    tier: 2, nivelJobMaximo: 40, requisitos: MAGO_JOB_40,
    armasDominadas: ["baston", "libro"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.05,
  },
  brujo: {
    id: "brujo", nombre: "Brujo", descripcion: "Especialista en magia oscura y debilitaciones.",
    tier: 2, nivelJobMaximo: 40, requisitos: MAGO_JOB_40,
    armasDominadas: ["baston", "libro", "daga"], armadurasDominadas: ["ligera"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0,
  },
  cruzado: {
    id: "cruzado", nombre: "Cruzado", descripcion: "Híbrida de defensa y apoyo que combina las ramas de Caballero y Sacerdote.",
    tier: 3, nivelJobMaximo: 50,
    requisitos: [
      { claseId: "caballero", nivelJob: 40 },
      { claseId: "sacerdote", nivelJob: 40 },
    ],
    armasDominadas: ["espada", "maza", "lanza"], armadurasDominadas: ["media", "pesada"],
    bonoAtaqueArmaDominada: 0.2, bonoDefensaArmaduraDominada: 0.2,
  },
} as const satisfies Record<string, DefinicionClase>;

export const CLASES: Readonly<Record<string, DefinicionClase>> = DEFINICIONES;
export type IdClase = keyof typeof DEFINICIONES;

export interface ProgresoClaseRequisito {
  claseId: string;
  nivelJob: number;
  desbloqueada: boolean;
}

export interface RequisitoClasePendiente {
  claseId: string;
  nombreClase: string;
  nivelJobRequerido: number;
  nivelJobActual: number;
  desbloqueada: boolean;
}

export interface ResultadoDesbloqueoClase {
  claseExiste: boolean;
  yaDesbloqueada: boolean;
  puedeDesbloquear: boolean;
  requisitosPendientes: RequisitoClasePendiente[];
}

export function obtenerDefinicionClase(claseId: string): DefinicionClase | undefined {
  return CLASES[claseId];
}

/** Resuelve todos los padres; una clase híbrida hereda de ambas ramas. */
export function obtenerAncestrosClase(claseId: string): string[] {
  if (!obtenerDefinicionClase(claseId)) return [];
  const resultado: string[] = [];
  const visitados = new Set<string>();
  const ruta = new Set<string>();

  const visitar = (id: string) => {
    if (ruta.has(id)) throw new Error(`Ciclo detectado en el grafo de clases: ${id}`);
    const clase = obtenerDefinicionClase(id);
    if (!clase) throw new Error(`La clase requisito "${id}" no existe.`);
    ruta.add(id);
    for (const requisito of clase.requisitos) {
      if (ruta.has(requisito.claseId)) throw new Error(`Ciclo detectado en el grafo de clases: ${requisito.claseId}`);
      if (visitados.has(requisito.claseId)) continue;
      visitados.add(requisito.claseId);
      resultado.push(requisito.claseId);
      visitar(requisito.claseId);
    }
    ruta.delete(id);
  };
  visitar(claseId);
  return resultado;
}

export function obtenerClasesHabilidadDisponibles(claseActualId: string): string[] {
  if (!obtenerDefinicionClase(claseActualId)) return [];
  return [claseActualId, ...obtenerAncestrosClase(claseActualId)];
}

export function puedeUsarHabilidadDeClase(claseActualId: string, clasePropietariaId?: string | null): boolean {
  if (!clasePropietariaId) return true;
  return obtenerClasesHabilidadDisponibles(claseActualId).includes(clasePropietariaId);
}

export function evaluarDesbloqueoClase(
  claseObjetivoId: string,
  progresos: readonly ProgresoClaseRequisito[]
): ResultadoDesbloqueoClase {
  const clase = obtenerDefinicionClase(claseObjetivoId);
  if (!clase) return { claseExiste: false, yaDesbloqueada: false, puedeDesbloquear: false, requisitosPendientes: [] };

  if (progresos.some((progreso) => progreso.claseId === claseObjetivoId && progreso.desbloqueada)) {
    return { claseExiste: true, yaDesbloqueada: true, puedeDesbloquear: false, requisitosPendientes: [] };
  }

  const porClase = new Map(progresos.map((progreso) => [progreso.claseId, progreso]));
  const requisitosPendientes = clase.requisitos.flatMap((requisito) => {
    const progreso = porClase.get(requisito.claseId);
    if (progreso?.desbloqueada && progreso.nivelJob >= requisito.nivelJob) return [];
    return [{
      claseId: requisito.claseId,
      nombreClase: CLASES[requisito.claseId]?.nombre ?? requisito.claseId,
      nivelJobRequerido: requisito.nivelJob,
      nivelJobActual: progreso?.nivelJob ?? 0,
      desbloqueada: progreso?.desbloqueada ?? false,
    }];
  });

  return {
    claseExiste: true,
    yaDesbloqueada: false,
    puedeDesbloquear: requisitosPendientes.length === 0,
    requisitosPendientes,
  };
}

export function calcularBonificacionesDominioEquipo(
  claseId: string,
  tipoArma?: TipoArma | string | null,
  categoriaArmadura?: TipoArmadura | string | null
): { multiplicadorAtaqueArma: number; multiplicadorDefensaArmadura: number } {
  const clase = obtenerDefinicionClase(claseId);
  if (!clase) return { multiplicadorAtaqueArma: 1, multiplicadorDefensaArmadura: 1 };
  const dominaArma = !!tipoArma && clase.armasDominadas.includes(tipoArma as TipoArma);
  const dominaArmadura = !!categoriaArmadura && clase.armadurasDominadas.includes(categoriaArmadura as TipoArmadura);
  return {
    multiplicadorAtaqueArma: dominaArma ? 1 + clase.bonoAtaqueArmaDominada : 1,
    multiplicadorDefensaArmadura: dominaArmadura ? 1 + clase.bonoDefensaArmaduraDominada : 1,
  };
}
