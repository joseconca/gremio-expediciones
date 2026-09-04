export const CONFIGURACION_EDIFICIOS = {
  taberna: {
    nombre: "Taberna",
    costeConstruccion: 0,
    costeNivel2: 1200,
    nivelMax: 1,
    descripcion: "Descansa y recupera la salud del aventurero.",
    color: "bg-amber-700",
    ruta: "/base/taberna",
  },
  herreria: {
    nombre: "Herrería",
    costeConstruccion: 300,
    costeNivel2: 1200,
    nivelMax: 3,
    descripcion: "Mejora ataque y defensa del aventurero.",
    color: "bg-slate-600",
    ruta: "/base/herreria",
  },
  mercado: {
    nombre: "Mercado",
    costeConstruccion: 350,
    costeNivel2: 1400,
    nivelMax: 3,
    descripcion: "Mejora velocidad y capacidad del carruaje.",
    color: "bg-emerald-700",
    ruta: "/base/mercado",
  },
  embajada: {
    nombre: "Embajada",
    costeConstruccion: 250,
    costeNivel2: 1100,
    nivelMax: 2,
    descripcion: "Conecta tu campamento con otros gremios y desbloquea el chat global.",
    color: "bg-blue-700",
    ruta: "/base",
  },
} as const;

export type IdEdificio = keyof typeof CONFIGURACION_EDIFICIOS;

export const ESTADISTICAS_BASE_CLASE = {
  Guerrero: { ataque: 2, defensa: 2, velocidad: 1, capacidadCarruaje: 1 },
  Explorador: { ataque: 1, defensa: 1, velocidad: 2, capacidadCarruaje: 1 },
  Comerciante: { ataque: 1, defensa: 1, velocidad: 1, capacidadCarruaje: 2 },
} as const;

export type ClasePersonaje = keyof typeof ESTADISTICAS_BASE_CLASE;

const SPRITE_POR_CLASE: Record<string, string> = {
  Guerrero: "warrior",
  Explorador: "explorer",
  Comerciante: "merchant",
};

// Devuelve la ruta del sprite del héroe según su clase y sexo, p.ej. "/sprites/heroes/warrior-f.png".
export function obtenerSpriteHeroe(clase?: string | null, sexo?: string | null): string {
  const base = SPRITE_POR_CLASE[clase ?? ""] ?? "warrior";
  const sufijoSexo = sexo === "chica" ? "f" : "m";
  return `/sprites/heroes/${base}-${sufijoSexo}.png`;
}

// Experiencia necesaria para subir del nivel indicado al siguiente.
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
export function calcularMejorasPorNivel(clase: string, nivelAlcanzado: number): MejorasNivel {
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
