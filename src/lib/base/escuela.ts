import type { Rareza } from "../tiposJuego";

/** Requisitos de la Escuela de Batalla. Mantiene los niveles por rareza. */
export const NIVEL_ESCUELA_POR_RAREZA: Record<Rareza, number> = {
  basico: 1,
  comun: 1,
  poco_comun: 2,
  raro: 2,
  epico: 3,
  legendario: Infinity,
};

export function puedeAprenderHabilidad(
  rareza: Rareza,
  nivelEscuela: number
): boolean {
  return nivelEscuela >= NIVEL_ESCUELA_POR_RAREZA[rareza];
}
