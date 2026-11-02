import type { PresentacionVisualCombate } from "@/lib/tiposJuego";
import { normalizarSubtipoArma } from "./ataque-basico-arma";

/** Presentación visual del ataque básico; no decide el daño ni la defensa empleada. */
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
