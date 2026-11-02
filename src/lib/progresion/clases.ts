import type { TipoArmadura, TipoEquipoDominado } from "../tiposJuego";
import { CLASES_BASE } from "./catalogos/clases-base";
import { CLASES_NUEVAS } from "./catalogos/clases-avanzadas";

export interface RequisitoClase {
  claseId: string;
  nivelJob: number;
}

export type ArquetipoClaseId =
  | "novato"
  | "vanguardia"
  | "apoyo"
  | "agil"
  | "arcano"
  | "marcial"
  | "maldito"
  | "hibrido";
export type AtributoPrincipalId =
  | "fuerza"
  | "agilidad"
  | "vitalidad"
  | "inteligencia"
  | "destreza"
  | "suerte";

export interface PerfilArquetipoClase {
  nombre: string;
  crecimientoBase: Readonly<Record<AtributoPrincipalId, number>>;
  bonusPorNivelJob: Readonly<Record<AtributoPrincipalId, number>>;
}

export interface DefinicionClase {
  id: string;
  nombre: string;
  descripcion: string;
  arquetipo: ArquetipoClaseId;
  /** Recurso principal que consume la clase en combate. */
  recursoCombate: "energia" | "mana" | "ambos";
  tier: number;
  nivelJobMaximo: number;
  requisitos: readonly RequisitoClase[];
  armasDominadas: readonly TipoEquipoDominado[];
  armadurasDominadas: readonly TipoArmadura[];
  bonoAtaqueArmaDominada: number;
  bonoDefensaArmaduraDominada: number;
  /** Aumenta proporcionalmente la velocidad de viaje de expediciones. */
  bonusVelocidadExpedicion?: number;
  /** Ventajas económicas de clase, heredadas sin acumular generaciones. */
  bonusBotin?: number;
  bonusOroComercio?: number;
  descubrimiento?: { intercambiosMinimos: number; nivelJobTroncal: number };
}

export const ARQUETIPOS_CLASE = {
  novato: {
    nombre: "Generalista",
    crecimientoBase: {
      fuerza: 0.18,
      agilidad: 0.18,
      vitalidad: 0.18,
      inteligencia: 0.18,
      destreza: 0.18,
      suerte: 0.18,
    },
    bonusPorNivelJob: {
      fuerza: 0.04,
      agilidad: 0.04,
      vitalidad: 0.04,
      inteligencia: 0.04,
      destreza: 0.04,
      suerte: 0.04,
    },
  },
  vanguardia: {
    nombre: "Vanguardia",
    crecimientoBase: {
      fuerza: 0.45,
      agilidad: 0.12,
      vitalidad: 0.4,
      inteligencia: 0.04,
      destreza: 0.16,
      suerte: 0.08,
    },
    bonusPorNivelJob: {
      fuerza: 0.26,
      agilidad: 0.04,
      vitalidad: 0.24,
      inteligencia: 0,
      destreza: 0.06,
      suerte: 0.04,
    },
  },
  apoyo: {
    nombre: "Apoyo",
    crecimientoBase: {
      fuerza: 0.08,
      agilidad: 0.1,
      vitalidad: 0.28,
      inteligencia: 0.4,
      destreza: 0.15,
      suerte: 0.2,
    },
    bonusPorNivelJob: {
      fuerza: 0.04,
      agilidad: 0.04,
      vitalidad: 0.16,
      inteligencia: 0.22,
      destreza: 0.07,
      suerte: 0.1,
    },
  },
  agil: {
    nombre: "Ágil",
    crecimientoBase: {
      fuerza: 0.14,
      agilidad: 0.42,
      vitalidad: 0.12,
      inteligencia: 0.04,
      destreza: 0.4,
      suerte: 0.24,
    },
    bonusPorNivelJob: {
      fuerza: 0.06,
      agilidad: 0.23,
      vitalidad: 0.05,
      inteligencia: 0,
      destreza: 0.24,
      suerte: 0.12,
    },
  },
  arcano: {
    nombre: "Arcano",
    crecimientoBase: {
      fuerza: 0.04,
      agilidad: 0.08,
      vitalidad: 0.16,
      inteligencia: 0.48,
      destreza: 0.2,
      suerte: 0.18,
    },
    bonusPorNivelJob: {
      fuerza: 0,
      agilidad: 0.05,
      vitalidad: 0.08,
      inteligencia: 0.28,
      destreza: 0.1,
      suerte: 0.1,
    },
  },
  marcial: {
    nombre: "Marcial",
    crecimientoBase: {
      fuerza: 0.3,
      agilidad: 0.24,
      vitalidad: 0.25,
      inteligencia: 0.05,
      destreza: 0.2,
      suerte: 0.15,
    },
    bonusPorNivelJob: {
      fuerza: 0.18,
      agilidad: 0.18,
      vitalidad: 0.16,
      inteligencia: 0,
      destreza: 0.14,
      suerte: 0.08,
    },
  },
  maldito: {
    nombre: "Maldiciones",
    crecimientoBase: {
      fuerza: 0.04,
      agilidad: 0.1,
      vitalidad: 0.15,
      inteligencia: 0.42,
      destreza: 0.2,
      suerte: 0.32,
    },
    bonusPorNivelJob: {
      fuerza: 0,
      agilidad: 0.05,
      vitalidad: 0.05,
      inteligencia: 0.22,
      destreza: 0.06,
      suerte: 0.18,
    },
  },
  hibrido: {
    nombre: "Híbrido",
    crecimientoBase: {
      fuerza: 0.28,
      agilidad: 0.1,
      vitalidad: 0.38,
      inteligencia: 0.18,
      destreza: 0.12,
      suerte: 0.15,
    },
    bonusPorNivelJob: {
      fuerza: 0.14,
      agilidad: 0.05,
      vitalidad: 0.22,
      inteligencia: 0.1,
      destreza: 0.05,
      suerte: 0.08,
    },
  },
} as const satisfies Record<ArquetipoClaseId, PerfilArquetipoClase>;

