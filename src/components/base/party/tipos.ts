type PersonaVista = {
  id: string;
  nombre: string;
  personaje: { nombre: string; nivel: number; estado: string; clase?: string; sexo?: string; profesionActivaId?: string | null } | null;
};
type MiembroVista = {
  usuarioId: string;
  unidoEn: string;
  esLider: boolean;
  usuario: PersonaVista;
};
type TrasladoVista = {
  id: string;
  visitanteUsuarioId: string;
  anfitrionUsuarioId: string;
  estado: string;
  decision: string | null;
  fechaSalida: string;
  fechaLlegada: string;
  origenCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  haLlegadoEnServidor?: boolean;
  visitante?: PersonaVista;
  anfitrion?: PersonaVista;
};
type ExpedicionPartyVista = {
  id: string;
  tipo: string;
  nombre: string;
  dificultad: number;
  modoDificultad: string;
  fase: string;
  fechaSalida: string;
  fechaLlegada: string;
  origenCoords?: { lat: number; lng: number } | null;
  destinoCoords?: { lat: number; lng: number } | null;
  participantes: {
    id: string;
    usuarioId: string;
    estado: string;
    usuario?: PersonaVista;
  }[];
  combate?: {
    id: string;
    version: number;
    fase: string;
    ronda: number;
    faseTurno: string;
    turnoActualUsuarioId: string | null;
    enemigoId?: string | null;
    enemigoNombre: string;
    enemigos?: unknown;
    enemigoHp: number;
    enemigoHpMaximo: number;
    enemigoAtaque: number;
    enemigoDefensa: number;
    enemigoVelocidad: number;
    enemigoProbCritico: number;
    enemigoDanoCritico: number;
    enemigoNivel: number;
    efectosEnemigo?: unknown;
    log: unknown;
    ultimaAccion: unknown;
    recompensasResultado?: ResultadoRecompensasParty | null;
    participantes: {
      id: string;
      usuarioId: string;
      estado: string;
      ordenTurno: number;
      jugadorPosicion: string;
      jugadorHp: number;
      jugadorHpMaximo: number;
      jugadorAtaque: number;
      jugadorAtaqueMagico: number;
      jugadorDefensa: number;
      jugadorDefensaMagica: number;
      jugadorVelocidad: number;
      jugadorProbCritico: number;
      jugadorDanoCritico: number;
      jugadorPrecision: number;
      jugadorEvasion: number;
      jugadorNivel: number;
      profesionActivaId: string;
      armaSpriteId?: string | null;
      escudoSpriteId?: string | null;
      jugadorEnergiaActual: number;
      jugadorEnergiaMaxima: number;
      jugadorManaActual: number;
      jugadorManaMaximo: number;
      cooldowns?: unknown;
      efectos?: unknown;
      comidaActiva?: string | null;
      pasivas?: { habilidadId: string; slot: string | null }[];
      usuario?: PersonaVista;
    }[];
  } | null;
};

type PersonajeAccionesVista = {
  profesionActivaId: string;
  energiaActual: number;
  manaActual: number;
  habilidades: { habilidadId: string; nombre: string; descripcion: string; costeEnergia: number; costeMana: number; cooldownTurnos: number; nivel: number; slot: string | null }[];
  objetos: { inventarioObjetoId: string; objetoId: string; nombre: string; curacion: number; cantidad: number }[];
};
export type ResultadoRecompensasParty = {
  liquidacionYaResuelta: boolean;
  resultadoFinal?: "victoria" | "derrota";
  enemigosDerrotados?: { id: string; nombre: string }[];
  oroTotal?: number;
  /** Un resultado por aventurero: cada miembro tira su propio botín enemigo. */
  dropsEnemigo?: {
    usuarioId: string;
    objetoId: string;
    nombre: string;
    cantidad: number;
    sufijoId: string | null;
  }[];
  recompensas: {
    usuarioId: string;
    oro: number;
    madera: number;
    piedra: number;
    metal: number;
    experiencia: number;
    experienciaJob?: number;
    nivelesBaseSubidos?: number;
    nivelesJobSubidos?: number;
    objetos: { objetoId: string; cantidad: number }[];
  }[];
};
export type EstadoParty = {
  usuarioId: string;
  personajeAcciones?: PersonajeAccionesVista;
  party: {
    id: string;
    liderUsuarioId: string;
    lider: PersonaVista;
    miembros: MiembroVista[];
  } | null;
  expedicionActiva: ExpedicionPartyVista | null;
  ultimoResultadoExpedicion?: {
    expedicionPartyId: string;
    fase: "victoria" | "derrota" | "huida";
    tipo?: string;
    nombre?: string;
    dificultad?: number;
    modoDificultad?: string;
    duracionSegundos?: number;
    enemigosDerrotados?: string[];
    logCombate?: string[];
    recompensas: ResultadoRecompensasParty | null;
    participantes: { usuarioId: string; usuario?: PersonaVista }[];
  } | null;
  trasladosPropios: TrasladoVista[];
  visitasEntrantes: TrasladoVista[];
};
