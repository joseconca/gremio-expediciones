export const CONFIGURACION_EDIFICIOS = {
  taberna: {
    nombre: "Taberna",
    costeConstruccion: 0,
    costeNivel2: 1200,
    nivelMax: 2,
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
    nivelMax: 2,
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
