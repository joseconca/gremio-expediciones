export type TipoMision = "normal" | "elite" | "comercio" | "boss" | "asedio";

/** Valores antiguos conservados durante la transición del sistema de clases. */
export type ClasePersonaje = "Novato" | "Guerrero" | "Explorador" | "Comerciante";

export type TipoArma =
  | "espada" | "hacha" | "lanza" | "daga" | "arco"
  | "baston" | "maza" | "libro" | "puños";
export type TipoArmadura = "ligera" | "media" | "pesada";

export interface AtributosPrincipales {
  fuerza: number;
  agilidad: number;
  vitalidad: number;
  inteligencia: number;
  destreza: number;
  suerte: number;
}

export type TipoObjeto = "consumible" | "arma" | "armadura" | "accesorio";
export type SlotObjeto =
  | "arma"
  | "mano_secundaria"
  | "casco"
  | "armadura"
  | "pantalones"
  | "botas"
  | "guantes"
  | "collar"
  | "anillo";

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

export type EfectoHabilidadActiva =
  | "dano"
  | "curacion"
  | "bonus_defensa"
  | "curacion_progresiva"
  | "bonus_ataque_magico";

export type TipoEfectoTemporalHabilidad =
  | "bonus_defensa"
  | "debuff_defensa"
  | "bonus_ataque"
  | "debuff_ataque"
  | "bonus_ataque_magico"
  | "debuff_precision"
  | "bonus_evasion"
  | "dano_progresivo"
  | "curacion_progresiva";

export interface EstadoSecundarioHabilidad {
  tipo: TipoEfectoTemporalHabilidad;
  /** Porcentajes como fracción: 0.12 equivale al 12 %. */
  valor: number;
  duracionTurnos: number;
  objetivo?: "jugador" | "enemigo";
}

export interface EstadoEfectoHabilidad extends EstadoSecundarioHabilidad {
  habilidadId: string;
  turnosRestantes: number;
}
export type TipoDanoHabilidad = "fisico" | "magico" | "hibrido";

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
  recompensa: RecompensaMision;
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
  ataqueMagico?: number;
  defensa: number;
  defensaMagica?: number;
  velocidad: number;

  botin: number;
  difMin: number;

  rareza?: Rareza;

  objetoDropId?: string;
  habilidadDropId?: string;
  esJefe?: boolean;
  probabilidadBotin?: number;
  tablaLoot?: Array<{ objetoId: string; peso: number }>;
}

/** OBJETOS */
export interface DefinicionObjeto {
  id: string;
  nombre: string;
  tipo: TipoObjeto;
  subtipo?: string;
  slot?: SlotObjeto;
  /** Las armas de dos manos bloquean la mano secundaria. */
  manos?: 1 | 2;
  categoriaArmadura?: TipoArmadura;
  descripcion: string;
  rareza: Rareza;

  /** Precio de compra en el Mercado. */
  precio: number;

  /** Modificadores de equipo. */
  ataqueBase?: number;
  ataqueMagicoBase?: number;
  defensaBase?: number;
  defensaMagicaBase?: number;
  velocidadBase?: number;
  hpMaximoBase?: number;
  probCriticoBase?: number;
  danoCriticoBase?: number;
  capacidadCarruajeBase?: number;
  precisionBase?: number;
  evasionBase?: number;
  energiaMaximaBase?: number;
  manaMaximoBase?: number;
  regeneracionVidaPorTurnoBase?: number;
  regeneracionEnergiaPorTurnoBase?: number;
  regeneracionManaPorTurnoBase?: number;

  /** Incremento por mejora de las estadísticas base. */
  ataquePorMejora?: number;
  ataqueMagicoPorMejora?: number;
  defensaPorMejora?: number;
  defensaMagicaPorMejora?: number;
  velocidadPorMejora?: number;
  hpMaximoPorMejora?: number;
  probCriticoPorMejora?: number;
  danoCriticoPorMejora?: number;
  capacidadCarruajePorMejora?: number;
  precisionPorMejora?: number;
  evasionPorMejora?: number;
  energiaMaximaPorMejora?: number;
  manaMaximoPorMejora?: number;
  regeneracionVidaPorTurnoPorMejora?: number;
  regeneracionEnergiaPorTurnoPorMejora?: number;
  regeneracionManaPorTurnoPorMejora?: number;

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
  sufijoId: string | null;
  bonificaciones: Record<string, number>;
  objeto: DefinicionObjeto;
}

