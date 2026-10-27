import type { Rareza, ClasePersonaje, IdEdificio } from "./tiposJuego";
import { CONFIGURACION_EDIFICIOS } from "./tiposJuego";
import { CLASES, obtenerAncestrosClase } from "./progresion/clases";
import { CLASES_NUEVAS } from "./progresion/clases-nuevas";
import { esClaseHeroeHd } from "./sprites-heroes-hd";

export const REQUISITOS_EDIFICIOS: Partial<
  Record<IdEdificio, { edificio: IdEdificio; nivel: number }>
> = {
  herreria: {
    edificio: "armeria",
    nivel: 1,
  },
};

export interface CosteEdificio {
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
}

export function calcularCosteEdificio(idEdificio: IdEdificio, nivelActual: number): CosteEdificio {
  const configuracion = CONFIGURACION_EDIFICIOS[idEdificio];
  const nivel = Number.isFinite(nivelActual) ? Math.max(0, Math.floor(nivelActual)) : 0;
  const multiplicador = Math.pow(1.5, nivel);
  return {
    oro: Math.ceil(configuracion.costeConstruccion * multiplicador),
    madera: idEdificio === "muralla" && nivel > 0 ? 0 : Math.ceil(configuracion.costeMadera * multiplicador),
    piedra: idEdificio === "muralla" && nivel > 0 ? Math.ceil(10 * multiplicador) : Math.ceil(configuracion.costePiedra * multiplicador),
    metal: Math.ceil(configuracion.costeMetal * multiplicador),
  };
}

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

export type CampoMejora = "velocidadMejoras" | "capacidadCarruajeMejoras";

export const CONFIGURACION_ATRIBUTOS = {
  velocidad: {
    campo: "velocidadMejoras" as CampoMejora,
    costeBase: 100,
    edificio: "mercado",
    limitePorNivel: 5,
  },
  capacidadCarruaje: {
    campo: "capacidadCarruajeMejoras" as CampoMejora,
    costeBase: 200,
    edificio: "mercado",
    limitePorNivel: 5,
  },
} as const;

export type IdAtributo = keyof typeof CONFIGURACION_ATRIBUTOS;

export function calcularCosteAtributo(
  atributo: IdAtributo,
  valorActual: number
): number {
  const configuracion = CONFIGURACION_ATRIBUTOS[atributo];
  const siguienteNivel = valorActual + 1;

  return configuracion.costeBase * siguienteNivel * siguienteNivel;
}

// ============================================================
// HEROES
// ============================================================
const CLASES_LEGACY_POR_NOMBRE: Record<string, string> = {
  Novato: "novato",
  Guerrero: "guerrero",
  Explorador: "explorador",
  Comerciante: "comerciante",
};

export type SexoPersonaje = "chico" | "chica";

/**
 * Resuelve el directorio visual sin modificar la clase almacenada en el personaje.
 * La profesión activa prevalece; las etiquetas antiguas siguen teniendo fallback.
 */
export function obtenerIdClaseParaSprite(
  clase?: string | null,
  profesionActivaId?: string | null,
): string {
  const claseLegacy = clase ? CLASES_LEGACY_POR_NOMBRE[clase] : undefined;
  // Los personajes antiguos conservan su avatar original mientras sigan en Novato.
  if (claseLegacy && (!profesionActivaId || profesionActivaId === "novato")) {
    return claseLegacy;
  }
  if (profesionActivaId && Object.prototype.hasOwnProperty.call(CLASES, profesionActivaId)) {
    return profesionActivaId;
  }
  if (clase && Object.prototype.hasOwnProperty.call(CLASES, clase)) {
    return clase;
  }
  if (claseLegacy) {
    return claseLegacy;
  }
  return "novato";
}

export function obtenerNombreClaseHeroe(
  clase?: string | null,
  profesionActivaId?: string | null,
): string {
  const idClase = obtenerIdClaseParaSprite(clase, profesionActivaId);
  return CLASES[idClase]?.nombre ?? (idClase === "guerrero" ? "Guerrero" : "Comerciante");
}

/** Las clases sin arte propio usan un antecesor existente hasta incorporar sus sprites. */
export function obtenerIdVisualClase(id: string): string {
  if (!CLASES_NUEVAS[id] || id === "comerciante") return id;
  return obtenerAncestrosClase(id).find((padre) => !CLASES_NUEVAS[padre]) ?? "novato";
}

/** Devuelve el sprite masculino/femenino de la profesión activa del personaje. */
export function obtenerSpriteHeroe(
  clase?: string | null,
  sexo?: string | null,
  profesionActivaId?: string | null,
): string {
  const idClase = obtenerIdVisualClase(obtenerIdClaseParaSprite(clase, profesionActivaId));
  const sufijoSexo = sexo === "chica" ? "f" : "m";
  if (esClaseHeroeHd(idClase)) return `/sprites/hd-v1/heroes/${idClase}/${sufijoSexo}-portrait.png`;
  return `/sprites/heroes/${idClase}/${idClase}-${sufijoSexo}.png`;
}

/**
 * Contrato de filas de los spritesheets de combate.
 * Cada fila contiene cuatro fotogramas: HD 128 × 256; fallback 64 × 128 px.
 */
export const FILAS_ANIMACION_SPRITESHEET_HEROE = [
  { id: "idle", nombre: "Idle", fila: 0 },
  { id: "walk", nombre: "Caminar", fila: 1 },
  { id: "hurt", nombre: "Recibir daño", fila: 2 },
  { id: "use_consumable", nombre: "Usar consumible", fila: 3 },
  { id: "dodge", nombre: "Esquivar", fila: 4 },
  { id: "block_shield", nombre: "Bloquear con escudo", fila: 5 },
  { id: "attack_sword", nombre: "Ataque con espada", fila: 6 },
  { id: "attack_axe", nombre: "Ataque con hacha", fila: 7 },
  { id: "attack_spear", nombre: "Ataque con lanza", fila: 8 },
  { id: "attack_dagger", nombre: "Ataque con daga", fila: 9 },
  { id: "attack_bow", nombre: "Ataque con arco", fila: 10 },
  { id: "attack_staff", nombre: "Ataque con bastón", fila: 11 },
  { id: "attack_mace", nombre: "Ataque con maza", fila: 12 },
  { id: "attack_book", nombre: "Ataque con libro", fila: 13 },
  { id: "attack_gloves", nombre: "Ataque con guantes", fila: 14 },
] as const;

/** Ruta a la hoja animada; los retratos estáticos siguen usando obtenerSpriteHeroe. */
export function obtenerRutaSpritesheetHeroe(
  clase?: string | null,
  sexo?: string | null,
  profesionActivaId?: string | null,
): string {
  const idClase = obtenerIdVisualClase(obtenerIdClaseParaSprite(clase, profesionActivaId));
  const sufijoSexo = sexo === "chica" ? "f" : "m";
  if (esClaseHeroeHd(idClase)) return `/sprites/hd-v1/heroes/${idClase}/${sufijoSexo}-sheet.png`;
  return `/sprites/heroes/${idClase}/${idClase}-${sufijoSexo}-sheet.png`;
}

/** Logo reutilizable de clase para miniaturas, nombres de grupo y listados. */
export function obtenerLogoClaseHeroe(
  clase?: string | null,
  profesionActivaId?: string | null,
): string {
  const idClase = obtenerIdVisualClase(obtenerIdClaseParaSprite(clase, profesionActivaId));
  return `/sprites/heroes/${idClase}/${idClase}-logo.svg`;
}

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
