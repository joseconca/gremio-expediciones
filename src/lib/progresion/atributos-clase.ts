import type { AtributosPrincipales } from "../tiposJuego";
import { ARQUETIPOS_CLASE, CLASES } from "./clases";

export interface ProgresoEntrenamiento {
  claseId: string;
  nivelJob: number;
  desbloqueada?: boolean;
}

/** Cada recorrido cuenta una vez; los híbridos conservan el mayor, sin sumar ramas. */
export function calcularEntrenamientoRama(claseId: string, nivelJob = 1, progresos: readonly ProgresoEntrenamiento[] = []): number {
  const porClase = new Map(progresos.filter((p) => p.desbloqueada !== false).map((p) => [p.claseId, p.nivelJob]));
  const visitar = (id: string, minimo = 1): number => {
    const clase = CLASES[id];
    if (!clase) return 0;
    const solicitado = id === claseId ? nivelJob : porClase.get(id) ?? minimo;
    const job = Number.isFinite(solicitado) ? Math.min(clase.nivelJobMaximo, Math.max(minimo, Math.floor(solicitado))) : minimo;
    return job - 1 + Math.max(0, ...clase.requisitos.map((r) => visitar(r.claseId, r.nivelJob)));
  };
  return visitar(claseId);
}

export function calcularAtributosClase(claseId: string, nivelBase: number, nivelJob = 1, progresos: readonly ProgresoEntrenamiento[] = []): AtributosPrincipales {
  const definicion = CLASES[claseId] ?? CLASES.novato;
  const perfil = ARQUETIPOS_CLASE[definicion.arquetipo] ?? ARQUETIPOS_CLASE.novato;
  const base = Number.isFinite(nivelBase) ? Math.max(1, Math.floor(nivelBase)) : 1;
  const entrenamiento = calcularEntrenamientoRama(definicion.id, nivelJob, progresos);
  const calcular = (atributo: keyof AtributosPrincipales) =>
    1 + Math.floor((base - 1) * perfil.crecimientoBase[atributo] + entrenamiento * perfil.bonusPorNivelJob[atributo]);
  return {
    fuerza: calcular("fuerza"),
    agilidad: calcular("agilidad"),
    vitalidad: calcular("vitalidad"),
    inteligencia: calcular("inteligencia"),
    destreza: calcular("destreza"),
    suerte: calcular("suerte"),
  };
}
