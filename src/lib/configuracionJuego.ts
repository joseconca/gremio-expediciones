import type { Rareza, ClasePersonaje, IdEdificio } from "./tiposJuego";
import { CONFIGURACION_EDIFICIOS } from "./tiposJuego";

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

export function calcularCosteEdificio(
  idEdificio: IdEdificio,
  nivelActual: number
): CosteEdificio {
  const configuracion = CONFIGURACION_EDIFICIOS[idEdificio];

  const multiplicadorOro = nivelActual === 0 ? 1 : Math.pow(1.5, nivelActual);
  const multiplicadorRecursos = nivelActual === 0 ? 1 : 1.5 * nivelActual;

  return {
    oro:
      Math.round((configuracion.costeConstruccion * multiplicadorOro) / 100) *
      100,

    madera: Math.ceil(configuracion.costeMadera * multiplicadorRecursos),

    piedra: Math.ceil(configuracion.costePiedra * multiplicadorRecursos),

    metal: Math.ceil(configuracion.costeMetal * multiplicadorRecursos),
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
    case "Guerrero":
      return {
        hpMaximo: 90 + nivelesExtra * 12,
        ataque: 7 + nivelesExtra * 1.4,
        defensa: 8 + nivelesExtra * 1.3,
        velocidad: 5 + nivelesExtra * 0.5,
        capacidadCarruaje: 10 + nivelesExtra,
        probCritico: 0.05,
        danoCritico: 1.5,
      };

    case "Explorador":
      return {
        hpMaximo: 75 + nivelesExtra * 9,
        ataque: 6.5 + nivelesExtra * 1.25,
        defensa: 4 + nivelesExtra * 0.9,
        velocidad: 9 + nivelesExtra,
        capacidadCarruaje: 10 + nivelesExtra,
        probCritico: 0.05,
        danoCritico: 1.5,
      };

    case "Comerciante":
      return {
        hpMaximo: 80 + nivelesExtra * 10,
        ataque: 6 + nivelesExtra * 1.05,
        defensa: 5 + nivelesExtra,
        velocidad: 7 + nivelesExtra * 0.7,
        capacidadCarruaje: 14 + nivelesExtra * 1.5,
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
const SPRITE_POR_CLASE: Record<string, string> = {
  Guerrero: "warrior",
  Explorador: "explorer",
  Comerciante: "merchant",
};

export type SexoPersonaje = "chico" | "chica";

// Devuelve la ruta del sprite del héroe según su clase y sexo, p.ej. "/sprites/heroes/warrior-f.png".
export function obtenerSpriteHeroe(
  clase?: string | null,
  sexo?: string | null
): string {
  const base = SPRITE_POR_CLASE[clase ?? ""] ?? "warrior";
  const sufijoSexo = sexo === "chica" ? "f" : "m";
  return `/sprites/heroes/${base}-${sufijoSexo}.png`;
}

// ============================================================
// PROGRESIÓN
// ============================================================
export function experienciaParaNivel(nivel: number): number {
  return nivel * nivel * 100;
}

// ============================================================
// HABILIDADES
// ============================================================

export const NIVEL_ESCUELA_POR_RAREZA: Record<Rareza, number> = {
  basico: 1,
  comun: 2,
  poco_comun: 2,
  raro: 3,
  epico: 3,
  legendario: Infinity,
};

export function puedeAprenderHabilidad(
  rareza: Rareza,
  nivelEscuela: number
): boolean {
  return nivelEscuela >= NIVEL_ESCUELA_POR_RAREZA[rareza];
}
