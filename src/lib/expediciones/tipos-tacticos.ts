/** Contratos puros compartidos por el motor, los adaptadores y las habilidades. */
export type ElementoTactico = "fisico" | "arcano" | "fuego" | "hielo" | "agua" | "rayo" | "sagrado" | "naturaleza" | "sombras";
export type FamiliaTactica = "marca" | "preparacion" | "guardia" | "herida" | "regeneracion" | "sello" | "vinculo" | "campo" | "acompanante" | "pacto" | "exposicion" | "precision" | "resistencia";
export type EstadoTactico = {
  id: string;
  fuenteId: string;
  creadorId: string;
  familia: FamiliaTactica;
  clave: string;
  valor: number;
  restantes: number;
  reloj: "turno" | "ciclo";
  cargas: number;
  elemento?: ElementoTactico;
  destinatarioId?: string;
  mantenimientoMana?: number;
  finalNatural?: boolean;
  manual?: boolean;
};

export type UnidadTactica = {
  id: string;
  equipo: "aliado" | "enemigo";
  claseId?: string;
  hp: number;
  hpMaximo: number;
  energia: number;
  energiaMaxima: number;
  mana: number;
  manaMaximo: number;
  ataque: number;
  ataqueMagico: number;
  defensa: number;
  defensaMagica: number;
  fila: number;
  columna: number;
  estados: EstadoTactico[];
  /** Exclusivamente límites por ciclo; nunca capacidades concedidas por clase. */
  limites: Record<string, number>;
};

export type EventoTactico = {
  tipo: "dano" | "cura" | "proteccion" | "estado" | "consumo" | "recurso" | "interrupcion" | "retirada";
  actorId: string;
  objetivoId: string;
  fuenteId: string;
  cantidad: number;
  detalle?: string;
};

export type MundoTactico = { version: 2; ciclo: number; unidades: UnidadTactica[]; eventos: EventoTactico[] };

export type TecnicaTactica = {
  id: string;
  claseId: string;
  nombre: string;
  costeEnergia: number;
  costeMana: number;
  cooldown: number;
  objetivo: "enemigo" | "aliado" | "propio";
  alcance: "individual" | "fila" | "todos";
  /** El presupuesto es total incluso si hay nueve destinatarios. */
  dano?: { multiplicador: number; tipo: "fisico" | "magico" | "hibrido" };
  cura?: number;
  comandos: readonly ComandoTactico[];
};

export type ComandoTactico =
  | { tipo: "estado"; objetivo: "actor" | "objetivo"; familia: FamiliaTactica; clave: string; valor: number; duracion: number; cargas?: number; reloj?: "turno" | "ciclo"; elemento?: ElementoTactico }
  | { tipo: "consumir"; objetivo: "actor" | "objetivo"; clave: string; maximo?: number }
  | { tipo: "adelantar"; familia: "herida" | "regeneracion"; objetivo: "actor" | "objetivo" }
  | { tipo: "limpiar"; objetivo: "actor" | "objetivo"; familia?: FamiliaTactica; maximo: number }
  | { tipo: "robar"; familia: "guardia" | "precision" | "resistencia"; fraccion: number }
  | { tipo: "transferir"; familia: "regeneracion" | "guardia"; fraccion: number }
  | { tipo: "invocar"; clave: string; potencia: number; duracion: number; mantenimiento: number; manual?: boolean }
  | { tipo: "ordenar"; modo: "asalto" | "amparo" }
  | { tipo: "sacrificar"; familia: "acompanante" | "guardia" | "herida" | "pacto" | "campo" | "preparacion"; fraccion: number; resultado?: "cura_actor" }
  | { tipo: "interrumpir"; debilitamiento: number }
  | { tipo: "mover"; fila: number }
  | { tipo: "reaccion"; elemento: ElementoTactico }
  | { tipo: "vincular"; clave: string; duracion: number }
  | { tipo: "pacto"; fraccionVida: number; duracion: number }
  | { tipo: "circuito"; maximo: number }
  | { tipo: "recurso"; recurso: "energia" | "mana"; cantidad: number; devolucion?: boolean };
