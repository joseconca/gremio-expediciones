import { OBJETOS } from "./objetos";
import type { DefinicionObjeto, Rareza } from "./tiposJuego";

export const REQUISITOS_RAREZA: Record<
  Rareza,
  {
    nivelArmeria: number;
    nivelHeroe: number;
  }
> = {
  basico: {
    nivelArmeria: 1,
    nivelHeroe: 1,
  },
  comun: {
    nivelArmeria: 2,
    nivelHeroe: 4,
  },
  poco_comun: {
    nivelArmeria: 3,
    nivelHeroe: 7,
  },
  raro: {
    nivelArmeria: 4,
    nivelHeroe: 10,
  },
  epico: {
    nivelArmeria: 5,
    nivelHeroe: 15,
  },
  legendario: {
    nivelArmeria: Infinity,
    nivelHeroe: Infinity,
  },
};

export function obtenerRequisitosRareza(rareza: Rareza): {
  nivelArmeria: number;
  nivelHeroe: number;
} {
  return REQUISITOS_RAREZA[rareza];
}

export interface ObjetoEnVenta extends DefinicionObjeto {
  puedeComprar: boolean;
  nivelHeroeNecesario: number;
}

/**
 * Devuelve únicamente los objetos que la Armería ya puede mostrar.
 */
export function obtenerObjetosVisiblesEnArmeria(
  nivelArmeria: number
): DefinicionObjeto[] {
  if (nivelArmeria <= 0) {
    return [];
  }

  return OBJETOS.filter((objeto) => {
    if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") {
      return false;
    }

    const requisitos = REQUISITOS_RAREZA[objeto.rareza];

    return nivelArmeria >= requisitos.nivelArmeria;
  });
}

/**
 * Comprueba si un objeto puede comprarse teniendo en cuenta
 * tanto la Armería como el nivel del héroe.
 */
export function puedeComprarObjeto(
  objeto: DefinicionObjeto,
  nivelArmeria: number,
  nivelHeroe: number
): boolean {
  if (objeto.tipo !== "arma" && objeto.tipo !== "armadura") {
    return false;
  }

  const requisitos = REQUISITOS_RAREZA[objeto.rareza];

  return (
    nivelArmeria >= requisitos.nivelArmeria &&
    nivelHeroe >= requisitos.nivelHeroe
  );
}
