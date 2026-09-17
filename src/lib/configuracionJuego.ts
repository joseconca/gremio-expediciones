import type { Rareza, ClasePersonaje } from "./tiposJuego";

export const CONFIGURACION_EDIFICIOS = {
  taberna: {
    nombre: "Taberna",
    costeConstruccion: 1400,
    nivelMax: 2,
    descripcion: "Descansa y recupera la salud del aventurero.",
    color: "bg-amber-700",
    ruta: "/base/taberna",
  },
  herreria: {
    nombre: "Herrería",
    costeConstruccion: 1200,
    nivelMax: 5,
    descripcion: "Mejora armas y armaduras.",
    color: "bg-slate-600",
    ruta: "/base/herreria",
  },
  mercado: {
    nombre: "Mercado",
    costeConstruccion: 1400,
    nivelMax: 3,
    descripcion: "Mejora la velocidad y la capacidad de carga.",
    color: "bg-emerald-700",
    ruta: "/base/mercado",
  },
  embajada: {
    nombre: "Embajada",
    costeConstruccion: 1000,
    nivelMax: 2,
    descripcion: "Conecta tu campamento con otros repartidos en el mundo.",
    color: "bg-blue-700",
    ruta: "/base/embajada",
  },
  escuelaCombate: {
    nombre: "Escuela de Combate",
    costeConstruccion: 1600,
    nivelMax: 5,
    descripcion: "Aprende técnicas de combate avanzadas.",
    color: "bg-red-600",
    ruta: "/base/escuela-batalla",
  },
} as const;

export type IdEdificio = keyof typeof CONFIGURACION_EDIFICIOS;

export function calcularCosteEdificio(
  idEdificio: IdEdificio,
  nivelActual: number
): number {
  const configuracion = CONFIGURACION_EDIFICIOS[idEdificio];

  if (nivelActual === 0) {
    return configuracion.costeConstruccion;
  }

  return (
    Math.round(
      (configuracion.costeConstruccion * Math.pow(2, nivelActual)) / 100
    ) * 100
  );
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
  poco_comun: 3,
  raro: 4,
  epico: 5,
  legendario: Infinity,
};

export function puedeAprenderHabilidad(
  rareza: Rareza,
  nivelEscuela: number
): boolean {
  return nivelEscuela >= NIVEL_ESCUELA_POR_RAREZA[rareza];
}
