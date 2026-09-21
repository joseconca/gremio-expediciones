export type TipoMision = "normal" | "elite" | "comercio" | "boss";

export type ClasePersonaje = "Guerrero" | "Explorador" | "Comerciante";

export type TipoObjeto = "consumible" | "arma" | "armadura" | "accesorio";

/** RAREZA */
export type Rareza =
  | "basico"
  | "comun"
  | "poco_comun"
  | "raro"
  | "epico"
  | "legendario";

/** HABILIDADES */
export type TipoHabilidad = "activa" | "pasiva";

export type EfectoHabilidadActiva = "dano" | "curacion" | "bonus_defensa";

export type AnimacionHabilidad =
  | "ofensiva"
  | "ofensiva_potenciada"
  | "defensiva"
  | "curacion";

export type SlotHabilidad =
  | "activa_1"
  | "activa_2"
  | "activa_3"
  | "pasiva_1"
  | "pasiva_2";

export const SLOTS_HABILIDADES_ACTIVAS: SlotHabilidad[] = [
  "activa_1",
  "activa_2",
  "activa_3",
];

export const SLOTS_HABILIDADES_PASIVAS: SlotHabilidad[] = [
  "pasiva_1",
  "pasiva_2",
];

/** COMBATE */
export type TipoAccionCombate =
  | "atacar"
  | "usar_objeto"
  | "usar_habilidad"
  | "escapar";

export type FaseCombate = "activo" | "victoria" | "derrota" | "huida";

export type FaseExpedicion = "en_viaje" | "combatiendo" | "regresando";

export type ResultadoExpedicion = "exito" | "derrota" | "cancelada";

/** EXPEDICIONES */
export type TipoReporteExpedicion = "combate" | "comercio";

export interface ReporteExpedicionBase {
  exito: boolean;
  resultadoFinal: ResultadoExpedicion;
  hpPerdido: number;
  oroGanado: number;
  experienciaGanada: number;
  logCombate: string[];
}

export type ReporteCombate = ReporteExpedicionBase & {
  tipo: "combate";
} & (
    | {
        resultadoFinal: "cancelada";
      }
    | {
        resultadoFinal: "exito" | "derrota";
        enemigo: string;
        enemigoId: string;
        rondas: number;
        poderHeroe: number;
      }
  );

export interface ReporteComercio extends ReporteExpedicionBase {
  tipo: "comercio";
  afinidad: number;
}

export type ReporteExpedicion = ReporteCombate | ReporteComercio;

/** ENEMIGOS */
export interface DefinicionEnemigo {
  id: string;
  nombre: string;

  hp: number;
  ataque: number;
  defensa: number;
  velocidad: number;

  botin: number;
  difMin: number;

  rareza?: Rareza;

  objetoDropId?: string;
  habilidadDropId?: string;
}

/** OBJETOS */
export interface DefinicionObjeto {
  id: string;
  nombre: string;
  tipo: TipoObjeto;
  subtipo?: string;
  descripcion: string;
  rareza: Rareza;

  /** Precio de compra en el Mercado. */
  precio: number;

  /** Modificadores de equipo. */
  ataqueBase?: number;
  defensaBase?: number;
  velocidadBase?: number;
  hpMaximoBase?: number;
  probCriticoBase?: number;
  danoCriticoBase?: number;
  capacidadCarruajeBase?: number;

  /** Incremento por mejora de las estadísticas base. */
  ataquePorMejora?: number;
  defensaPorMejora?: number;
  velocidadPorMejora?: number;
  hpMaximoPorMejora?: number;
  probCriticoPorMejora?: number;
  danoCriticoPorMejora?: number;
  capacidadCarruajePorMejora?: number;

  /** Efecto de un consumible de curación. */
  curacion?: number;

  /** Cantidad máxima que puede llevar el personaje. */
  limiteCantidad?: number;
}

export interface ObjetoInventario {
  id: string;
  objetoId: string;
  cantidad: number;
  nivelMejora: number;
  objeto: DefinicionObjeto;
}

export interface EquipoPersonaje {
  arma: ObjetoInventario | null;
  armadura: ObjetoInventario | null;
  accesorio: ObjetoInventario | null;
}

/** MAPA */
export interface BaseMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  nivel: number;
}

export interface ReporteViaje {
  fechaLlegada: string;
  fechaSalida: string;
  clima: string;
  horasReales: string;
}

export interface Coordenadas {
  lat: number;
  lng: number;
}

/** HABILIDADES */
export interface DefinicionHabilidad {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoHabilidad;
  rareza: Rareza;
  precio: number;

  /** Efecto principal de una habilidad activa. */
  efecto?: EfectoHabilidadActiva;

