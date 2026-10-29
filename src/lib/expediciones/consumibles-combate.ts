import type { DefinicionObjeto } from "../tiposJuego";

type Consumible = Pick<DefinicionObjeto, "curacion" | "curacionPorcentaje" | "restauracionEnergia" | "restauracionMana" | "restauracionManaPorcentaje" | "restauracionEnergiaPorcentaje">;

export function esConsumibleRestaurador(objeto: Consumible & { tipo: string }): boolean {
  return objeto.tipo === "consumible" && [objeto.curacion, objeto.curacionPorcentaje, objeto.restauracionEnergia, objeto.restauracionMana, objeto.restauracionManaPorcentaje, objeto.restauracionEnergiaPorcentaje].some((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
}

/** Los porcentajes se calculan sobre el máximo del destinatario, nunca del lanzador. */
export function calcularRestauracionConsumible(objeto: Consumible, recursos: {
  hp: number; hpMaximo: number; energia: number; energiaMaxima: number; mana: number; manaMaximo: number;
}) {
  const positivo = (n: number | undefined) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0;
  const restaurar = (fijo: number | undefined, porcentaje: number | undefined, actual: number, maximo: number) =>
    Math.max(0, Math.min(Math.max(0, maximo - actual), Math.floor(positivo(fijo) + maximo * positivo(porcentaje))));
  return {
    curacion: restaurar(objeto.curacion, objeto.curacionPorcentaje, recursos.hp, recursos.hpMaximo),
    energia: restaurar(objeto.restauracionEnergia, objeto.restauracionEnergiaPorcentaje, recursos.energia, recursos.energiaMaxima),
    mana: restaurar(objeto.restauracionMana, objeto.restauracionManaPorcentaje, recursos.mana, recursos.manaMaximo),
  };
}
