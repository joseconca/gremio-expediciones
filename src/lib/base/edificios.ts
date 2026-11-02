/** Catálogo único de edificios y sus costes base. */
export const CONFIGURACION_EDIFICIOS = {
  taberna: {
    nombre: "Taberna",
    costeConstruccion: 630,
    costeMadera: 4,
    costePiedra: 2,
    costeMetal: 0,
    nivelMax: 3,
    descripcion: "Prepara comidas para potenciar tus próximas expediciones.",
    color: "bg-amber-700",
    ruta: "/base/taberna",
  },

  armeria: {
    nombre: "Armería",
    costeConstruccion: 360,
    costeMadera: 3,
    costePiedra: 3,
    costeMetal: 0,
    nivelMax: 1,
    descripcion: "Compra armas y armaduras.",
    color: "bg-slate-600",
    ruta: "/base/armeria",
  },

  herreria: {
    nombre: "Herrería",
    costeConstruccion: 1170,
    costeMadera: 5,
    costePiedra: 5,
    costeMetal: 10,
    nivelMax: 3,
    descripcion: "Mejora las armas y armaduras.",
    color: "bg-slate-700",
    ruta: "/base/herreria",
  },

  mercado: {
    nombre: "Mercado",
    costeConstruccion: 630,
    costeMadera: 5,
    costePiedra: 4,
    costeMetal: 0,
    nivelMax: 3,
    descripcion: "Compra recursos con descuentos según el nivel del mercado y vende excedentes por el 25 % de su precio base, sin aplicar esos descuentos.",
    color: "bg-emerald-700",
    ruta: "/base/mercado",
  },

  botica: {
    nombre: "Botica",
    costeConstruccion: 900,
    costeMadera: 6,
    costePiedra: 5,
    costeMetal: 1,
    nivelMax: 3,
    descripcion: "Prepara remedios, pociones y elixires para mantener a tus aventureros en pie.",
    color: "bg-violet-700",
    ruta: "/base/botica",
  },

  embajada: {
    nombre: "Embajada",
    costeConstruccion: 360,
    costeMadera: 2,
    costePiedra: 3,
    costeMetal: 0,
    nivelMax: 2,
    descripcion: "Establece conexiones con otros campamentos. Intercambia, asedia y mira los mejores campamentos.",
    color: "bg-blue-700",
    ruta: "/base/embajada",
  },

  escuelaCombate: {
    nombre: "Escuela de Combate",
    costeConstruccion: 1080,
    costeMadera: 5,
    costePiedra: 7,
    costeMetal: 0,
    nivelMax: 3,
    descripcion: "Aprende técnicas para el combate.",
    color: "bg-red-600",
    ruta: "/base/escuela-batalla",
  },

  muralla: {
    nombre: "Murallas",
    costeConstruccion: 1800,
    costeMadera: 15,
    costePiedra: 0,
    costeMetal: 0,
    nivelMax: 3,
    descripcion: "Ayuda a proteger el campamento de ataques invasores.",
    color: "bg-gray-700",
    ruta: "/base/muralla",
  },

  almacen: {
    nombre: "Almacén",
    costeConstruccion: 1350,
    costeMadera: 5,
    costePiedra: 5,
    costeMetal: 1,
    nivelMax: 5,
    descripcion: "Almacena y protege los recursos",
    color: "bg-yellow-700",
    ruta: "/base/almacen",
  }
} as const;

export type IdEdificio = keyof typeof CONFIGURACION_EDIFICIOS;

/** Requisitos y costes de construcción: valores originales sin modificar. */
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

