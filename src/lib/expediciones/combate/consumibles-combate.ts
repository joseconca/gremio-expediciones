import type { DefinicionObjeto } from "../../tiposJuego";

type Consumible = Pick<
  DefinicionObjeto,
  | "curacion"
  | "curacionPorcentaje"
  | "restauracionEnergia"
  | "restauracionMana"
  | "restauracionManaPorcentaje"
  | "restauracionEnergiaPorcentaje"
>;

interface RecursosDestinatario {
  hp: number;
  hpMaximo: number;
  energia: number;
  energiaMaxima: number;
  mana: number;
  manaMaximo: number;
}

const CANTIDADES_RESTAURADORAS: readonly (keyof Consumible)[] = [
  "curacion",
  "curacionPorcentaje",
  "restauracionEnergia",
  "restauracionMana",
  "restauracionManaPorcentaje",
  "restauracionEnergiaPorcentaje",
];

/** Solo los consumibles con una restauración positiva y finita son restauradores. */
export function esConsumibleRestaurador(
  objeto: Consumible & { tipo: string },
): boolean {
  return objeto.tipo === "consumible" &&
    CANTIDADES_RESTAURADORAS.some((campo) => {
      const cantidad = objeto[campo];
      return typeof cantidad === "number" &&
        Number.isFinite(cantidad) &&
        cantidad > 0;
    });
}

function numeroNoNegativo(valor: number | undefined): number {
  return typeof valor === "number" && Number.isFinite(valor)
    ? Math.max(0, valor)
    : 0;
}

/**
 * La parte fija y la porcentual se suman antes de redondear hacia abajo.
 * La vida, energía o maná sobrantes nunca se contabilizan como restaurados.
 */
function cantidadRestaurada(
  fijo: number | undefined,
  porcentaje: number | undefined,
  actual: number,
  maximo: number,
): number {
  const faltante = Math.max(0, maximo - actual);
  const potencial = Math.floor(
    numeroNoNegativo(fijo) + maximo * numeroNoNegativo(porcentaje),
  );
  return Math.max(0, Math.min(faltante, potencial));
}

/** Los porcentajes usan el máximo del destinatario, nunca del lanzador. */
export function calcularRestauracionConsumible(
  objeto: Consumible,
  recursos: RecursosDestinatario,
): { curacion: number; energia: number; mana: number } {
  return {
    curacion: cantidadRestaurada(
      objeto.curacion,
      objeto.curacionPorcentaje,
      recursos.hp,
      recursos.hpMaximo,
    ),
    energia: cantidadRestaurada(
      objeto.restauracionEnergia,
      objeto.restauracionEnergiaPorcentaje,
      recursos.energia,
      recursos.energiaMaxima,
    ),
    mana: cantidadRestaurada(
      objeto.restauracionMana,
      objeto.restauracionManaPorcentaje,
      recursos.mana,
      recursos.manaMaximo,
    ),
  };
}
