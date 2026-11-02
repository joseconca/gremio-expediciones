import type { DefinicionHabilidad } from "../../tiposJuego";
import { HABILIDADES } from "../../habilidades";
import { CLASES, type DefinicionClase } from "../clases";
import { DISENO_HABILIDADES, type DisenoClase } from "../diseno-habilidades";

/**
 * Vista unica de lectura para una profesion. No copia ni vuelve a definir datos:
 * CLASES, HABILIDADES y DISENO_HABILIDADES mantienen sus fuentes tipadas.
 *
 * Para editar una clase consulta docs/reorganizacion-1.md.
 */
export interface FichaProfesion {
  clase: DefinicionClase;
  habilidades: readonly DefinicionHabilidad[];
  diseno: DisenoClase | null;
}

const habilidadesPorClase = new Map<string, DefinicionHabilidad[]>();
for (const habilidad of HABILIDADES) {
  // La definición genérica permite claseId opcional; las técnicas globales
  // no pertenecen a ninguna ficha profesional.
  if (!habilidad.claseId) continue;
  const lista = habilidadesPorClase.get(habilidad.claseId) ?? [];
  lista.push(habilidad);
  habilidadesPorClase.set(habilidad.claseId, lista);
}

export const FICHAS_PROFESION: Readonly<Record<string, FichaProfesion>> =
  Object.fromEntries(
    Object.entries(CLASES).map(([id, clase]) => [
      id,
      {
        clase,
        habilidades: habilidadesPorClase.get(id) ?? [],
        diseno: DISENO_HABILIDADES[id] ?? null,
      } satisfies FichaProfesion,
    ]),
  );

export function obtenerFichaProfesion(id: string): FichaProfesion | undefined {
  return FICHAS_PROFESION[id];
}