  /** Animación utilizada al ejecutar una habilidad activa. */
  animacion?: AnimacionHabilidad;

  /** Tiempo de reutilización en turnos. */
  cooldownTurnos?: number;

  /** Daño fijo adicional. */
  danoBase?: number;

  /** Multiplicador aplicado al ataque. */
  multiplicadorDano?: number;

  /** Cantidad base de curación. */
  curacion?: number;

  /** Multiplicador adicional aplicado al efecto de un crítico. */
  multiplicadorCritico?: number;

  /** Bonificación temporal o pasiva de ataque. */
  bonusAtaque?: number;

  /** Bonificación temporal o pasiva de defensa. */
  bonusDefensa?: number;

  /** Bonificación de velocidad. */
  bonusVelocidad?: number;

  /** Incremento máximo de vida. */
  bonusHpMaximo?: number;

  /** Duración de un efecto temporal en turnos. */
  duracionTurnos?: number;

  /** Probabilidad adicional de que se produzca un crítico. */
  probabilidadCritico?: number;
}

/** MISIONES */
export interface DefinicionMision {
  id: string;
  tipo: TipoMision;

  nombre: string;
  descripcion: string;

  dificultad: number;
  recompensa: RecompensaMision;
  duracionObjetivoHoras: number;

  lat: number;
  lng: number;

  /** Solo para misiones de comercio. */
  objetivoId?: string;

  /** Para identificar un boss concreto. */
  enemigoId?: string;
}

/** RECOMPENSAS */
export interface RecompensaMision {
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
  objetos?: RecompensaObjeto[];
}

export interface RecompensaObjeto {
  objetoId: string;
  cantidad: number;
}

/** COMBATE */
export interface EstadoEfectoCombate {
  id: string;
  nombre: string;

  turnosRestantes: number;

  bonusAtaque?: number;
  bonusDefensa?: number;
  bonusVelocidad?: number;
}

export interface EstadoCombatiente {
  nombre: string;
  hpActual: number;
  hpMaximo: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  nivel: number;
}

export interface ResultadoAccionCombate {
  accion: TipoAccionCombate;

  exito: boolean;

  dano?: number;
  curacion?: number;

  texto: string;
}

export interface EstadoCombate {
  id: string;

  estado: FaseCombate;

  ronda: number;

  personaje: EstadoCombatiente;
  enemigo: EstadoCombatiente;

  efectosPersonaje: EstadoEfectoCombate[];
  efectosEnemigo: EstadoEfectoCombate[];

  log: string[];

  oroGanado: number;
  experienciaGanada: number;

  enemigoId?: string;
}

/** EDIFICIOS */
export interface Edificio {
  id: IdEdificio;
  nombre: string;
  descripcion: string;
  nivel: number;
  nivelMax: number;
}

export const CONFIGURACION_EDIFICIOS = {
  taberna: {
    nombre: "Taberna",
    costeConstruccion: 700,
    costeMadera: 4,
    costePiedra: 2,
    costeMetal: 0,
    nivelMax: 2,
    descripcion: "Descansa y recupera la salud.",
    color: "bg-amber-700",
    ruta: "/base/taberna",
  },

  armeria: {
    nombre: "Armería",
    costeConstruccion: 400,
    costeMadera: 3,
    costePiedra: 3,
    costeMetal: 0,
    nivelMax: 5,
    descripcion: "Compra armas y armaduras.",
    color: "bg-slate-600",
    ruta: "/base/armeria",
  },

  herreria: {
    nombre: "Herrería",
    costeConstruccion: 1250,
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
    costeConstruccion: 700,
    costeMadera: 5,
    costePiedra: 4,
    costeMetal: 0,
    nivelMax: 3,
    descripcion: "Mejora la velocidad y la capacidad de carga.",
    color: "bg-emerald-700",
    ruta: "/base/mercado",
  },

  embajada: {
    nombre: "Embajada",
    costeConstruccion: 400,
    costeMadera: 2,
    costePiedra: 3,
    costeMetal: 0,
    nivelMax: 2,
    descripcion: "Establece conexiones con otros campamentos.",
    color: "bg-blue-700",
    ruta: "/base/embajada",
  },

  escuelaCombate: {
    nombre: "Escuela de Combate",
    costeConstruccion: 1200,
    costeMadera: 5,
    costePiedra: 7,
    costeMetal: 0,
    nivelMax: 3,
    descripcion: "Aprende técnicas para el combate.",
    color: "bg-red-600",
    ruta: "/base/escuela-batalla",
  },
} as const;

export type IdEdificio = keyof typeof CONFIGURACION_EDIFICIOS;