export interface EquipoPersonaje {
  arma: ObjetoInventario | null;
  manoSecundaria: ObjetoInventario | null;
  casco: ObjetoInventario | null;
  armadura: ObjetoInventario | null;
  pantalones: ObjetoInventario | null;
  botas: ObjetoInventario | null;
  guantes: ObjetoInventario | null;
  /** La antigua relación accesorio representa ahora el collar. */
  accesorio: ObjetoInventario | null;
  anillo1: ObjetoInventario | null;
  anillo2: ObjetoInventario | null;
}

/** MAPA */
export interface BaseMapa {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  nivel: number;
  nivelPersonaje: number;
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
  /** Clase propietaria; las profesiones descendientes heredan esta habilidad. */
  claseId?: string;
  /** Tipo de ataque utilizado por habilidades que infligen daño. */
  tipoDano?: TipoDanoHabilidad;
  /** Nivel Job mínimo en la profesión activa para aprenderla. */
  nivelJobRequerido?: number;
  /** Puntos Job consumidos al aprender habilidades profesionales. */
  costePuntosHabilidad?: number;
  /** Recursos de combate; las técnicas físicas usan Energía y las mágicas Maná. */
  costeEnergia?: number;
  costeMana?: number;
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

  /** Cantidad fija de curación para las habilidades que la utilicen. */
  curacion?: number;
  /** Fracción de vida máxima que se restaura inmediatamente. */
  curacionPorcentaje?: number;
  /** Fracción de vida máxima restaurada en cada pulso progresivo. */
  curacionProgresivaPorcentaje?: number;
  /** Fracción del ataque efectivo que inflige cada pulso de daño progresivo. */
  danoProgresivoPorcentaje?: number;
  /** Proporción del daño efectivo convertida en curación. */
  roboVida?: number;
  /** Bonificación defensiva temporal expresada como fracción de defensa actual. */
  bonusDefensaPorcentaje?: number;
  /** Estados secundarios que se aplican al resolver la habilidad. */
  estadosSecundarios?: EstadoSecundarioHabilidad[];
  /** Elimina los perjuicios activos del personaje. */
  limpiarEstadosNegativos?: boolean;
  /** Fracción adicional de curación para habilidades curativas. */
  bonusCuracion?: number;
  /** Energía recuperada al ejecutar una habilidad. */
  recuperarEnergia?: number;

  /** Multiplicador adicional aplicado al efecto de un crítico. */
  multiplicadorCritico?: number;

  /** Bonificación temporal o pasiva de ataque físico. */
  bonusAtaque?: number;
  /** Bonificación de ataque mágico. */
  bonusAtaqueMagico?: number;

  /** Bonificación temporal o pasiva de defensa física. */
  bonusDefensa?: number;
  /** Bonificación de defensa mágica. */
  bonusDefensaMagica?: number;
  /** Bonificación de precisión. */
  bonusPrecision?: number;
  /** Bonificación de evasión (fracción entre 0 y 1). */
  bonusEvasion?: number;
  /** Bonificación a los recursos máximos. */
  bonusEnergiaMaxima?: number;
  bonusManaMaximo?: number;
  /** Bonificaciones de regeneración por turno. */
  bonusRegeneracionVida?: number;
  bonusRegeneracionEnergia?: number;
  bonusRegeneracionMana?: number;

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
    nivelMax: 1,
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
    descripcion: "Intercambia recursos y bienes. A más nivel de mercado, mejores descuentos.",
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
    descripcion: "Establece conexiones con otros campamentos. Intercambia, asedia y mira los mejores campamentos.",
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

  muralla: {
    nombre: "Murallas",
    costeConstruccion: 2000,
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
    costeConstruccion: 1500,
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
