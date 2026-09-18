import { OBJETOS } from "./objetos";
import type { DefinicionObjeto, Rareza } from "./tiposJuego";

const NIVEL_ARMERIA_POR_RAREZA: Record<Rareza, number> = {
  basico: 1,
  comun: 1,
  poco_comun: 1,
  raro: 2,
  epico: 3,
  legendario: Infinity,
};

export function obtenerObjetosEnVenta(nivelArmeria: number): DefinicionObjeto[] {
   if (nivelArmeria <= 0) {
    return [];
  }

  return OBJETOS.filter((objeto) => {
    if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") {
      return false;
    }

    const nivelNecesario = NIVEL_ARMERIA_POR_RAREZA[objeto.rareza];

    return nivelArmeria >= nivelNecesario;
  });
}
