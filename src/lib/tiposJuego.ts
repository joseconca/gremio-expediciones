export type TipoMision = "normal" | "elite" | "comercio" | "boss";

export type TipoObjeto =
  | "consumible"
  | "arma"
  | "armadura"
  | "accesorio"
  | "material";

export type Rareza = "comun" | "poco_comun" | "raro" | "epico" | "legendario";

export type TipoHabilidad = "activa" | "pasiva";

export type TipoAccionCombate =
  | "atacar"
  | "usar_objeto"
  | "usar_habilidad"
  | "escapar";

export type FaseCombate = "activo" | "victoria" | "derrota" | "huida";

export type FaseExpedicion = "en_viaje" | "combatiendo" | "regresando";

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

export interface DefinicionObjeto {
  id: string;
  nombre: string;
  tipo: TipoObjeto;
  descripcion: string;
  rareza: Rareza;

  /** Precio de compra en el Mercado. */
  precio: number;

  /** Modificadores de equipo. */
  ataque?: number;
  defensa?: number;
  velocidad?: number;
  hpMaximo?: number;

  /** Efecto de un consumible de curación. */
  curacion?: number;

  /** Cantidad máxima que puede llevar el personaje. */
  limiteCantidad?: number;
}

export interface DefinicionHabilidad {
  id: string;
  nombre: string;
  descripcion: string;

  tipo: TipoHabilidad;
  rareza: Rareza;

  precio: number;

  cooldownTurnos?: number;

  /** Daño fijo adicional. */
  danoBase?: number;

  /** Multiplicador del ataque.*/
  multiplicadorDano?: number;

  curacion?: number;

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

  probabilidad?: number;
}

export interface DefinicionMision {
  id: string;
  tipo: TipoMision;

  nombre: string;
  descripcion: string;

  dificultad: number;
  recompensa: number;
  duracionObjetivoHoras: number;

  lat?: number;
  lng?: number;

  /** Solo para misiones de comercio. */
  objetivoId?: string;

  /** Para identificar un boss concreto. */
  enemigoId?: string;
}

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
