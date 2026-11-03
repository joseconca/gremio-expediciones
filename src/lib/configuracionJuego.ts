
/** Fachada pública: se conservan importaciones y contratos históricos. */
export { REQUISITOS_EDIFICIOS, calcularCosteEdificio } from "./base/edificios";
export type { CosteEdificio } from "./base/edificios";

// ============================================================
// CLASES
// ============================================================
export { calcularEstadisticasBase } from "./progresion/estadisticas/estadisticas";
export type { EstadisticasBasePersonaje } from "./progresion/estadisticas/estadisticas";

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
export { experienciaBaseReferenciaParaNivel, experienciaParaNivel } from "./progresion/experiencia";

// ============================================================
// HABILIDADES
// ============================================================

export { NIVEL_ESCUELA_POR_RAREZA, puedeAprenderHabilidad } from "./base/escuela";
