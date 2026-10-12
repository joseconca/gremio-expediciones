import type { DefinicionObjeto, Rareza } from "./tiposJuego";

export type BonificacionesSufijo = Record<string, number>;

export interface DefinicionSufijo {
  id: string;
  nombre: string;
  tier: "poco_comun" | "raro" | "epico" | "legendario";
  bonificaciones: BonificacionesSufijo;
}

export const SUFIJOS_OBJETOS: DefinicionSufijo[] = [
  { id: "veloz", nombre: "veloz", tier: "poco_comun", bonificaciones: { velocidad: 1 } },
  { id: "de_vitalidad", nombre: "de vitalidad", tier: "poco_comun", bonificaciones: { hpMaximo: 6 } },
  { id: "de_precision", nombre: "de precisión", tier: "poco_comun", bonificaciones: { probCritico: 0.015 } },

  { id: "del_guardian", nombre: "del guardián", tier: "raro", bonificaciones: { defensa: 2, defensaMagica: 1 } },
  { id: "de_poder", nombre: "de poder", tier: "raro", bonificaciones: { ataque: 2 } },
  { id: "de_las_runas", nombre: "de las runas", tier: "raro", bonificaciones: { ataqueMagico: 2, manaMaximo: 4 } },

  { id: "del_titan", nombre: "del titán", tier: "epico", bonificaciones: { hpMaximo: 18, defensa: 2 } },
  { id: "de_la_tempestad", nombre: "de la tempestad", tier: "epico", bonificaciones: { velocidad: 2, probCritico: 0.02 } },
  { id: "del_hechicero", nombre: "del hechicero", tier: "epico", bonificaciones: { ataqueMagico: 4, manaMaximo: 8 } },

  { id: "del_dragon", nombre: "del dragón", tier: "legendario", bonificaciones: { ataque: 4, probCritico: 0.04 } },
  { id: "del_coloso", nombre: "del coloso", tier: "legendario", bonificaciones: { hpMaximo: 35, defensa: 4 } },
  { id: "de_la_eternidad", nombre: "de la eternidad", tier: "legendario", bonificaciones: { ataque: 8 } },
];

const NIVEL_RAREZA: Record<Rareza, number> = {
  basico: 0,
  comun: 0,
  poco_comun: 1,
  raro: 2,
  epico: 3,
  legendario: 3,
};

const NIVEL_SUFIJO: Record<DefinicionSufijo["tier"], number> = {
  poco_comun: 1,
  raro: 2,
  epico: 3,
  legendario: 4,
};

export function obtenerSufijoPorId(id: string | null | undefined): DefinicionSufijo | undefined {
  return id ? SUFIJOS_OBJETOS.find((sufijo) => sufijo.id === id) : undefined;
}

export function obtenerNombreObjetoConSufijo(
  nombreBase: string,
  sufijoId: string | null | undefined
): string {
  const sufijo = obtenerSufijoPorId(sufijoId);
  return sufijo ? `${nombreBase} ${sufijo.nombre}` : nombreBase;
}

export function sanitizarBonificacionesObjeto(valor: unknown): BonificacionesSufijo {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).filter(
      ([, numero]) => typeof numero === "number" && Number.isFinite(numero)
    )
  ) as BonificacionesSufijo;
}

/**
 * Los objetos básicos/comunes no llevan sufijo.
 * Los objetos poco comunes, raros y épicos reciben uno acorde a su rareza.
 * Solo un botín de jefe puede generar sufijos legendarios.
 */
export function generarSufijoObjeto(
  objeto: Pick<DefinicionObjeto, "rareza">,
  esJefe = false,
  rng: () => number = Math.random
): { sufijoId: string | null; bonificaciones: BonificacionesSufijo } {
  if (objeto.rareza === "basico" || objeto.rareza === "comun") {
    return { sufijoId: null, bonificaciones: {} };
  }

  const maximo = esJefe ? 4 : Math.min(3, NIVEL_RAREZA[objeto.rareza]);
  const disponibles = SUFIJOS_OBJETOS.filter(
    (sufijo) => NIVEL_SUFIJO[sufijo.tier] === maximo
  );
  if (disponibles.length === 0) return { sufijoId: null, bonificaciones: {} };

  const indice = Math.min(
    disponibles.length - 1,
    Math.floor(Math.max(0, Math.min(0.999999, rng())) * disponibles.length)
  );
  const elegido = disponibles[indice];
  return {
    sufijoId: elegido.id,
    bonificaciones: { ...elegido.bonificaciones },
  };
}

export function nombreSufijoPorId(id: string | null | undefined): string | null {
  return obtenerSufijoPorId(id)?.nombre ?? null;
}
