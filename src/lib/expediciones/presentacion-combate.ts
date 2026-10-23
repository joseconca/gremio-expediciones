import type { PresentacionVisualCombate } from "@/lib/tiposJuego";

/**
 * Devuelve la presentación visual de un ataque básico según el arma equipada.
 * No participa en la resolución numérica del ataque.
 */
function normalizarSubtipoArma(subtipoArma: string | null | undefined): string {
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

/**
 * Devuelve la presentación visual de un ataque básico según el arma equipada.
 * No participa en la resolución numérica del ataque.
 */
export function obtenerPresentacionAtaqueBasico(
  subtipoArma: string | null | undefined,
): PresentacionVisualCombate | undefined {
  const subtipo = normalizarSubtipoArma(subtipoArma);
  if (subtipo === "arco") {
    return {
      modo: "proyectil",
      proyectil: "flecha",
      elemento: "fisico",
      impacto: "golpe",
    };
  }
  if (subtipo === "baston" || subtipo === "libro") {
    return {
      modo: "proyectil",
      proyectil: "esfera_arcana",
      elemento: "arcano",
      impacto: "destello",
    };
  }
  return undefined;
}
