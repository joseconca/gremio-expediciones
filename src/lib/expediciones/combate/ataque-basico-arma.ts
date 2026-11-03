/** Subtipos canónicos para las reglas del ataque básico (independientes de la animación). */
export function normalizarSubtipoArma(subtipoArma: string | null | undefined): string {
  return (subtipoArma ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Bastón y libro permiten comparar ataque físico y mágico en el ataque básico. */
export function usaAtaqueMagicoBasico(subtipoArma: string | null | undefined): boolean {
  return ["baston", "libro"].includes(normalizarSubtipoArma(subtipoArma));
}
