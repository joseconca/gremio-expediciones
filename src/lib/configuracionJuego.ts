import type { Rareza, ClasePersonaje } from "./tiposJuego";

/** Fachada pública: se conservan importaciones y contratos históricos. */
export { REQUISITOS_EDIFICIOS, calcularCosteEdificio } from "./base/edificios";
export type { CosteEdificio } from "./base/edificios";

// ============================================================
// CLASES
// ============================================================
export interface EstadisticasBasePersonaje {
  hpMaximo: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
  probCritico: number;
  danoCritico: number;
}

export function calcularEstadisticasBase(
  clase: ClasePersonaje,
  nivel: number
): EstadisticasBasePersonaje {
  const nivelSeguro = Math.max(1, nivel);
  const nivelesExtra = nivelSeguro - 1;

  switch (clase) {
    case "Novato":
      return {
        hpMaximo: 65 + nivelesExtra * 5,
        ataque: 5 + nivelesExtra,
        defensa: 3 + nivelesExtra * 0.8,
        velocidad: 5 + nivelesExtra * 0.4,
        capacidadCarruaje: 8 + nivelesExtra,
        probCritico: 0.03,
        danoCritico: 1.5,
      };

    case "Guerrero":
      return {
        hpMaximo: 85 + nivelesExtra * 6,
        ataque: 7 + nivelesExtra * 1.4,
        defensa: 6 + nivelesExtra * 1.3,
        velocidad: 5 + nivelesExtra * 0.5,
        capacidadCarruaje: 10 + nivelesExtra,
        probCritico: 0.05,
        danoCritico: 1.5,
      };

    case "Explorador":
      return {
        hpMaximo: 75 + nivelesExtra * 5,
        ataque: 6.5 + nivelesExtra * 1.2,
        defensa: 4 + nivelesExtra * 0.9,
        velocidad: 9 + nivelesExtra,
        capacidadCarruaje: 10 + nivelesExtra,
        probCritico: 0.05,
        danoCritico: 1.5,
      };

    case "Comerciante":
      return {
        hpMaximo: 80 + nivelesExtra * 5,
        ataque: 6 + nivelesExtra * 1.05,
        defensa: 5 + nivelesExtra,
        velocidad: 7 + nivelesExtra * 0.7,
        capacidadCarruaje: 14 + nivelesExtra * 1.2,
        probCritico: 0.05,
        danoCritico: 1.5,
      };
  }
}

export { CONFIGURACION_ATRIBUTOS, calcularCosteAtributo } from "./base/mejoras";
export type { CampoMejora, IdAtributo } from "./base/mejoras";

// ============================================================
// HEROES
// ============================================================
export {
  FILAS_ANIMACION_SPRITESHEET_HEROE,
  obtenerIdClaseParaSprite,
  obtenerNombreClaseHeroe,
  obtenerIdVisualClase,
  obtenerSpriteHeroe,
  obtenerRutaSpritesheetHeroe,
  obtenerLogoClaseHeroe,
} from "./sprites/heroes";
export type { SexoPersonaje } from "./sprites/heroes";

// ============================================================
// PROGRESIÓN
// ============================================================
/**
 * Umbral de experiencia Base. La curva mantiene la forma polinómica, con un
 * exponente de 1,83 para hacer más costosos los niveles intermedios y altos.
 * XP 1→2 sigue requiriendo 500 puntos; Base 4→5 requiere unos 6.320 puntos.
 */
export function experienciaBaseReferenciaParaNivel(nivel: number): number {
  const nivelSeguro = Number.isFinite(nivel) ? Math.max(1, Math.floor(nivel)) : 1;
  return Math.round(500 * nivelSeguro ** 1.83);
}

export function experienciaParaNivel(nivel: number): number {
  return experienciaBaseReferenciaParaNivel(nivel);
}

// ============================================================
// HABILIDADES
// ============================================================

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