const catalogo: Record<string, DefinicionClase> = { ...CLASES_BASE, ...CLASES_NUEVAS };
const resueltas: Record<string, DefinicionClase> = {};
function resolverDominios(id: string, ruta = new Set<string>()): DefinicionClase {
  if (ruta.has(id)) throw new Error(`Ciclo detectado en el grafo de clases: ${id}`);
  if (resueltas[id]) return resueltas[id];
  const clase = catalogo[id];
  if (!clase) throw new Error(`La clase requisito "${id}" no existe.`);
  ruta.add(id);
  const padres = clase.requisitos.map((r) => resolverDominios(r.claseId, ruta));
  ruta.delete(id);
  return resueltas[id] = {
    ...clase,
    armasDominadas: [...new Set([...clase.armasDominadas, ...padres.flatMap((p) => p.armasDominadas)])],
    bonusBotin: Math.max(clase.bonusBotin ?? 0, ...padres.map((p) => p.bonusBotin ?? 0)),
    bonusOroComercio: Math.max(clase.bonusOroComercio ?? 0, ...padres.map((p) => p.bonusOroComercio ?? 0)),
  };
}
export const CLASES: Readonly<Record<string, DefinicionClase>> = Object.fromEntries(
  Object.keys(catalogo).map((id) => [id, resolverDominios(id)])
);
export type IdClase = keyof typeof CLASES;

export interface ContextoDesbloqueoClase {
  intercambiosComerciales?: number;
}

function cumpleDescubrimiento(clase: DefinicionClase, progresos: readonly ProgresoClaseRequisito[], contexto: ContextoDesbloqueoClase): boolean {
  if (!clase.descubrimiento) return true;
  return (contexto.intercambiosComerciales ?? 0) >= clase.descubrimiento.intercambiosMinimos &&
    progresos.some((p) => ["espadachin", "acolito", "arquero", "mago"].includes(p.claseId) &&
      p.desbloqueada && p.nivelJob >= clase.descubrimiento!.nivelJobTroncal);
}

