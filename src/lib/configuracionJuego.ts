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
    descripcion: "Mejora el ataque y la defensa.",
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
    ruta: "/base/escuela-combate",
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
export const ESTADISTICAS_BASE_CLASE = {
  Guerrero: { ataque: 2, defensa: 2, velocidad: 1, capacidadCarruaje: 1 },
  Explorador: { ataque: 1, defensa: 1, velocidad: 2, capacidadCarruaje: 1 },
  Comerciante: { ataque: 1, defensa: 1, velocidad: 1, capacidadCarruaje: 2 },
} as const;

export type ClasePersonaje = keyof typeof ESTADISTICAS_BASE_CLASE;

export const CONFIGURACION_ATRIBUTOS = {
  ataque: {
    costeBase: 20,
    edificio: "herreria",
    limitePorNivel: 10,
  },
  defensa: {
    costeBase: 20,
    edificio: "herreria",
    limitePorNivel: 10,
  },
  velocidad: {
    costeBase: 100,
    edificio: "mercado",
    limitePorNivel: 5,
  },
  capacidadCarruaje: {
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

  return configuracion.costeBase * valorActual * valorActual;
}

// ============================================================
// SPRITES
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

interface MejorasNivel {
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
}

// Bonificaciones de estadísticas al alcanzar `nivelAlcanzado`, según la clase del personaje.
export function calcularMejorasPorNivel(
  clase: string,
  nivelAlcanzado: number
): MejorasNivel {
  const cada = (divisor: number) => (nivelAlcanzado % divisor === 0 ? 1 : 0);

  if (clase === "Guerrero") {
    return {
      ataque: 1 + cada(3),
      defensa: 1 + cada(3),
      velocidad: cada(5),
      capacidadCarruaje: cada(5),
    };
  }
  if (clase === "Explorador") {
    return {
      ataque: 1,
      defensa: 1,
      velocidad: cada(3),
      capacidadCarruaje: cada(5),
    };
  }
  // Comerciante (y clase desconocida por defecto)
  return {
    ataque: 1,
    defensa: 1,
    velocidad: cada(5),
    capacidadCarruaje: cada(3),
  };
}
