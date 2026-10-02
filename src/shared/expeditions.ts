import type { PlayerProfileDto } from "./world";

export type ExpeditionKind = "normal" | "elite" | "trade";
export type ExpeditionPhase = "outbound" | "battle" | "returning" | "completed";

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
};

export type EnemyDto = {
  name: string;
  sprite: string;
  maxHealth: number;
  attack: number;
  defense: number;
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
};

export type ExpeditionSnapshotDto = {
  serverNow: number;
  missions: MissionDto[];
  active: ExpeditionDto | null;
  eliteAvailableAt: number;
  profile: PlayerProfileDto;
  progressToken: string;
  rewardRevision: number;
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