/** Oculta también las ramas descendientes hasta descubrir su profesión secreta. */
export function esClaseDescubierta(claseId: string, progresos: readonly ProgresoClaseRequisito[], contexto: ContextoDesbloqueoClase = {}): boolean {
  if (!CLASES[claseId]) return false;
  return [claseId, ...obtenerAncestrosClase(claseId)].every((id) =>
    progresos.some((p) => p.claseId === id && p.desbloqueada) || cumpleDescubrimiento(CLASES[id], progresos, contexto));
}

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

export function obtenerDefinicionClase(
  claseId: string
): DefinicionClase | undefined {
  return CLASES[claseId];
}

/** Resuelve todos los padres; una clase híbrida hereda de ambas ramas. */
export function obtenerAncestrosClase(claseId: string): string[] {
  if (!obtenerDefinicionClase(claseId)) return [];
  const resultado: string[] = [];
  const visitados = new Set<string>();
  const ruta = new Set<string>();

  const visitar = (id: string) => {
    if (ruta.has(id))
      throw new Error(`Ciclo detectado en el grafo de clases: ${id}`);
    const clase = obtenerDefinicionClase(id);
    if (!clase) throw new Error(`La clase requisito "${id}" no existe.`);
    ruta.add(id);
    for (const requisito of clase.requisitos) {
      if (ruta.has(requisito.claseId))
        throw new Error(
          `Ciclo detectado en el grafo de clases: ${requisito.claseId}`
        );
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

export function obtenerClasesHabilidadDisponibles(
  claseActualId: string
): string[] {
  if (!obtenerDefinicionClase(claseActualId)) return [];
  return [claseActualId, ...obtenerAncestrosClase(claseActualId)];
}

export function puedeUsarHabilidadDeClase(
  claseActualId: string,
  clasePropietariaId?: string | null
): boolean {
  if (!clasePropietariaId) return true;
  return obtenerClasesHabilidadDisponibles(claseActualId).includes(
    clasePropietariaId
  );
}

export function evaluarDesbloqueoClase(
  claseObjetivoId: string,
  progresos: readonly ProgresoClaseRequisito[],
  contexto: ContextoDesbloqueoClase = {}
): ResultadoDesbloqueoClase {
  const clase = obtenerDefinicionClase(claseObjetivoId);
  if (!clase)
    return {
      claseExiste: false,
      yaDesbloqueada: false,
      puedeDesbloquear: false,
      requisitosPendientes: [],
    };

  if (
    progresos.some(
      (progreso) =>
        progreso.claseId === claseObjetivoId && progreso.desbloqueada
    )
  ) {
    return {
      claseExiste: true,
      yaDesbloqueada: true,
      puedeDesbloquear: false,
      requisitosPendientes: [],
    };
  }

  const porClase = new Map(
    progresos.map((progreso) => [progreso.claseId, progreso])
  );
  const requisitosPendientes = clase.requisitos.flatMap((requisito) => {
    const progreso = porClase.get(requisito.claseId);
    if (progreso?.desbloqueada && progreso.nivelJob >= requisito.nivelJob)
      return [];
    return [
      {
        claseId: requisito.claseId,
        nombreClase: CLASES[requisito.claseId]?.nombre ?? requisito.claseId,
        nivelJobRequerido: requisito.nivelJob,
        nivelJobActual: progreso?.nivelJob ?? 0,
        desbloqueada: progreso?.desbloqueada ?? false,
      },
    ];
  });

  return {
    claseExiste: true,
    yaDesbloqueada: false,
    puedeDesbloquear: requisitosPendientes.length === 0 && cumpleDescubrimiento(clase, progresos, contexto),
    requisitosPendientes,
  };
}

export type EstadoVisibilidadClase =
  | "desbloqueada"
  | "disponible"
  | "misterio"
  | "oculta";

/**
 * Identifica si una clase es especial/secreta (tiers intermedios como 1.5, 2.5, 3.5 o descubrimiento).
 * Estas clases no dan pistas ni interrogantes '?' hasta cumplir todos sus requisitos.
 */
export function esClaseEspecial(clase: DefinicionClase): boolean {
  return clase.tier % 1 !== 0 || clase.descubrimiento !== undefined;
}

/**
 * Determina el estado de visibilidad de una clase en el árbol/grafo de profesiones:
 * - "desbloqueada": ya adquirida por el aventurero.
 * - "disponible": lista para ser desbloqueada de inmediato.
 * - "misterio": clase normal cuyos padres ya están desbloqueados pero falta subirles nivel de Job ('?').
 * - "oculta": especial que aún no cumple requisitos, o clase lejana cuyos padres no han sido desbloqueados.
 */
export function obtenerEstadoVisibilidadClase(
  claseId: string,
  progresos: readonly ProgresoClaseRequisito[],
  contexto: ContextoDesbloqueoClase = {}
): EstadoVisibilidadClase {
  const clase = obtenerDefinicionClase(claseId);
  if (!clase) return "oculta";

  // 1. Ya desbloqueada
  if (progresos.some((p) => p.claseId === claseId && p.desbloqueada)) {
    return "desbloqueada";
  }

  // 2. Comprobar si cumple todos los requisitos para desbloquearse ahora
  const desbloqueo = evaluarDesbloqueoClase(claseId, progresos, contexto);
  if (desbloqueo.puedeDesbloquear) {
    return "disponible";
  }

  // 3. Clases especiales (tiers 1.5, 2.5, 3.5 o con descubrimiento secreto):
  // No se ven con pistas ni '?' hasta que cumplen todos los requisitos.
  if (esClaseEspecial(clase) || !esClaseDescubierta(claseId, progresos, contexto)) {
    return "oculta";
  }

  // 4. Clases estándar (tier 1, 2, 3...):
  // Si el aventurero ya tiene desbloqueadas TODAS las clases base/requisito,
  // se muestra con interrogante '?' y sus requisitos de subir nivel de Job visibles.
  if (
    clase.requisitos.length > 0 &&
    clase.requisitos.every((req) =>
      progresos.some((p) => p.claseId === req.claseId && p.desbloqueada)
    )
  ) {
    return "misterio";
  }

  return "oculta";
}

/** Incluye la clase activa, las ya desbloqueadas y las que pueden desbloquearse. */
export function obtenerClasesVisibles(
  claseActivaId: string,
  progresos: readonly ProgresoClaseRequisito[],
  contexto: ContextoDesbloqueoClase = {}
): DefinicionClase[] {
  return Object.values(CLASES).filter((clase) => {
    if (clase.id === claseActivaId) return true;
    const estado = evaluarDesbloqueoClase(clase.id, progresos, contexto);
    return estado.yaDesbloqueada || estado.puedeDesbloquear;
  });
}

export function calcularBonificacionesDominioEquipo(
  claseId: string,
  tipoArma?: string | null,
  categoriaArmadura?: TipoArmadura | string | null
): { multiplicadorAtaqueArma: number; multiplicadorDefensaArmadura: number } {
  const clase = obtenerDefinicionClase(claseId);
  if (!clase)
    return { multiplicadorAtaqueArma: 1, multiplicadorDefensaArmadura: 1 };
  const dominaArma =
    !!tipoArma && clase.armasDominadas.includes(tipoArma as TipoEquipoDominado);
  const dominaArmadura =
    !!categoriaArmadura &&
    clase.armadurasDominadas.includes(categoriaArmadura as TipoArmadura);
  // El dominio listado en la clase conserva su bono. Si la categoría no
  // está dominada, la eficacia del equipo baja al 75 %.
  return {
    multiplicadorAtaqueArma: !tipoArma
      ? 1
      : dominaArma && clase.bonoAtaqueArmaDominada > 0
      ? 1 + clase.bonoAtaqueArmaDominada
      : 0.75,
    multiplicadorDefensaArmadura: !categoriaArmadura
      ? 1
      : dominaArmadura && clase.bonoDefensaArmaduraDominada > 0
      ? 1 + clase.bonoDefensaArmaduraDominada
      : 0.75,
  };
}
