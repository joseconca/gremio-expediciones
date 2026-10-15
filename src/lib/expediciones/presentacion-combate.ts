import type { PresentacionVisualCombate } from "@/lib/tiposJuego";

/**
 * Devuelve la presentación visual de un ataque básico según el arma equipada.
 * No participa en la resolución numérica del ataque.
 */
export function obtenerPresentacionAtaqueBasico(
  subtipoArma: string | null | undefined,
): PresentacionVisualCombate | undefined {
  if (subtipoArma?.trim().toLowerCase() !== "arco") return undefined;
  return {
    modo: "proyectil",
    proyectil: "flecha",
    elemento: "fisico",
    impacto: "golpe",
  };
}
