import type { AtributosPrincipales } from "../tiposJuego";
import { ARQUETIPOS_CLASE, CLASES } from "./clases";

export function calcularAtributosClase(claseId: string, nivelBase: number, nivelJob = 1): AtributosPrincipales {
  const definicion = CLASES[claseId] ?? CLASES.novato;
  const perfil = ARQUETIPOS_CLASE[definicion.arquetipo] ?? ARQUETIPOS_CLASE.novato;
  const base = Number.isFinite(nivelBase) ? Math.max(1, Math.floor(nivelBase)) : 1;
  const job = Number.isFinite(nivelJob) ? Math.min(definicion.nivelJobMaximo, Math.max(1, Math.floor(nivelJob))) : 1;
  const calcular = (atributo: keyof AtributosPrincipales) =>
    1 + Math.floor((base - 1) * perfil.crecimientoBase[atributo] + (job - 1) * perfil.bonusPorNivelJob[atributo]);
  return {
    fuerza: calcular("fuerza"),
    agilidad: calcular("agilidad"),
    vitalidad: calcular("vitalidad"),
    inteligencia: calcular("inteligencia"),
    destreza: calcular("destreza"),
    suerte: calcular("suerte"),
  };
}
