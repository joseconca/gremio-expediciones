import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import type { CombatePve, Personaje } from "@/store/useGameStore";
import type { ReglaObjetivoHabilidad, RecompensaMision } from "@/lib/tiposJuego";

/** Contratos de datos y callbacks para el combate individual y de comitiva. */

export type AccionCombatePartyUI = "atacar" | "usar_habilidad" | "usar_objeto" | "escapar" | "cambiar_posicion";

export interface ParticipanteCombatePartyUI {
  id: string;
  usuarioId: string;
  nombre: string;
  clase: string;
  sexo: "chico" | "chica";
  esLider: boolean;
  ordenTurno: number;
  estado: string;
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
  efectos?: unknown;
  comidaActiva?: string | null;
  bonificacionesComida?: unknown;
  pasivas?: { habilidadId: string; slot: string | null; nivel?: number }[];
}

export type AccionAnimadaPartyUI = AccionAnimadaCombate;

export interface CombatePartyModalUI {
  usuarioId: string;
  nombreExpedicion: string;
  faseTurno: "jugador" | "enemigo";
  turnoActualUsuarioId: string | null;
  estadoJugador: string;
  participantes: ParticipanteCombatePartyUI[];
  ultimaAccion: AccionAnimadaPartyUI | null;
  onAccionParty: (accion: AccionCombatePartyUI, payload?: string) => Promise<AccionAnimadaCombate | null>;
}

export interface RecompensaInformeCombate {
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
  experiencia: number;
  experienciaJob: number;
  botin: string[];
}

export interface CombateModalProps {
  habilidadesIniciales?: HabilidadEquipable[];
  combate: CombatePve;
  personaje: Personaje;
  comidaActiva?: string | null;
  bonificacionesComida?: unknown;
  recompensa?: RecompensaMision | null;
  recompensaInforme?: RecompensaInformeCombate | null;
  procesando?: boolean;
  onAccionCombate?: (
    accion: "atacar" | "usar_habilidad" | "usar_objeto" | "escapar",
    payload?: string
  ) => Promise<AccionAnimadaCombate | null>;
  partyMode?: CombatePartyModalUI;
  onCerrar?: () => void;
}

export interface HabilidadCombate {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: "activa" | "pasiva";
  efecto?: string;
  objetivo?: ReglaObjetivoHabilidad;
  rareza: string;
  precio: number;
  costeEnergia?: number;
  costeMana?: number;
  tipoDano?: "fisico" | "magico";
  cooldownTurnos?: number;
  danoBase?: number;
  multiplicadorDano?: number;
  curacion?: number;
  bonusAtaque?: number;
  bonusDefensa?: number;
  bonusVelocidad?: number;
  bonusHpMaximo?: number;
  duracionTurnos?: number;
  probabilidad?: number;
}

export interface HabilidadEquipable {
  id: string;
  habilidadId: string;
  slot: string;
  habilidad: HabilidadCombate;
}
