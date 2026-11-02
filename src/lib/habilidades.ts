import type { DefinicionHabilidad } from "./tiposJuego";
import { puedeUsarHabilidadDeClase } from "./progresion/clases";
import { HABILIDADES_NUEVAS } from "./habilidades-nuevas";
import { HABILIDADES_TRONCALES, HABILIDADES_EVOLUCIONES, HABILIDADES_SUPER_NOVATO } from "./catalogos/habilidades";
import { crearCatalogoRedisenado } from "./progresion/catalogo-redisenado";
import { HABILIDADES_ADICIONALES } from "./progresion/tecnicas-adicionales";

/** Habilidades profesionales de Job. Las clases avanzadas heredan las de sus antecesoras. */
/** Unico registro de datos de habilidades, conservando el orden de version anterior. */
export const HABILIDADES_BASE: DefinicionHabilidad[] = [
  ...HABILIDADES_NUEVAS,
  ...HABILIDADES_TRONCALES,
  ...HABILIDADES_EVOLUCIONES,
];

export const HABILIDADES: DefinicionHabilidad[] = [
  ...crearCatalogoRedisenado([...HABILIDADES_BASE,...HABILIDADES_SUPER_NOVATO]),
  ...HABILIDADES_ADICIONALES,
];

export function obtenerHabilidadPorId(id: string): DefinicionHabilidad | undefined {
  return HABILIDADES.find((habilidad) => habilidad.id === id);
}

export function obtenerHabilidadesDisponiblesParaClase(claseActualId: string): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) =>
    puedeUsarHabilidadDeClase(claseActualId, habilidad.claseId)
  );
}

export function obtenerHabilidadesActivas(): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) => habilidad.tipo === "activa");
}

export function obtenerHabilidadesPasivas(): DefinicionHabilidad[] {
  return HABILIDADES.filter((habilidad) => habilidad.tipo === "pasiva");
}
