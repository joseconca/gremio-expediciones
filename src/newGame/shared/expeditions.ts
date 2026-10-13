import type { PlayerProfileDto } from "./world";
import type { BattleActionDto, CombatTurn } from "./combat";

export type ExpeditionKind = "normal" | "elite" | "trade";
export type ExpeditionPhase = "outbound" | "battle" | "returning" | "completed";

export type ExpeditionInventoryItemDto = { id: string; name: string; quantity: number };
export type ExpeditionLootDto = ExpeditionInventoryItemDto & { chance: number };

export type MissionDto = {
  id: string;
  kind: ExpeditionKind;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  durationMs: number;
  gold: number;
  experience: number;
  targetPlayerId?: string;
  description?: string;
  enemyLevel?: number;
  enemy?: EnemyDto;
  loot?: ExpeditionLootDto[];
};

export type EnemyDto = {
  id?: string;
  level?: number;
  speed?: number;
  name: string;
  sprite: string;
  maxHealth: number;
  attack: number;
  defense: number;
};

export type ExpeditionParticipantDto = {
  playerId: string;
  order: number;
  name: string;
  level: number;
  currentHealth: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  isLeader: boolean;
};

export type ExpeditionDto = {
  id: string;
  mission: MissionDto;
  origin: { lat: number; lng: number };
  phase: ExpeditionPhase;
  departureAt: number;
  arrivalAt: number;
  returnDepartureAt: number | null;
  returnArrivalAt: number | null;
  enemy: EnemyDto | null;
  enemyHealth: number;
  playerHealth: number;
  playerMaxHealth: number;
  version: number;
  outcome: "victory" | "defeat" | "fled" | "trade" | null;
  log: string;
  rewardGranted: boolean;
  awardedLoot?: ExpeditionInventoryItemDto[];
  turn?: CombatTurn | string;
  enemyTurnAt?: number | null;
  lastAction?: BattleActionDto | null;
  playerSpeed?: number;
  participants?: ExpeditionParticipantDto[];
  actingMemberId?: string;
};

export type ExpeditionSnapshotDto = {
  serverNow: number;
  partySize: number;
  missions: MissionDto[];
  active: ExpeditionDto | null;
  eliteAvailableAt: number;
  profile: PlayerProfileDto;
  progressToken: string;
  rewardRevision: number;
  inventory?: ExpeditionInventoryItemDto[];
};

export type ExpeditionRequest =
  | { action: "status" }
  | { action: "start"; missionId: string; requestId: string }
  | { action: "attack" | "flee"; expeditionId: string; version: number };

export type ExpeditionResult =
  | { ok: true; snapshot: ExpeditionSnapshotDto }
  | { ok: false; code: string; message: string };

/** Geographic interpolation only; it never advances gameplay or grants rewards. */
export function expeditionPosition(
  active: ExpeditionDto,
  now: number
): { lat: number; lng: number; progress: number } {
  if (active.phase === "completed") return { ...active.origin, progress: 1 };
  if (active.phase === "battle") {
    return { lat: active.mission.lat, lng: active.mission.lng, progress: 1 };
  }
  const returning = active.phase === "returning";
  const from = returning ? active.mission : active.origin;
  const to = returning ? active.origin : active.mission;
  const departure = returning ? active.returnDepartureAt ?? active.arrivalAt : active.departureAt;
  const arrival = returning ? active.returnArrivalAt ?? departure : active.arrivalAt;
  const progress = Number.isNaN(now) ? 0 : arrival <= departure
    ? (now >= arrival ? 1 : 0)
    : Math.max(0, Math.min(1, (now - departure) / (arrival - departure)));
  const deltaLng = ((to.lng - from.lng + 540) % 360) - 180;
  const lng = ((from.lng + deltaLng * progress + 540) % 360) - 180;
  return { lat: from.lat + (to.lat - from.lat) * progress, lng, progress };
}